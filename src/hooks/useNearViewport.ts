import { useEffect, useRef, useState } from 'react'

export function useNearViewport<T extends Element>(enabled: boolean, rootMargin = '240px') {
  const elementRef = useRef<T>(null)
  const [isNearViewport, setIsNearViewport] = useState(false)

  useEffect(() => {
    if (!enabled) {
      setIsNearViewport(false)
      return undefined
    }
    if (isNearViewport) return undefined

    const element = elementRef.current
    if (!element) return undefined
    if (typeof IntersectionObserver === 'undefined') {
      setIsNearViewport(true)
      return undefined
    }

    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        setIsNearViewport(true)
        observer.disconnect()
      }
    }, { rootMargin })
    observer.observe(element)
    return () => observer.disconnect()
  }, [enabled, isNearViewport, rootMargin])

  return [elementRef, isNearViewport] as const
}
