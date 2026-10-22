import { describe, expect, it } from 'vitest'
import { dashboardRoleLabel, storeMembershipRoleLabel } from './roleLabels'

const roleCopy = {
  'roles.owner': 'Store Owner',
  'roles.admin': 'Store Admin',
  'roles.employee': 'Employee',
  'roles.superAdmin': 'Super Admin',
  'roles.legacyAdmin': 'Admin',
  'roles.customer': 'Customer',
} as const
const translateRole = (key: keyof typeof roleCopy) => roleCopy[key]

describe('role labels', () => {
  it('labels platform, owner, store admin, employee, and customer contexts', () => {
    expect(dashboardRoleLabel('platform_admin', 'platform', null, translateRole)).toBe('Super Admin')
    expect(dashboardRoleLabel('super_admin', 'platform', null, translateRole)).toBe('Super Admin')
    expect(dashboardRoleLabel('member', 'store', 'owner', translateRole)).toBe('Store Owner')
    expect(dashboardRoleLabel('member', 'store', 'admin', translateRole)).toBe('Store Admin')
    expect(dashboardRoleLabel('member', 'employee', 'employee', translateRole)).toBe('Employee')
    expect(dashboardRoleLabel('member', 'customer', null, translateRole)).toBe('Customer')
  })

  it('uses the active context for a dual-role user and keeps legacy admin distinct', () => {
    expect(dashboardRoleLabel('platform_admin', 'platform', 'owner', translateRole)).toBe('Super Admin')
    expect(dashboardRoleLabel('platform_admin', 'store', 'owner', translateRole)).toBe('Store Owner')
    expect(dashboardRoleLabel('admin', 'customer', null, translateRole)).toBe('Admin')
    expect(storeMembershipRoleLabel('admin', translateRole)).toBe('Store Admin')
    expect(storeMembershipRoleLabel('unknown', translateRole)).toBeNull()
  })
})
