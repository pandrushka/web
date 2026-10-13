import { describe, expect, it } from 'vitest'
import { dashboardRoleLabel, storeMembershipRoleLabel } from './roleLabels'

describe('role labels', () => {
  it('labels platform, owner, store admin, employee, and customer contexts', () => {
    expect(dashboardRoleLabel('platform_admin', 'platform', null)).toBe('Super Admin')
    expect(dashboardRoleLabel('super_admin', 'platform', null)).toBe('Super Admin')
    expect(dashboardRoleLabel('member', 'store', 'owner')).toBe('Store Owner')
    expect(dashboardRoleLabel('member', 'store', 'admin')).toBe('Store Admin')
    expect(dashboardRoleLabel('member', 'employee', 'employee')).toBe('Employee')
    expect(dashboardRoleLabel('member', 'customer', null)).toBe('Customer')
  })

  it('uses the active context for a dual-role user and keeps legacy admin distinct', () => {
    expect(dashboardRoleLabel('platform_admin', 'platform', 'owner')).toBe('Super Admin')
    expect(dashboardRoleLabel('platform_admin', 'store', 'owner')).toBe('Store Owner')
    expect(dashboardRoleLabel('admin', 'customer', null)).toBe('Admin')
    expect(storeMembershipRoleLabel('admin')).toBe('Store Admin')
    expect(storeMembershipRoleLabel('unknown')).toBeNull()
  })
})
