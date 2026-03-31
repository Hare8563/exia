import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useKAGScenarioStore } from '@/states/kagScenarioStore'
import { useKAGScenarioManager } from '@/components/modules/Message/hooks/useKAGScenarioManager'
import { loadClickableMapDefinition, loadClickableMapImage, type ParsedClickableMap } from '@/utils/clickableMap'

export const ClickableMap: React.FC = () => {
  const clickableMap = useKAGScenarioStore(s => s.uiState.clickableMap)
  const setFrame = useKAGScenarioStore(s => s.setFrame)
  const { executeClickableMapAction } = useKAGScenarioManager()
  const [definition, setDefinition] = useState<ParsedClickableMap | null>(null)
  const [mapImage, setMapImage] = useState<HTMLImageElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    let disposed = false

    if (!clickableMap.enabled || !clickableMap.image || !clickableMap.action) {
      setDefinition(null)
      setMapImage(null)
      return
    }

    void Promise.all([
      loadClickableMapDefinition(clickableMap.action),
      loadClickableMapImage(clickableMap.image),
    ]).then(([parsedDefinition, loadedImage]) => {
      if (disposed) return
      setDefinition(parsedDefinition)
      setMapImage(loadedImage)
      if (!parsedDefinition) {
        console.warn('[ClickableMap] action file not found', { action: clickableMap.action })
      }
      if (!loadedImage) {
        console.warn('[ClickableMap] image file not found', { image: clickableMap.image })
      }
    })

    return () => {
      disposed = true
    }
  }, [clickableMap.action, clickableMap.enabled, clickableMap.image])

  useEffect(() => {
    if (!mapImage) return
    const canvas = document.createElement('canvas')
    canvas.width = mapImage.naturalWidth
    canvas.height = mapImage.naturalHeight
    const context = canvas.getContext('2d', { willReadFrequently: true })
    if (!context) return
    context.drawImage(mapImage, 0, 0)
    canvasRef.current = canvas
  }, [mapImage])

  const isFullscreenBaseMap = useMemo(
    () => clickableMap.layer === 'base' && clickableMap.page !== 'back',
    [clickableMap.layer, clickableMap.page]
  )

  if (!clickableMap.enabled || !definition || !mapImage || !isFullscreenBaseMap) {
    return null
  }

  const handleDisable = () => {
    setFrame({
      uiState: {
        ...useKAGScenarioStore.getState().uiState,
        clickableMap: {
          ...useKAGScenarioStore.getState().uiState.clickableMap,
          enabled: false,
        },
      },
    })
  }

  const handleClick = async (event: React.MouseEvent<HTMLDivElement>) => {
    event.stopPropagation()
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = event.currentTarget.getBoundingClientRect()
    if (rect.width <= 0 || rect.height <= 0) return

    const x = Math.max(0, Math.min(canvas.width - 1, Math.floor(((event.clientX - rect.left) / rect.width) * canvas.width)))
    const y = Math.max(0, Math.min(canvas.height - 1, Math.floor(((event.clientY - rect.top) / rect.height) * canvas.height)))
    const context = canvas.getContext('2d', { willReadFrequently: true })
    if (!context) return
    const pixel = context.getImageData(x, y, 1, 1).data
    const regionId = pixel[0]

    if (regionId === 0) return
    const action = definition.actions[regionId]
    if (!action) return

    if (definition.autodisable) {
      handleDisable()
    }

    await executeClickableMapAction(action)
  }

  return (
    <div
      className="absolute inset-0 z-30 pointer-events-auto"
      onClick={event => { void handleClick(event) }}
    />
  )
}

export default ClickableMap
