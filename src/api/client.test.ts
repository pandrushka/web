import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { ApiRequestError, apiRequest, authorizationHeaders } from './client'
import i18n from '../i18n'

const server = setupServer(
  http.get('http://localhost:3000/api/v1/ping', ({ request }) => {
    expect(request.headers.get('authorization')).toBe('Bearer secret-token')
    expect(request.headers.get('accept-language')).toBe('es')
    return HttpResponse.json({ ok: true })
  }),
  http.get('http://localhost:3000/api/v1/fail', () =>
    HttpResponse.json({ error: 'Not allowed' }, { status: 401 }),
  ),
  http.post('http://localhost:3000/api/v1/rate-limited', () =>
    HttpResponse.json({ error: 'Try later', retry_after_seconds: 60 }, { status: 429, headers: { 'Retry-After': '60' } }),
  ),
)

beforeAll(() => server.listen())
afterEach(async () => {
  server.resetHandlers()
  await i18n.changeLanguage('es')
})
afterAll(() => server.close())

describe('apiRequest', () => {
  it('sends json requests and returns parsed data', async () => {
    await i18n.changeLanguage('es')
    const result = await apiRequest<{ ok: boolean }>('/api/v1/ping', {
      headers: authorizationHeaders('secret-token'),
    })

    expect(result).toEqual({ ok: true })
  })

  it('throws the api error message for non-2xx responses', async () => {
    await expect(apiRequest('/api/v1/fail')).rejects.toThrow('Not allowed')
  })

  it('preserves status and retry timing for rate-limited responses', async () => {
    await expect(apiRequest('/api/v1/rate-limited', { method: 'POST' })).rejects.toMatchObject<ApiRequestError>({
      status: 429,
      retryAfterSeconds: 60,
      message: 'Try later',
    })
  })

  it('uses the active language at request time and preserves custom headers, method, and body', async () => {
    const requests: Request[] = []
    server.use(http.post('http://localhost:3000/api/v1/language-check', async ({ request }) => {
      requests.push(request)
      return HttpResponse.json({ ok: true })
    }))

    await i18n.changeLanguage('es')
    await apiRequest('/api/v1/language-check', {
      method: 'POST',
      headers: { Authorization: 'Bearer kept', 'X-Custom': 'also-kept' },
      body: JSON.stringify({ value: 1 }),
    })
    await i18n.changeLanguage('en')
    await apiRequest('/api/v1/language-check', {
      method: 'POST',
      headers: { Authorization: 'Bearer kept', 'X-Custom': 'also-kept' },
      body: JSON.stringify({ value: 2 }),
    })

    expect(requests.map((request) => request.headers.get('accept-language'))).toEqual(['es', 'en'])
    expect(requests[1].headers.get('authorization')).toBe('Bearer kept')
    expect(requests[1].headers.get('x-custom')).toBe('also-kept')
    expect(requests[1].method).toBe('POST')
    expect(await requests[1].json()).toEqual({ value: 2 })
  })

  it('adds the language header to multipart requests without setting a content type', async () => {
    let captured: Request | undefined
    server.use(http.put('http://localhost:3000/api/v1/multipart', ({ request }) => {
      captured = request
      return HttpResponse.json({ ok: true })
    }))
    await i18n.changeLanguage('en')

    const form = new FormData()
    form.append('file', new Blob(['file']), 'file.txt')
    await apiRequest('/api/v1/multipart', { method: 'PUT', headers: authorizationHeaders('secret-token'), body: form })

    expect(captured?.headers.get('accept-language')).toBe('en')
    expect(captured?.headers.get('authorization')).toBe('Bearer secret-token')
    expect(captured?.headers.get('content-type')).toContain('multipart/form-data; boundary=')
  })
})
