import { useEffect, useState } from 'react'
import { Box, Skeleton } from '@mui/material'
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined'
import { fetchProductImage, onProductImageInvalidated, type ImageTokenRefresh } from '../../api/productImages'
import { useNearViewport } from '../../hooks/useNearViewport'

type Props = {
  path: string | null | undefined
  accessToken: string
  cacheScope: string
  alt: string
  refreshAccessToken?: ImageTokenRefresh
  size?: number | string
  rounded?: boolean
}

export function ProductImage({ path, accessToken, cacheScope, alt, refreshAccessToken, size = 72, rounded = true }: Props) {
  const [containerRef, isNearViewport] = useNearViewport<HTMLDivElement>(Boolean(path))
  const [cacheRevision, setCacheRevision] = useState(0)
  const requestKey = `${cacheScope}:${path ?? ''}:${accessToken}:${cacheRevision}`
  const [imageState, setImageState] = useState<{ key: string; src: string | null; failed: boolean; loading: boolean }>({ key: '', src: null, failed: false, loading: false })

  useEffect(() => onProductImageInvalidated(({ path: invalidatedPath, cacheScope: invalidatedScope }) => {
    if (path && invalidatedPath === path && (!invalidatedScope || invalidatedScope === cacheScope)) setCacheRevision((revision) => revision + 1)
  }), [cacheScope, path])

  useEffect(() => {
    if (!path) {
      setImageState({ key: requestKey, src: null, failed: false, loading: false })
      return undefined
    }

    if (!isNearViewport) return undefined

    let cancelled = false
    let objectUrl: string | null = null
    setImageState({ key: requestKey, src: null, failed: false, loading: true })
    void fetchProductImage(path, accessToken, cacheScope, refreshAccessToken).then((blob) => {
      objectUrl = URL.createObjectURL(blob)
      if (!cancelled) setImageState({ key: requestKey, src: objectUrl, failed: false, loading: false })
      else URL.revokeObjectURL(objectUrl)
    }).catch(() => {
      if (!cancelled) setImageState({ key: requestKey, src: null, failed: true, loading: false })
    })

    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [accessToken, cacheScope, isNearViewport, path, refreshAccessToken, requestKey])

  const imageFrame = {
    width: size,
    height: size,
    flexShrink: 0,
    borderRadius: rounded ? 2 : 0,
    overflow: 'hidden',
  }

  const isCurrent = imageState.key === requestKey
  const content = path && (!isNearViewport || !isCurrent || imageState.loading)
    ? <Skeleton variant="rounded" aria-label={`Loading ${alt}`} sx={{ width: '100%', height: '100%' }} />
    : !isCurrent || !imageState.src || imageState.failed
      ? <Box aria-label={`${alt} placeholder`} role="img" sx={{ width: '100%', height: '100%', display: 'grid', placeItems: 'center', bgcolor: 'primary.light', color: 'primary.dark' }}><Inventory2OutlinedIcon /></Box>
      : <Box component="img" src={imageState.src} alt={alt} loading="lazy" sx={{ width: '100%', height: '100%', display: 'block', objectFit: 'cover', bgcolor: 'background.default' }} />
  return <Box ref={containerRef} sx={imageFrame}>{content}</Box>
}
