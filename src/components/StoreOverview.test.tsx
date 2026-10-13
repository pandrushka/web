import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { StoreProfile } from '../api/stores'
import { StoreOverview } from './StoreOverview'

const store: StoreProfile = {
  id: 1,
  name: 'La Esquina',
  slug: 'la-esquina',
  description: null,
  logo_initial: 'L',
  phone_number: null,
  city: 'León',
  address: null,
  directions: null,
  status: 'draft',
  membership: { role: 'owner' },
}

describe('StoreOverview', () => {
  it.each([
    ['owner', 'Store Owner'],
    ['admin', 'Store Admin'],
    ['employee', 'Employee'],
  ])('labels the %s membership as %s', (role, label) => {
    render(<StoreOverview store={{ ...store, membership: { role } }} />)
    expect(screen.getByText(label)).toBeInTheDocument()
  })
})
