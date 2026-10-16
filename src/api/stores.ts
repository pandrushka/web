import { apiRequest, authorizationHeaders } from './client'

export type StoreAttributes = {
  name: string
  slug: string
  logo_initial: string
  description: string
  phone_number: string
  city: string
  address: string
  directions: string
}

export type StoreCreationResponse = {
  store: {
    id: number
    name: string
    slug: string
    status: string
  }
  membership: { id: number; role: string }
}

export type StoreMembershipRole = 'owner' | 'admin' | 'employee'

export type StoreProfile = {
  id: number
  name: string
  slug: string
  description: string | null
  logo_initial: string
  phone_number: string | null
  city: string
  address: string | null
  directions: string | null
  status: 'draft' | 'active' | 'suspended' | string
  membership?: { role: StoreMembershipRole | string }
}

export type StoreProfileChanges = Pick<StoreAttributes, 'name' | 'description' | 'logo_initial' | 'phone_number' | 'city' | 'address' | 'directions'>

export type StoreProfileResponse = { store: StoreProfile }

export type MemberStoresResponse = { stores: StoreProfile[] }

export type PlatformStoresResponse = {
  stores: StoreProfile[]
  pagination: { page: number; per_page: number; total_count: number; total_pages: number }
}

export function fetchMyStores(accessToken: string) {
  return apiRequest<MemberStoresResponse>('/api/v1/stores', {
    headers: authorizationHeaders(accessToken),
  })
}

export function fetchStore(accessToken: string, storeId: number) {
  return apiRequest<StoreProfileResponse>(`/api/v1/stores/${storeId}`, {
    headers: authorizationHeaders(accessToken),
  })
}

export function fetchAllStores(accessToken: string, page = 1, perPage = 25) {
  return apiRequest<PlatformStoresResponse>(`/api/v1/admin/stores?page=${page}&per_page=${perPage}`, {
    headers: authorizationHeaders(accessToken),
  })
}

export function fetchAdminStore(accessToken: string, storeId: number) {
  return apiRequest<StoreProfileResponse>(`/api/v1/admin/stores/${storeId}`, {
    headers: authorizationHeaders(accessToken),
  })
}

export function updateStore(accessToken: string, storeId: number, changes: StoreProfileChanges) {
  return apiRequest<StoreProfileResponse>(`/api/v1/stores/${storeId}`, {
    method: 'PATCH',
    headers: authorizationHeaders(accessToken),
    body: JSON.stringify({ store: changes }),
  })
}

export function publishStore(accessToken: string, storeId: number) {
  return apiRequest<StoreProfileResponse>(`/api/v1/stores/${storeId}/publish`, {
    method: 'POST',
    headers: authorizationHeaders(accessToken),
  })
}

export function unpublishStore(accessToken: string, storeId: number) {
  return apiRequest<StoreProfileResponse>(`/api/v1/stores/${storeId}/unpublish`, {
    method: 'POST',
    headers: authorizationHeaders(accessToken),
  })
}

export function validateStoreInvitation(token: string, accessToken: string) {
  return apiRequest<{ valid: true; expires_at: string }>('/api/v1/store_invitations/validate', {
    method: 'POST',
    headers: authorizationHeaders(accessToken),
    body: JSON.stringify({ token }),
  })
}

export function createStoreFromInvitation(token: string, store: StoreAttributes, accessToken: string) {
  return apiRequest<StoreCreationResponse>('/api/v1/stores', {
    method: 'POST',
    headers: authorizationHeaders(accessToken),
    body: JSON.stringify({ invitation_token: token, store }),
  })
}
