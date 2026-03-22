import { randomUUID } from 'crypto'
import type { Product, ProductInput } from './types.js'

let products: Product[] = []

export const db = {
  getAll(): Product[] {
    return [...products]
  },

  getById(id: string): Product | undefined {
    return products.find((p) => p.id === id)
  },

  create(input: ProductInput): Product {
    const product: Product = { id: randomUUID(), ...input }
    products.push(product)
    return { ...product }
  },

  update(id: string, input: ProductInput): Product | undefined {
    const index = products.findIndex((p) => p.id === id)
    if (index === -1) return undefined
    products[index] = { id, ...input }
    return { ...products[index] }
  },

  delete(id: string): boolean {
    const index = products.findIndex((p) => p.id === id)
    if (index === -1) return false
    products.splice(index, 1)
    return true
  },

  getState(): Product[] {
    return [...products]
  },

  setState(newState: Product[]): void {
    products = [...newState]
  },

  reset(): void {
    products = []
  },
}
