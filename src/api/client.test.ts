import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { apiRequest, authorizationHeaders } from './client'

const server = setupServer(
  http.get('http://localhost:3000/api/v1/ping', ({ request }) => {
    expect(request.headers.get('authorization')).toBe('Bearer secret-token')
    return HttpResponse.json({ ok: true })
  }),
  http.get('http://localhost:3000/api/v1/fail', () =>
    HttpResponse.json({ error: 'Not allowed' }, { status: 401 }),
  ),
)

beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

describe('apiRequest', () => {
  it('sends json requests and returns parsed data', async () => {
    const result = await apiRequest<{ ok: boolean }>('/api/v1/ping', {
      headers: authorizationHeaders('secret-token'),
    })

    expect(result).toEqual({ ok: true })
  })

  it('throws the api error message for non-2xx responses', async () => {
    await expect(apiRequest('/api/v1/fail')).rejects.toThrow('Not allowed')
  })
})
