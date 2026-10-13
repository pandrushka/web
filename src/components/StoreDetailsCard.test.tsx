import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { ComponentProps } from 'react'
import { ThemeProvider } from '@mui/material/styles'
import { brandTheme } from '../theme/theme'
import type { StoreProfile } from '../api/stores'
import { StoreDetailsCard } from './StoreDetailsCard'

const store: StoreProfile = {
  id: 12, name: 'Pulpería La Esquina', slug: 'pulperia-la-esquina', description: 'Local store',
  logo_initial: 'P', phone_number: null, city: 'León', address: null, directions: null, status: 'draft', membership: { role: 'owner' },
}
const updatedStore: StoreProfile = { ...store, name: 'La Pulpería', city: 'Managua', description: 'Updated local store' }

function renderCard(props: ComponentProps<typeof StoreDetailsCard>) {
  return render(<ThemeProvider theme={brandTheme}><StoreDetailsCard {...props} /></ThemeProvider>)
}

describe('StoreDetailsCard', () => {
  it('shows store details and switches to inline fields from the edit action', async () => {
    renderCard({ store, editable: true, onSave: vi.fn().mockResolvedValue(updatedStore) })
    expect(screen.getByRole('heading', { name: 'Store details' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: store.name })).toBeInTheDocument()
    expect(screen.getByText('Local store')).toBeInTheDocument()
    expect(screen.queryByRole('textbox', { name: 'City' })).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Edit store details' }))
    expect(screen.getByRole('heading', { name: 'Editing store details' })).toBeInTheDocument()
    expect(screen.getByText('Edit mode')).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'City' })).toHaveValue('León')
    expect(screen.getByRole('textbox', { name: 'Store name' })).toHaveValue(store.name)
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument()
    expect(screen.getByText('pulperia-la-esquina')).toBeInTheDocument()
    expect(screen.queryByRole('textbox', { name: /slug/i })).not.toBeInTheDocument()
  })

  it('uses a distinct purple edit header and keeps the card responsive with touch-sized controls', async () => {
    renderCard({ store, editable: true, onSave: vi.fn().mockResolvedValue(store) })
    const card = screen.getByRole('heading', { name: 'Store details' }).closest('.MuiCard-root')!
    const header = card.querySelector('header')!
    expect(header).toHaveStyle({ backgroundColor: 'background.paper' })
    expect(card).toHaveStyle({ overflow: 'hidden' })

    await userEvent.click(screen.getByRole('button', { name: 'Edit store details' }))
    expect(header).toHaveStyle({ backgroundColor: 'secondary.light' })
    expect(screen.getByRole('heading', { name: 'Editing store details' })).toHaveStyle({ color: 'rgb(124, 58, 237)' })
    expect(screen.getByRole('button', { name: 'Save changes' })).toHaveStyle({ minHeight: '48px' })
    expect(card).not.toHaveStyle({ height: '760px' })
  })

  it('validates required fields and submits only the existing editable fields', async () => {
    const onSave = vi.fn().mockResolvedValue(updatedStore)
    const onStoreUpdated = vi.fn()
    renderCard({ store, editable: true, onSave, onStoreUpdated })
    await userEvent.click(screen.getByRole('button', { name: 'Edit store details' }))
    const city = screen.getByRole('textbox', { name: 'City' })
    await userEvent.clear(city)
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }))
    expect(await screen.findByText('City is required.')).toBeInTheDocument()
    expect(onSave).not.toHaveBeenCalled()

    await userEvent.type(city, 'Managua')
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }))
    await waitFor(() => expect(onSave).toHaveBeenCalledWith(12, {
      name: 'Pulpería La Esquina', description: 'Local store', logo_initial: 'P', phone_number: '', city: 'Managua', address: '', directions: '',
    }))
    expect(onStoreUpdated).toHaveBeenCalledWith(updatedStore)
    expect(await screen.findByText('Store details saved.')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: store.name })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Save changes' })).not.toBeInTheDocument()
  })

  it('keeps inputs and edit mode visible when the Rails save fails', async () => {
    const onSave = vi.fn().mockRejectedValue(new Error('Phone number is invalid'))
    renderCard({ store, editable: true, onSave })
    await userEvent.click(screen.getByRole('button', { name: 'Edit store details' }))
    const form = screen.getByRole('textbox', { name: 'City' })
    await userEvent.clear(form)
    await userEvent.type(form, 'Granada')
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }))
    expect(await screen.findByText('Phone number is invalid')).toBeInTheDocument()
    expect(form).toHaveValue('Granada')
    expect(screen.getByRole('heading', { name: 'Editing store details' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeInTheDocument()
  })

  it('prevents duplicate submissions while a save is pending', async () => {
    let resolveSave!: (value: StoreProfile) => void
    const onSave = vi.fn(() => new Promise<StoreProfile>((resolve) => { resolveSave = resolve }))
    renderCard({ store, editable: true, onSave })
    await userEvent.click(screen.getByRole('button', { name: 'Edit store details' }))
    const save = screen.getByRole('button', { name: 'Save changes' })
    fireEvent.click(save)
    expect(save).toBeDisabled()
    fireEvent.click(save)
    expect(onSave).toHaveBeenCalledTimes(1)
    resolveSave(updatedStore)
    await waitFor(() => expect(screen.getByText('Store details saved.')).toBeInTheDocument())
  })

  it('cancel discards edits and restores the saved values', async () => {
    const user = userEvent.setup()
    renderCard({ store, editable: true, onSave: vi.fn().mockResolvedValue(store) })
    await user.click(screen.getByRole('button', { name: 'Edit store details' }))
    const city = screen.getByRole('textbox', { name: 'City' })
    await user.clear(city)
    await user.type(city, 'Managua')
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.getByRole('heading', { name: store.name })).toBeInTheDocument()
    expect(screen.getByText('León')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Edit store details' }))
    expect(screen.getByRole('textbox', { name: 'City' })).toHaveValue('León')
  })

  it('keeps the slug read-only and hides editing controls without permission', async () => {
    const onSave = vi.fn()
    renderCard({ store, editable: false, onSave })
    expect(screen.getByText('pulperia-la-esquina')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Edit store details' })).not.toBeInTheDocument()
    expect(screen.queryByRole('textbox', { name: /slug/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Save changes' })).not.toBeInTheDocument()
    expect(onSave).not.toHaveBeenCalled()
  })

  it('keeps the field ordering represented in the same responsive columns in both modes', async () => {
    renderCard({ store, editable: true, onSave: vi.fn().mockResolvedValue(store) })
    const viewCard = screen.getByRole('heading', { name: store.name }).closest('.MuiCard-root')!
    const viewGrid = viewCard.querySelector('.MuiGrid-container')!
    expect(within(viewGrid as HTMLElement).getByText('Phone / WhatsApp')).toBeInTheDocument()
    expect(within(viewGrid as HTMLElement).getByText('City')).toBeInTheDocument()
    expect(within(viewGrid as HTMLElement).getByText('Address')).toBeInTheDocument()
    expect(within(viewGrid as HTMLElement).getByText('Directions')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Edit store details' }))
    const editCard = screen.getByRole('heading', { name: 'Editing store details' }).closest('.MuiCard-root')!
    const editGrid = editCard.querySelector('.MuiGrid-container')!
    expect(editGrid.querySelectorAll('.MuiGrid-item, .MuiGrid-root')).toBeTruthy()
    for (const label of ['Phone / WhatsApp', 'City', 'Address', 'Directions']) {
      expect(within(editGrid as HTMLElement).getByRole('textbox', { name: label })).toBeInTheDocument()
    }
  })
})
