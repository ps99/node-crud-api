import 'dotenv/config'
import { buildApp } from './app.js'

const PORT = parseInt(process.env.PORT ?? '4000', 10)

const app = buildApp()

try {
  await app.listen({ port: PORT, host: '0.0.0.0' })
  console.log(`Server is running on http://localhost:${PORT}`)
} catch (err) {
  console.error(err)
  process.exit(1)
}
