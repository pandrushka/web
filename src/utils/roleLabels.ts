export type RoleContext = 'platform' | 'store' | 'employee' | 'customer'
export type RoleTranslationKey = 'roles.owner' | 'roles.admin' | 'roles.employee' | 'roles.superAdmin' | 'roles.legacyAdmin' | 'roles.customer'
export type RoleTranslator = (key: RoleTranslationKey) => string

export function storeMembershipRoleLabel(role: string | null | undefined, translate: RoleTranslator): string | null {
  switch (role) {
    case 'owner': return translate('roles.owner')
    case 'admin': return translate('roles.admin')
    case 'employee': return translate('roles.employee')
    default: return null
  }
}

/** Presentation only: this label must never be used to authorize an action. */
export function dashboardRoleLabel(globalRole: string, context: RoleContext, membershipRole: string | null | undefined, translate: RoleTranslator): string {
  if (context === 'platform' && (globalRole === 'platform_admin' || globalRole === 'super_admin')) return translate('roles.superAdmin')

  if (context === 'store' || context === 'employee') {
    const membershipLabel = storeMembershipRoleLabel(membershipRole, translate)
    if (membershipLabel) return membershipLabel
  }

  // Keep the legacy global admin visibly distinct from a store admin.
  if (globalRole === 'admin') return translate('roles.legacyAdmin')
  return translate('roles.customer')
}
