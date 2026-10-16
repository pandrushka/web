import { useEffect, useState } from 'react'
import { Box, Skeleton } from '@mui/material'
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined'
import { fetchPublicProductImage } from '../../api/publicStorefront'
import { useNearViewport } from '../../hooks/useNearViewport'

type Props = { path: string | null | undefined; alt: string; size?: number | string }

export function PublicProductImage({ path, alt, size = 64 }: Props) {
  const [containerRef, isNearViewport] = useNearViewport<HTMLDivElement>(Boolean(path))
  const [state, setState] = useState<{ path: string | null; src: string | null; loading: boolean }>({ path: null, src: null, loading: false })

  useEffect(() => {
    if (!path) {
      setState({ path: null, src: null, loading: false })
      return undefined
    }
    if (!isNearViewport) return undefined

    let cancelled = false
    let objectUrl: string | null = null
    setState({ path, src: null, loading: true })
    void fetchPublicProductImage(path).then((blob) => {
      objectUrl = URL.createObjectURL(blob)
      if (cancelled) URL.revokeObjectURL(objectUrl)
      else setState({ path, src: objectUrl, loading: false })
    }).catch(() => {
      if (!cancelled) setState({ path, src: null, loading: false })
    })

    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [isNearViewport, path])

  const frameSx = { width: size, height: size, flexShrink: 0, borderRadius: 2, overflow: 'hidden' }
  const content = path && (!isNearViewport || state.path !== path || state.loading)
    ? <Skeleton variant="rounded" aria-label={`Loading ${alt}`} sx={{ width: '100%', height: '100%' }} />
    : !state.src || state.path !== path
      ? <Box aria-label={`${alt} placeholder`} role="img" sx={{ width: '100%', height: '100%', display: 'grid', placeItems: 'center', bgcolor: 'primary.light', color: 'primary.dark' }}><Inventory2OutlinedIcon /></Box>
      : <Box component="img" src={state.src} alt={alt} loading="lazy" sx={{ width: '100%', height: '100%', display: 'block', objectFit: 'cover', bgcolor: 'background.default' }} />
  return <Box ref={containerRef} sx={frameSx}>{content}</Box>
}
