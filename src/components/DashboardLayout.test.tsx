import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { DashboardLayout } from './DashboardLayout'

describe('DashboardLayout', () => {
  it('shows only platform navigation for a platform-only user', () => {
    render(<DashboardLayout email="admin@example.com" role="platform_admin" context="platform" storeRole={null} canSwitchContext={false} isPlatformAdmin activeSection="dashboard" onContextChange={vi.fn()} onNavigate={vi.fn()} onLogout={vi.fn()}><div>Page</div></DashboardLayout>)
    fireEvent.click(screen.getByRole('button', { name: /open navigation/i }))

    expect(screen.getByRole('button', { name: /super admin dashboard/i })).toHaveAttribute('aria-current', 'page')
    expect(screen.queryByRole('combobox', { name: /context/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /store owner dashboard/i })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Invitations' })).toBeEnabled()
    for (const item of ['Users', 'Platform Reports', 'Platform Settings']) {
      expect(screen.getByRole('button', { name: new RegExp(`${item} coming soon`, 'i') })).toHaveAttribute('aria-disabled', 'true')
    }
  })

  it('switches authenticated dashboard labels immediately between English and Spanish', async () => {
    const user = userEvent.setup()
    render(<DashboardLayout email="admin@example.com" role="platform_admin" context="platform" storeRole={null} canSwitchContext={false} isPlatformAdmin activeSection="dashboard" onContextChange={vi.fn()} onNavigate={vi.fn()} onLogout={vi.fn()}><div>Page</div></DashboardLayout>)
    expect(screen.getByRole('heading', { name: 'Super Admin Dashboard' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Español' }))
    expect(await screen.findByRole('heading', { name: 'Panel de Super Admin' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'English' }))
    expect(await screen.findByRole('heading', { name: 'Super Admin Dashboard' })).toBeInTheDocument()
  })

  it('enables invitation navigation only in platform context', async () => {
    const user = userEvent.setup()
    const onNavigate = vi.fn()
    const props = { email: 'dual@example.com', role: 'platform_admin', storeRole: 'owner' as const, canSwitchContext: true, isPlatformAdmin: true, activeSection: 'dashboard' as const, onContextChange: vi.fn(), onNavigate, onLogout: vi.fn(), children: <div>Page</div> }
    const { rerender } = render(<DashboardLayout {...props} context="platform" />)
    await user.click(screen.getByRole('button', { name: /open navigation/i }))
    await user.click(screen.getByRole('button', { name: 'Invitations' }))
    expect(onNavigate).toHaveBeenCalledWith('invitations')
    rerender(<DashboardLayout {...props} context="store" />)
    expect(screen.queryByRole('button', { name: 'Invitations' })).not.toBeInTheDocument()
  })

  it('shows the store-owner navigation without a store switcher or create-store action', () => {
    render(<DashboardLayout email="owner@example.com" role="member" context="store" storeRole="owner" canSwitchContext={false} isPlatformAdmin={false} activeSection="dashboard" onContextChange={vi.fn()} onNavigate={vi.fn()} onLogout={vi.fn()}><div>Page</div></DashboardLayout>)
    fireEvent.click(screen.getByRole('button', { name: /open account menu for owner@example.com/i }))
    expect(screen.getByText('Store Owner')).toBeInTheDocument()
    fireEvent.keyDown(screen.getByRole('menu'), { key: 'Escape' })
    fireEvent.click(screen.getByRole('button', { name: /open navigation/i }))

    expect(screen.getByRole('button', { name: /store owner dashboard/i })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByText('Store Owner')).toBeInTheDocument()
    expect(screen.queryByRole('combobox', { name: /context/i })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Products' })).toBeEnabled()
    for (const item of ['Orders', 'Sales', 'Store Settings']) {
      expect(screen.getByRole('button', { name: new RegExp(`${item} coming soon`, 'i') })).toHaveAttribute('aria-disabled', 'true')
    }
    expect(screen.queryByRole('button', { name: /create.*store/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Invitations' })).not.toBeInTheDocument()
  })

  it('switches between platform and the owned store for a dual-role user', async () => {
    const user = userEvent.setup()
    const onContextChange = vi.fn()
    const props = { email: 'dual@example.com', role: 'platform_admin', storeRole: 'owner' as const, canSwitchContext: true, isPlatformAdmin: true, activeSection: 'dashboard' as const, onContextChange, onNavigate: vi.fn(), onLogout: vi.fn(), children: <div>Page</div> }
    const { rerender } = render(<DashboardLayout {...props} context="platform" />)

    await user.click(await screen.findByRole('button', { name: /open account menu for dual@example.com/i }))
    expect(within(screen.getByRole('menu')).getByText('Super Admin')).toBeInTheDocument()
    await user.keyboard('{Escape}')
    await user.click(screen.getByRole('button', { name: /open navigation/i }))
    await user.click(screen.getByRole('combobox', { name: /context/i }))
    await user.click(await screen.findByRole('option', { name: 'Store Owner' }))
    expect(onContextChange).toHaveBeenCalledWith('store')
    await waitFor(() => expect(document.querySelector('.MuiDrawer-root')).toHaveAttribute('aria-hidden', 'true'))
    rerender(<DashboardLayout {...props} context="store" />)
    await user.click(await screen.findByRole('button', { name: /open account menu for dual@example.com/i }))
    expect(within(screen.getByRole('menu')).getByText('Store Owner')).toBeInTheDocument()
  })

  it('does not present the legacy global admin role as a Store Admin', () => {
    render(<DashboardLayout email="legacy@example.com" role="admin" context="customer" storeRole={null} canSwitchContext={false} isPlatformAdmin={false} activeSection="dashboard" onContextChange={vi.fn()} onNavigate={vi.fn()} onLogout={vi.fn()}><div>Page</div></DashboardLayout>)
    fireEvent.click(screen.getByRole('button', { name: /open account menu for legacy@example.com/i }))
    expect(screen.getByText('Admin')).toBeInTheDocument()
    expect(screen.queryByText('Store Admin')).not.toBeInTheDocument()
  })

  it('keeps employee navigation read-only and closes the mobile drawer after navigation', async () => {
    const user = userEvent.setup()
    const navigate = vi.fn()
    const { container } = render(<DashboardLayout email="employee@example.com" role="member" context="employee" storeRole="employee" canSwitchContext={false} isPlatformAdmin={false} activeSection="dashboard" onContextChange={vi.fn()} onNavigate={navigate} onLogout={vi.fn()}><div>Page</div></DashboardLayout>)

    await user.click(screen.getByRole('button', { name: /open navigation/i }))
    expect(screen.getByRole('button', { name: /employee dashboard/i })).toHaveAttribute('aria-current', 'page')
    await user.click(screen.getByRole('button', { name: /employee dashboard/i }))
    await user.click(await screen.findByRole('button', { name: /open account menu for employee@example.com/i }))
    expect(within(screen.getByRole('menu')).getByText('Employee')).toBeInTheDocument()
    await user.keyboard('{Escape}')
    await user.click(await screen.findByRole('button', { name: /open navigation/i }))
    expect(screen.getByRole('button', { name: /employee dashboard/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /products/i })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /employee dashboard/i }))

    expect(navigate).toHaveBeenCalledWith('dashboard')
    expect(container.querySelector('[aria-label="Open navigation"]')).toHaveAttribute('aria-expanded', 'false')
  })

  it('provides logout for the customer shell', () => {
    const logout = vi.fn()
    render(<DashboardLayout email="customer@example.com" role="member" context="customer" storeRole={null} canSwitchContext={false} isPlatformAdmin={false} activeSection="dashboard" onContextChange={vi.fn()} onNavigate={vi.fn()} onLogout={logout}><div>Page</div></DashboardLayout>)
    expect(screen.getByRole('button', { name: /open account menu for customer@example.com/i })).toBeInTheDocument()
    expect(screen.queryByRole('menuitem', { name: /log out/i })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /open account menu for customer@example.com/i }))
    expect(screen.getByRole('menu')).toBeInTheDocument()
    expect(screen.getByText('customer@example.com')).toBeInTheDocument()
    expect(screen.getByText('Customer')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('menuitem', { name: /log out/i }))
    expect(logout).toHaveBeenCalledOnce()
  })

  it('shows signed-in identity beside the header avatar on desktop', () => {
    const originalMatchMedia = window.matchMedia
    Object.defineProperty(window, 'matchMedia', { configurable: true, value: vi.fn((query: string) => ({
      matches: query.includes('min-width:900px'), media: query, onchange: null,
      addListener: vi.fn(), removeListener: vi.fn(), addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: vi.fn(),
    })) })
    render(<DashboardLayout email="owner@example.com" role="store_admin" context="store" storeRole="admin" canSwitchContext={false} isPlatformAdmin={false} activeSection="dashboard" onContextChange={vi.fn()} onNavigate={vi.fn()} onLogout={vi.fn()}><div>Page</div></DashboardLayout>)

    expect(screen.getByRole('button', { name: 'Go to dashboard' }).querySelector('img')).toHaveAttribute('src', '/branding/tu-pulperia-logo-light.png')
    expect(screen.getByRole('heading', { name: 'Store Admin Dashboard' })).toBeInTheDocument()
    expect(screen.getByText('owner@example.com')).toBeInTheDocument()
    expect(screen.getByText('Store Admin')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /open account menu for owner@example.com/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /log out/i })).not.toBeInTheDocument()
    Object.defineProperty(window, 'matchMedia', { configurable: true, value: originalMatchMedia })
  })

  it('keeps mobile navigation and account menu controls available without duplication', async () => {
    const user = userEvent.setup()
    render(<DashboardLayout email="mobile@example.com" role="member" context="customer" storeRole={null} canSwitchContext={false} isPlatformAdmin={false} activeSection="dashboard" onContextChange={vi.fn()} onNavigate={vi.fn()} onLogout={vi.fn()}><div>Page</div></DashboardLayout>)

    expect(screen.getAllByRole('button', { name: /open account menu/i })).toHaveLength(1)
    expect(screen.getByRole('button', { name: /open navigation/i }).nextElementSibling?.querySelector('img')).toHaveAttribute('src', '/branding/tu-pulperia-icon.png')
    await user.click(screen.getByRole('button', { name: /open navigation/i }))
    expect(screen.getByRole('navigation', { name: 'Main navigation' })).toBeInTheDocument()
    expect(document.querySelector('.MuiDrawer-paper img')).toHaveAttribute('src', '/branding/tu-pulperia-logo-light.png')
    await user.click(screen.getByRole('button', { name: 'Customer Dashboard' }))
    await user.click(await screen.findByRole('button', { name: /open account menu for mobile@example.com/i }))
    expect(screen.getByRole('menu')).toBeInTheDocument()
    expect(screen.getAllByRole('menuitem', { name: /log out/i })).toHaveLength(1)
    await user.keyboard('{Escape}')
    expect(screen.getByRole('button', { name: /open navigation/i })).toBeInTheDocument()
  })

  it('uses the icon-only logo in a collapsed desktop sidebar and restores the wordmark when expanded', async () => {
    const user = userEvent.setup()
    const onContextChange = vi.fn()
    const originalMatchMedia = window.matchMedia
    Object.defineProperty(window, 'matchMedia', { configurable: true, value: vi.fn((query: string) => ({
      matches: query.includes('min-width:900px'), media: query, onchange: null,
      addListener: vi.fn(), removeListener: vi.fn(), addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: vi.fn(),
    })) })
    render(<DashboardLayout email="admin@example.com" role="platform_admin" context="platform" storeRole="owner" canSwitchContext isPlatformAdmin activeSection="dashboard" onContextChange={onContextChange} onNavigate={vi.fn()} onLogout={vi.fn()}><div>Page</div></DashboardLayout>)

    const logo = screen.getByRole('button', { name: 'Go to dashboard' }).querySelector('img')
    expect(logo).toHaveAttribute('src', '/branding/tu-pulperia-logo-light.png')
    await user.click(screen.getByRole('button', { name: 'Collapse navigation' }))
    expect(logo).toHaveAttribute('src', '/branding/tu-pulperia-icon.png')
    expect(screen.getByRole('button', { name: 'Invitations' })).toBeInTheDocument()
    await user.click(screen.getByRole('combobox', { name: /context/i }))
    await user.click(await screen.findByRole('option', { name: 'Store Owner' }))
    expect(onContextChange).toHaveBeenCalledWith('store')
    await user.click(screen.getByRole('button', { name: 'Expand navigation' }))
    expect(logo).toHaveAttribute('src', '/branding/tu-pulperia-logo-light.png')
    Object.defineProperty(window, 'matchMedia', { configurable: true, value: originalMatchMedia })
  })

  it('keeps long Spanish navigation labels and Coming Soon markers inside the sidebar', async () => {
    const user = userEvent.setup()
    render(<DashboardLayout email="owner@example.com" role="member" context="store" storeRole="owner" canSwitchContext={false} isPlatformAdmin={false} activeSection="dashboard" onContextChange={vi.fn()} onNavigate={vi.fn()} onLogout={vi.fn()}><div>Page</div></DashboardLayout>)

    await user.click(screen.getByRole('button', { name: 'Español' }))
    await user.click(screen.getByRole('button', { name: /abrir navegación/i }))

    const longLabel = 'Panel de Propietario de tienda'
    const dashboardItem = screen.getByRole('button', { name: longLabel })
    expect(dashboardItem).toHaveAttribute('aria-label', longLabel)
    expect(dashboardItem).toHaveStyle({ width: '100%', minWidth: '0px', boxSizing: 'border-box', overflow: 'hidden' })
    expect(within(dashboardItem).getByText(longLabel)).toHaveStyle({ WebkitLineClamp: '2', overflow: 'hidden' })

    const futureItem = screen.getByRole('button', { name: 'Configuración de tienda Próximamente' })
    expect(futureItem).toHaveAttribute('aria-disabled', 'true')
    expect(within(futureItem).getByText('Próximamente')).toBeInTheDocument()
    expect(futureItem.querySelector('.MuiChip-root')).toBeInTheDocument()
  })

  it('uses the same responsive height for the sidebar brand divider and top header', () => {
    const { container } = render(<DashboardLayout email="owner@example.com" role="member" context="store" storeRole="owner" canSwitchContext={false} isPlatformAdmin={false} activeSection="dashboard" onContextChange={vi.fn()} onNavigate={vi.fn()} onLogout={vi.fn()}><div>Page</div></DashboardLayout>)
    const brandHeader = screen.getByTestId('dashboard-sidebar-brand')
    const toolbar = container.querySelector('.MuiToolbar-root')

    expect(brandHeader.nextElementSibling).toHaveClass('MuiDivider-root')
    expect(toolbar).not.toBeNull()
    expect(window.getComputedStyle(brandHeader).height).toBe(window.getComputedStyle(toolbar!).height)
  })
})
