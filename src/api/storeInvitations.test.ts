import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { resendStoreInvitation } from './storeInvitations'

const server = setupServer(
  http.post('http://localhost:3000/api/v1/admin/store_invitations/42/resend', async ({ request }) => {
    expect(request.headers.get('authorization')).toBe('Bearer platform-jwt')
    expect(await request.json()).toEqual({})
    return HttpResponse.json({
      invitation: { id: 42, status: 'pending', last_delivery_status: 'sent' },
      email_delivery_status: 'sent',
    })
  }),
)

beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

describe('resendStoreInvitation', () => {
  it('posts to the admin resend endpoint with the authenticated session', async () => {
    await expect(resendStoreInvitation('platform-jwt', 42)).resolves.toMatchObject({
      invitation: { id: 42, status: 'pending', last_delivery_status: 'sent' },
      email_delivery_status: 'sent',
    })
  })
})
