import { describe, it, expect, beforeEach } from 'vitest'
import { buildApp } from '../src/app.js'
import { db } from '../src/db.js'

const validProduct = {
  name: 'Test Laptop',
  description: 'A powerful laptop for testing',
  price: 999.99,
  category: 'electronics',
  inStock: true,
}

beforeEach(() => {
  db.reset()
})

describe('GET /api/products', () => {
  it('returns empty array when no products exist', async () => {
    const app = buildApp()
    const res = await app.inject({ method: 'GET', url: '/api/products' })

    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual([])
  })

  it('returns all products', async () => {
    db.create(validProduct)
    db.create({ ...validProduct, name: 'Test Phone', category: 'electronics' })

    const app = buildApp()
    const res = await app.inject({ method: 'GET', url: '/api/products' })

    expect(res.statusCode).toBe(200)
    expect(res.json()).toHaveLength(2)
  })
})

describe('POST /api/products', () => {
  it('creates a product and returns 201 with the new record', async () => {
    const app = buildApp()
    const res = await app.inject({
      method: 'POST',
      url: '/api/products',
      payload: validProduct,
    })

    expect(res.statusCode).toBe(201)
    const body = res.json()
    expect(body).toMatchObject(validProduct)
    expect(typeof body.id).toBe('string')
  })

  it('returns 400 when required fields are missing', async () => {
    const app = buildApp()
    const res = await app.inject({
      method: 'POST',
      url: '/api/products',
      payload: { name: 'Incomplete' },
    })

    expect(res.statusCode).toBe(400)
  })

  it('returns 400 when price is not a positive number', async () => {
    const app = buildApp()
    const res = await app.inject({
      method: 'POST',
      url: '/api/products',
      payload: { ...validProduct, price: -10 },
    })

    expect(res.statusCode).toBe(400)
  })

  it('returns 400 when price is zero', async () => {
    const app = buildApp()
    const res = await app.inject({
      method: 'POST',
      url: '/api/products',
      payload: { ...validProduct, price: 0 },
    })

    expect(res.statusCode).toBe(400)
  })
})

describe('GET /api/products/:productId', () => {
  it('returns the product by id', async () => {
    const created = db.create(validProduct)

    const app = buildApp()
    const res = await app.inject({
      method: 'GET',
      url: `/api/products/${created.id}`,
    })

    expect(res.statusCode).toBe(200)
    expect(res.json()).toMatchObject(validProduct)
    expect(res.json().id).toBe(created.id)
  })

  it('returns 400 for invalid UUID', async () => {
    const app = buildApp()
    const res = await app.inject({
      method: 'GET',
      url: '/api/products/not-a-uuid',
    })

    expect(res.statusCode).toBe(400)
  })

  it('returns 404 for non-existing product', async () => {
    const app = buildApp()
    const res = await app.inject({
      method: 'GET',
      url: '/api/products/00000000-0000-0000-0000-000000000000',
    })

    expect(res.statusCode).toBe(404)
  })
})

describe('PUT /api/products/:productId', () => {
  it('updates the product and returns updated record', async () => {
    const created = db.create(validProduct)
    const updated = { ...validProduct, name: 'Updated Laptop', price: 1299.99 }

    const app = buildApp()
    const res = await app.inject({
      method: 'PUT',
      url: `/api/products/${created.id}`,
      payload: updated,
    })

    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.id).toBe(created.id)
    expect(body.name).toBe('Updated Laptop')
    expect(body.price).toBe(1299.99)
  })

  it('returns 400 for invalid UUID', async () => {
    const app = buildApp()
    const res = await app.inject({
      method: 'PUT',
      url: '/api/products/not-a-uuid',
      payload: validProduct,
    })

    expect(res.statusCode).toBe(400)
  })

  it('returns 404 for non-existing product', async () => {
    const app = buildApp()
    const res = await app.inject({
      method: 'PUT',
      url: '/api/products/00000000-0000-0000-0000-000000000000',
      payload: validProduct,
    })

    expect(res.statusCode).toBe(404)
  })
})

describe('DELETE /api/products/:productId', () => {
  it('deletes the product and returns 204', async () => {
    const created = db.create(validProduct)

    const app = buildApp()
    const res = await app.inject({
      method: 'DELETE',
      url: `/api/products/${created.id}`,
    })

    expect(res.statusCode).toBe(204)
  })

  it('returns 400 for invalid UUID', async () => {
    const app = buildApp()
    const res = await app.inject({
      method: 'DELETE',
      url: '/api/products/not-a-uuid',
    })

    expect(res.statusCode).toBe(400)
  })

  it('returns 404 for non-existing product', async () => {
    const app = buildApp()
    const res = await app.inject({
      method: 'DELETE',
      url: '/api/products/00000000-0000-0000-0000-000000000000',
    })

    expect(res.statusCode).toBe(404)
  })
})

describe('Non-existing endpoints', () => {
  it('returns 404 for unknown route', async () => {
    const app = buildApp()
    const res = await app.inject({
      method: 'GET',
      url: '/some-non/existing/resource',
    })

    expect(res.statusCode).toBe(404)
    expect(res.json()).toHaveProperty('message')
  })
})

describe('Full CRUD flow', () => {
  it('complete lifecycle: create → get → update → delete → get 404', async () => {
    const app = buildApp()

    // 1. GET all - empty
    const getAllRes = await app.inject({ method: 'GET', url: '/api/products' })
    expect(getAllRes.statusCode).toBe(200)
    expect(getAllRes.json()).toHaveLength(0)

    // 2. POST - create
    const createRes = await app.inject({
      method: 'POST',
      url: '/api/products',
      payload: validProduct,
    })
    expect(createRes.statusCode).toBe(201)
    const { id } = createRes.json() as { id: string }

    // 3. GET by id
    const getRes = await app.inject({
      method: 'GET',
      url: `/api/products/${id}`,
    })
    expect(getRes.statusCode).toBe(200)
    expect(getRes.json().id).toBe(id)

    // 4. PUT - update
    const putRes = await app.inject({
      method: 'PUT',
      url: `/api/products/${id}`,
      payload: { ...validProduct, price: 1499.99 },
    })
    expect(putRes.statusCode).toBe(200)
    expect(putRes.json().price).toBe(1499.99)
    expect(putRes.json().id).toBe(id)

    // 5. DELETE
    const deleteRes = await app.inject({
      method: 'DELETE',
      url: `/api/products/${id}`,
    })
    expect(deleteRes.statusCode).toBe(204)

    // 6. GET by id after delete → 404
    const getAfterDeleteRes = await app.inject({
      method: 'GET',
      url: `/api/products/${id}`,
    })
    expect(getAfterDeleteRes.statusCode).toBe(404)
  })
})
