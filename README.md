# Node.js CRUD API — Product Catalog

A RESTful CRUD API for a Product Catalog built with **Fastify** and **TypeScript**, using an in-memory database. Supports horizontal scaling via Node.js Cluster API with a built-in round-robin load balancer.

## Requirements

- Node.js `>=24.10.0`
- npm `>=10.9.2`

## Installation

```bash
npm install
```

Copy the example environment file and adjust if needed:

```bash
cp .env.example .env
```

The default port is `4000`.

## Running the Application

### Development mode

Uses `tsx` with file watching (hot reload):

```bash
npm run start:dev
```

### Production mode

Compiles TypeScript with `tsup` and runs the bundled output:

```bash
npm run start:prod
```

### Multi-process mode (horizontal scaling)

Starts a load balancer on `PORT` and `N-1` worker processes (where N = available CPU parallelism), each listening on `PORT+n`. State is kept consistent across workers via IPC:

```bash
npm run start:multi
```

Example with `PORT=4000` on a 4-core machine:
- Load balancer: `http://localhost:4000`
- Worker 1: `http://localhost:4001`
- Worker 2: `http://localhost:4002`
- Worker 3: `http://localhost:4003`

Requests are distributed in round-robin order.

## Running Tests

```bash
npm test
```

## API Reference

Base URL: `http://localhost:4000`

### Product schema

```json
{
  "id": "uuid (generated server-side)",
  "name": "string (required)",
  "description": "string (required)",
  "price": "number > 0 (required)",
  "category": "string (required)",
  "inStock": "boolean (required)"
}
```

---

### `GET /api/products`

Returns all products.

**Response:** `200 OK`

```json
[
  {
    "id": "d290f1ee-6c54-4b01-90e6-d701748f0851",
    "name": "Laptop Pro",
    "description": "High-end laptop",
    "price": 1299.99,
    "category": "electronics",
    "inStock": true
  }
]
```

---

### `GET /api/products/:productId`

Returns a single product by ID.

| Status | Condition |
|--------|-----------|
| `200`  | Product found |
| `400`  | `productId` is not a valid UUID |
| `404`  | Product not found |

---

### `POST /api/products`

Creates a new product.

**Request body:**

```json
{
  "name": "Laptop Pro",
  "description": "High-end laptop",
  "price": 1299.99,
  "category": "electronics",
  "inStock": true
}
```

| Status | Condition |
|--------|-----------|
| `201`  | Product created — returns the new record |
| `400`  | Missing required fields or invalid `price` (must be > 0) |

---

### `PUT /api/products/:productId`

Replaces an existing product (full update).

**Request body:** same as `POST`.

| Status | Condition |
|--------|-----------|
| `200`  | Product updated — returns the updated record |
| `400`  | Invalid UUID or invalid body |
| `404`  | Product not found |

---

### `DELETE /api/products/:productId`

Deletes a product.

| Status | Condition |
|--------|-----------|
| `204`  | Product deleted |
| `400`  | `productId` is not a valid UUID |
| `404`  | Product not found |

---

### Non-existing endpoints

Any request to an unknown route returns:

```json
{ "message": "Route GET /some-non/existing/resource not found" }
```

**Status:** `404`

---

### Server errors

Unhandled errors return:

```json
{ "message": "Internal server error" }
```

**Status:** `500`

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT`   | `4000`  | Port the server (or load balancer) listens on |
