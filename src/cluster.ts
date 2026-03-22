import cluster from 'cluster'
import { availableParallelism } from 'os'
import http from 'http'
import type { IncomingMessage, ServerResponse } from 'http'
import 'dotenv/config'

const PORT = parseInt(process.env.PORT ?? '4000', 10)
const numWorkers = Math.max(availableParallelism() - 1, 1)

interface DbSyncMessage {
  type: 'db:sync'
  data: unknown[]
}

interface DbUpdateMessage {
  type: 'db:update'
  data: unknown[]
}

if (cluster.isPrimary) {
  console.log(`Primary ${process.pid} started`)
  console.log(`Spawning ${numWorkers} worker(s)...`)

  const workers: ReturnType<typeof cluster.fork>[] = []

  for (let i = 1; i <= numWorkers; i++) {
    const worker = cluster.fork({ WORKER_PORT: String(PORT + i) })
    workers.push(worker)

    worker.on('message', (msg: DbSyncMessage) => {
      if (msg.type === 'db:sync') {
        for (const w of workers) {
          if (w.id !== worker.id && w.isConnected()) {
            w.send({ type: 'db:update', data: msg.data } satisfies DbUpdateMessage)
          }
        }
      }
    })
  }

  cluster.on('exit', (deadWorker, code, signal) => {
    console.log(
      `Worker ${deadWorker.process.pid} died (${signal ?? code}), restarting...`,
    )
    const idx = workers.findIndex((w) => w.id === deadWorker.id)
    if (idx !== -1) {
      const workerPort = PORT + 1 + idx
      const newWorker = cluster.fork({ WORKER_PORT: String(workerPort) })
      workers[idx] = newWorker
      newWorker.on('message', (msg: DbSyncMessage) => {
        if (msg.type === 'db:sync') {
          for (const w of workers) {
            if (w.id !== newWorker.id && w.isConnected()) {
              w.send({ type: 'db:update', data: msg.data } satisfies DbUpdateMessage)
            }
          }
        }
      })
    }
  })

  // Round-robin load balancer
  let roundRobinIndex = 0

  const loadBalancer = http.createServer(
    (req: IncomingMessage, res: ServerResponse) => {
      const workerPort = PORT + 1 + (roundRobinIndex % numWorkers)
      roundRobinIndex = (roundRobinIndex + 1) % Number.MAX_SAFE_INTEGER

      const options: http.RequestOptions = {
        hostname: '127.0.0.1',
        port: workerPort,
        path: req.url,
        method: req.method,
        headers: req.headers,
      }

      const proxy = http.request(options, (proxyRes) => {
        res.writeHead(proxyRes.statusCode!, proxyRes.headers)
        proxyRes.pipe(res)
      })

      proxy.on('error', () => {
        if (!res.headersSent) {
          res.writeHead(502)
          res.end(JSON.stringify({ message: 'Bad Gateway' }))
        }
      })

      req.pipe(proxy)
    },
  )

  loadBalancer.listen(PORT, () => {
    console.log(`Load balancer on http://localhost:${PORT}`)
    for (let i = 1; i <= numWorkers; i++) {
      console.log(`  Worker ${i} → http://localhost:${PORT + i}`)
    }
  })
} else {
  // Worker process
  const { buildApp } = await import('./app.js')
  const { db } = await import('./db.js')

  const WORKER_PORT = parseInt(process.env.WORKER_PORT ?? '4001', 10)

  // Sync incoming state updates from primary
  process.on('message', (msg: DbUpdateMessage) => {
    if (msg.type === 'db:update') {
      db.setState(msg.data as Parameters<typeof db.setState>[0])
    }
  })

  // Wrap write operations to broadcast state changes to other workers
  const origCreate = db.create.bind(db)
  db.create = (input) => {
    const result = origCreate(input)
    process.send?.({ type: 'db:sync', data: db.getState() } satisfies DbSyncMessage)
    return result
  }

  const origUpdate = db.update.bind(db)
  db.update = (id, input) => {
    const result = origUpdate(id, input)
    if (result !== undefined) {
      process.send?.({ type: 'db:sync', data: db.getState() } satisfies DbSyncMessage)
    }
    return result
  }

  const origDelete = db.delete.bind(db)
  db.delete = (id) => {
    const result = origDelete(id)
    if (result) {
      process.send?.({ type: 'db:sync', data: db.getState() } satisfies DbSyncMessage)
    }
    return result
  }

  const app = buildApp()

  try {
    await app.listen({ port: WORKER_PORT, host: '127.0.0.1' })
    console.log(`Worker ${process.pid} on port ${WORKER_PORT}`)
  } catch (err) {
    console.error(err)
    process.exit(1)
  }
}
