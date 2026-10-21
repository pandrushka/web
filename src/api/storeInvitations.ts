import { apiRequest, authorizationHeaders } from './client'

export type StoreInvitationStatus = 'pending' | 'expired' | 'redeemed' | 'revoked'

export type StoreInvitation = {
  id: number
  recipient_email: string | null
  expires_at: string
  status: StoreInvitationStatus
  created_by_id: number
  redeemed_by_id: number | null
  redeemed_at: string | null
  revoked_at: string | null
  last_resent_at: string | null
  last_delivery_status: InvitationEmailDeliveryStatus | 'pending' | null
  created_at: string
}

export type StoreInvitationsResponse = { invitations: StoreInvitation[] }
export type InvitationEmailDeliveryStatus = 'sent' | 'failed' | 'not_requested'
export type CreateStoreInvitationResponse = {
  invitation: StoreInvitation
  token: string
  email_delivery_status: InvitationEmailDeliveryStatus
}

export function fetchStoreInvitations(accessToken: string) {
  return apiRequest<StoreInvitationsResponse>('/api/v1/admin/store_invitations', {
    headers: authorizationHeaders(accessToken),
  })
}

export function createStoreInvitation(accessToken: string, recipientEmail?: string) {
  return apiRequest<CreateStoreInvitationResponse>('/api/v1/admin/store_invitations', {
    method: 'POST',
    headers: authorizationHeaders(accessToken),
    body: JSON.stringify({ invitation: recipientEmail ? { recipient_email: recipientEmail } : {} }),
  })
}

export function revokeStoreInvitation(accessToken: string, invitationId: number) {
  return apiRequest<void>(`/api/v1/admin/store_invitations/${invitationId}`, {
    method: 'DELETE',
    headers: authorizationHeaders(accessToken),
  })
}

export type ResendStoreInvitationResponse = {
  invitation: StoreInvitation
  email_delivery_status: 'sent' | 'failed'
}

export function resendStoreInvitation(accessToken: string, invitationId: number) {
  return apiRequest<ResendStoreInvitationResponse>(`/api/v1/admin/store_invitations/${invitationId}/resend`, {
    method: 'POST',
    headers: authorizationHeaders(accessToken),
    body: JSON.stringify({}),
  })
}
