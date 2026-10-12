import { useEffect, useRef } from 'react'
import { Box } from '@mui/material'

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement,
        options: {
          sitekey: string
          theme?: 'light' | 'dark' | 'auto'
          callback?: (token: string) => void
          'expired-callback'?: () => void
          'error-callback'?: () => void
        },
      ) => string
      reset: (widgetId?: string) => void
      remove?: (widgetId: string) => void
    }
  }
}

let scriptPromise: Promise<void> | null = null

function loadTurnstileScript() {
  if (window.turnstile) {
    return Promise.resolve()
  }

  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      const existingScript = document.querySelector<HTMLScriptElement>('script[data-turnstile-script="true"]')

      if (existingScript) {
        existingScript.addEventListener('load', () => resolve(), { once: true })
        existingScript.addEventListener('error', () => reject(new Error('Could not load Turnstile')), { once: true })
        return
      }

      const script = document.createElement('script')
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js'
      script.async = true
      script.defer = true
      script.dataset.turnstileScript = 'true'
      script.onload = () => resolve()
      script.onerror = () => reject(new Error('Could not load Turnstile'))
      document.head.appendChild(script)
    })
  }

  return scriptPromise
}

type TurnstileWidgetProps = {
  siteKey: string
  onTokenChange: (token: string | null) => void
}

export function TurnstileWidget({ siteKey, onTokenChange }: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!siteKey || !containerRef.current) return undefined

    let widgetId: string | undefined
    let cancelled = false

    loadTurnstileScript()
      .then(() => {
        if (cancelled || !containerRef.current || !window.turnstile) return

        widgetId = window.turnstile.render(containerRef.current, {
          sitekey: siteKey,
          theme: 'light',
          callback: (token) => onTokenChange(token),
          'expired-callback': () => onTokenChange(null),
          'error-callback': () => onTokenChange(null),
        })
      })
      .catch(() => {
        onTokenChange(null)
      })

    return () => {
      cancelled = true
      onTokenChange(null)

      if (widgetId && window.turnstile?.remove) {
        window.turnstile.remove(widgetId)
      } else if (widgetId) {
        window.turnstile?.reset(widgetId)
      }
    }
  }, [onTokenChange, siteKey])

  return <Box ref={containerRef} sx={{ display: 'flex', justifyContent: 'center', minHeight: 78 }} />
}
