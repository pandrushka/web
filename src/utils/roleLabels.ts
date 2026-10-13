export type RoleContext = 'platform' | 'store' | 'employee' | 'customer'

export function storeMembershipRoleLabel(role: string | null | undefined): string | null {
  switch (role) {
    case 'owner': return 'Store Owner'
    case 'admin': return 'Store Admin'
    case 'employee': return 'Employee'
    default: return null
  }
}

/** Presentation only: this label must never be used to authorize an action. */
export function dashboardRoleLabel(globalRole: string, context: RoleContext, membershipRole: string | null | undefined): string {
  if (context === 'platform' && (globalRole === 'platform_admin' || globalRole === 'super_admin')) return 'Super Admin'

  if (context === 'store' || context === 'employee') {
    const membershipLabel = storeMembershipRoleLabel(membershipRole)
    if (membershipLabel) return membershipLabel
  }

  // Keep the legacy global admin visibly distinct from a store admin.
  if (globalRole === 'admin') return 'Admin'
  return 'Customer'
}
