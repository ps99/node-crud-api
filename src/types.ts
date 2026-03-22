export interface Product {
  id: string
  name: string
  description: string
  price: number
  category: string
  inStock: boolean
}

export type ProductInput = Omit<Product, 'id'>
