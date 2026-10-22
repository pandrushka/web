import { useEffect, useRef, useState } from 'react'

export function useNearViewport<T extends Element>(enabled: boolean, rootMargin = '240px', observationKey = '') {
  const elementRef = useRef<T>(null)
  const activationKey = `${enabled}:${observationKey}`
  const [intersection, setIntersection] = useState(() => ({ key: activationKey, reached: typeof IntersectionObserver === 'undefined' }))
  const isNearViewport = enabled && (typeof IntersectionObserver === 'undefined' || (intersection.key === activationKey && intersection.reached))

  useEffect(() => {
    if (!enabled || isNearViewport) return undefined

    const element = elementRef.current
    if (!element) return undefined
    if (typeof IntersectionObserver === 'undefined') return undefined

    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        setIntersection({ key: activationKey, reached: true })
        observer.disconnect()
      }
    }, { rootMargin })
    observer.observe(element)
    return () => observer.disconnect()
  }, [activationKey, enabled, isNearViewport, rootMargin])

  return [elementRef, isNearViewport] as const
}
