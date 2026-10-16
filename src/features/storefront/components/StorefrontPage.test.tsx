import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { StoreProfile } from '../../../api/stores'
import { StorefrontPage } from './StorefrontPage'

const store: StoreProfile = {
  id: 14,
  name: 'Pulpería Estrada',
  slug: 'pulperia-estrada',
  description: 'A neighborhood shop in León.',
  logo_initial: 'P',
  phone_number: '+50588881234',
  city: 'León',
  address: 'Calle Central',
  directions: 'Across from the park',
  status: 'draft',
}

const catalog = { categories: [], products: [], loading: false, error: null }

describe('StorefrontPage', () => {
  it('renders public profile fields and an empty catalog state without admin navigation', () => {
    render(<StorefrontPage store={store} catalog={catalog} />)
    expect(screen.getByRole('heading', { name: 'Pulpería Estrada' })).toBeInTheDocument()
    expect(screen.getByText('León')).toBeInTheDocument()
    expect(screen.getByText('A neighborhood shop in León.')).toBeInTheDocument()
    expect(screen.getByText('+50588881234')).toBeInTheDocument()
    expect(screen.getByText('Calle Central · Across from the park')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Product catalog' })).toBeInTheDocument()
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument()
    expect(screen.queryByText('Store details')).not.toBeInTheDocument()
  })

  it('omits absent optional profile fields', () => {
    render(<StorefrontPage store={{ ...store, description: null, phone_number: null, address: null, directions: null }} catalog={catalog} />)
    expect(screen.getByRole('heading', { name: 'Pulpería Estrada' })).toBeInTheDocument()
    expect(screen.queryByText('About the store')).not.toBeInTheDocument()
    expect(screen.queryByText('Phone / WhatsApp')).not.toBeInTheDocument()
    expect(screen.queryByText('Location')).not.toBeInTheDocument()
  })
})
