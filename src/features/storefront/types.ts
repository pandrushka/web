export type StorefrontStore = {
  name: string
  slug: string
  logo_initial: string
  description: string | null
  city: string
  phone_number?: string | null
  address?: string | null
  directions?: string | null
}

export type StorefrontCategory = {
  id: number
  name: string
  position: number
  active?: boolean
}

export type StorefrontProduct = {
  id: number
  name: string
  description: string | null
  price: string
  unit: string
  category: { id: number; name: string; active?: boolean } | null
  image?: { present: boolean; thumbnail_path: string | null }
  active?: boolean
  available?: boolean
  category_id?: number | null
}

export type StorefrontCatalog = {
  categories: StorefrontCategory[]
  products: StorefrontProduct[]
  loading: boolean
  error: string | null
}
