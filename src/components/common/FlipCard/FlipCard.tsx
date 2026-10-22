import type { ReactNode } from 'react'
import { Box, useMediaQuery } from '@mui/material'
import type { SxProps, Theme } from '@mui/material/styles'
import { useCallback, useLayoutEffect, useRef, useState } from 'react'

export type FlipCardProps = {
  front: ReactNode
  back: ReactNode
  flipped: boolean
  duration?: number
  sx?: SxProps<Theme>
  frontSx?: SxProps<Theme>
  backSx?: SxProps<Theme>
  onFlipAnimationEnd?: () => void
  'aria-label'?: string
}

/** A controlled, accessible 3D card that measures each face and animates between their natural heights. */
export function FlipCard({
  front,
  back,
  flipped,
  duration = 500,
  sx,
  frontSx,
  backSx,
  onFlipAnimationEnd,
  'aria-label': ariaLabel,
}: FlipCardProps) {
  const reduceMotion = useMediaQuery('(prefers-reduced-motion: reduce)')
  const faceRefs = useRef<{ front: HTMLDivElement | null; back: HTMLDivElement | null }>({ front: null, back: null })
  const previousFlipped = useRef(flipped)
  const [faceHeights, setFaceHeights] = useState({ front: 0, back: 0 })
  const measureFace = useCallback((face: 'front' | 'back') => {
    const element = faceRefs.current[face]
    if (!element) return
    const height = Math.ceil(Math.max(element.getBoundingClientRect().height, element.scrollHeight))
    if (!height) return
    setFaceHeights((current) => current[face] === height ? current : { ...current, [face]: height })
  }, [])

  const measureAll = useCallback(() => {
    measureFace('front')
    measureFace('back')
  }, [measureFace])

  useLayoutEffect(() => {
    measureAll()
    if (typeof ResizeObserver === 'undefined') return undefined
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const face = entry.target.getAttribute('data-measured-face')
        if (face === 'front' || face === 'back') measureFace(face)
      }
    })
    if (faceRefs.current.front) observer.observe(faceRefs.current.front)
    if (faceRefs.current.back) observer.observe(faceRefs.current.back)
    window.addEventListener('resize', measureAll)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', measureAll)
    }
  }, [front, back, measureAll, measureFace])

  useLayoutEffect(() => {
    if (previousFlipped.current === flipped) return
    previousFlipped.current = flipped
    if (reduceMotion || duration <= 0) onFlipAnimationEnd?.()
  }, [duration, flipped, onFlipAnimationEnd, reduceMotion])

  const faceSx = {
    gridArea: '1 / 1',
    minWidth: 0,
    backfaceVisibility: 'hidden',
    WebkitBackfaceVisibility: 'hidden',
    overflowWrap: 'anywhere',
  } as const

  return (
    <Box
      role="group"
      aria-label={ariaLabel}
      data-testid="flip-card-container"
      sx={[{ width: '100%', perspective: '1000px' }, ...(Array.isArray(sx) ? sx : [sx])]}
    >
      <Box
        data-testid="flip-card-sizer"
        sx={{
          width: '100%',
          height: faceHeights[flipped ? 'back' : 'front'] || 'auto',
          overflow: 'hidden',
          transition: !reduceMotion ? `height ${Math.min(Math.max(duration, 0), 180)}ms ease` : 'none',
          '@media (prefers-reduced-motion: reduce)': { transition: 'none' },
        }}
      >
      <Box
        data-testid="flip-card-rotator"
        onTransitionEnd={(event) => {
          if (event.target !== event.currentTarget || event.propertyName !== 'transform') return
          onFlipAnimationEnd?.()
        }}
        sx={{
          display: 'grid',
          height: '100%',
          gridTemplateRows: 'minmax(0, 1fr)',
          transformStyle: 'preserve-3d',
          transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
          transition: reduceMotion ? 'none' : `transform ${Math.max(0, duration)}ms ease`,
          '@media (prefers-reduced-motion: reduce)': { transition: 'none' },
        }}
      >
        <Box
          data-testid="flip-card-front"
          data-flip-card-face="front"
          aria-hidden={flipped}
          inert={flipped}
          sx={[faceSx, { height: '100%', minHeight: 0, overflow: 'hidden', visibility: flipped ? 'hidden' : 'visible' }, ...(Array.isArray(frontSx) ? frontSx : [frontSx])]}
        >
          <Box ref={(element: HTMLDivElement | null) => { faceRefs.current.front = element }} data-measured-face="front" sx={{ width: '100%' }}>{front}</Box>
        </Box>
        <Box
          data-testid="flip-card-back"
          data-flip-card-face="back"
          aria-hidden={!flipped}
          inert={!flipped}
          sx={[faceSx, { height: '100%', minHeight: 0, overflow: 'hidden', transform: 'rotateY(180deg)', visibility: flipped ? 'visible' : 'hidden' }, ...(Array.isArray(backSx) ? backSx : [backSx])]}
        >
          <Box ref={(element: HTMLDivElement | null) => { faceRefs.current.back = element }} data-measured-face="back" sx={{ width: '100%' }}>{back}</Box>
        </Box>
      </Box>
      </Box>
    </Box>
  )
}
