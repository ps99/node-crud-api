import Fastify from 'fastify'
import { db } from './db.js'
import type { ProductInput } from './types.js'

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function isUUID(value: string): boolean {
  return UUID_RE.test(value)
}

function isValidProductInput(body: unknown): body is ProductInput {
  if (typeof body !== 'object' || body === null) return false
  const b = body as Record<string, unknown>
  return (
    typeof b.name === 'string' &&
    b.name.trim().length > 0 &&
    typeof b.description === 'string' &&
    typeof b.price === 'number' &&
    b.price > 0 &&
    typeof b.category === 'string' &&
    b.category.trim().length > 0 &&
    typeof b.inStock === 'boolean'
  )
}

export function buildApp() {
  const app = Fastify({ logger: false })

  app.get('/api/products', async () => {
    return db.getAll()
  })

  app.get<{ Params: { productId: string } }>(
    '/api/products/:productId',
    async (request, reply) => {
      const { productId } = request.params

      if (!isUUID(productId)) {
        return reply
          .status(400)
          .send({ message: 'Invalid productId: must be a valid UUID' })
      }

      const product = db.getById(productId)
      if (!product) {
        return reply
          .status(404)
          .send({ message: `Product with id "${productId}" not found` })
      }

      return product
    },
  )

  app.post('/api/products', async (request, reply) => {
    if (!isValidProductInput(request.body)) {
      return reply.status(400).send({
        message:
          'Request body must contain: name (string), description (string), price (positive number), category (string), inStock (boolean)',
      })
    }

    const product = db.create(request.body)
    return reply.status(201).send(product)
  })

  app.put<{ Params: { productId: string } }>(
    '/api/products/:productId',
    async (request, reply) => {
      const { productId } = request.params

      if (!isUUID(productId)) {
        return reply
          .status(400)
          .send({ message: 'Invalid productId: must be a valid UUID' })
      }

      if (!isValidProductInput(request.body)) {
        return reply.status(400).send({
          message:
            'Request body must contain: name (string), description (string), price (positive number), category (string), inStock (boolean)',
        })
      }

      const product = db.update(productId, request.body)
      if (!product) {
        return reply
          .status(404)
          .send({ message: `Product with id "${productId}" not found` })
      }

      return product
    },
  )

  app.delete<{ Params: { productId: string } }>(
    '/api/products/:productId',
    async (request, reply) => {
      const { productId } = request.params

      if (!isUUID(productId)) {
        return reply
          .status(400)
          .send({ message: 'Invalid productId: must be a valid UUID' })
      }

      const deleted = db.delete(productId)
      if (!deleted) {
        return reply
          .status(404)
          .send({ message: `Product with id "${productId}" not found` })
      }

      return reply.status(204).send()
    },
  )

  app.setNotFoundHandler((request, reply) => {
    reply.status(404).send({
      message: `Route ${request.method} ${request.url} not found`,
    })
  })

  app.setErrorHandler((error, _request, reply) => {
    app.log.error(error)
    reply.status(500).send({ message: 'Internal server error' })
  })

  return app
}
