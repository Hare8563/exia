// src/components/modules/Background/Background3D.tsx
import { useRef, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useTexture } from '@react-three/drei'
import * as THREE from 'three'
import { useKAGScenarioStore } from '@/states/kagScenarioStore'

const FADE_SPEED = 3   // crossfade animation speed

function BackgroundMesh({ file, opacity, onFadeComplete }: {
  file: string
  opacity: number
  onFadeComplete?: () => void
}) {
  const matRef = useRef<THREE.MeshBasicMaterial>(null)
  const { viewport } = useThree()
  const texture = useTexture(`/images/backgrounds/${file}`)

  // Object-cover: fill viewport
  const img = texture.image as HTMLImageElement | null
  const texAspect = img?.width && img?.height
    ? img.width / img.height : 16 / 9
  const vpAspect = viewport.width / viewport.height
  const [sx, sy] = texAspect > vpAspect
    ? [viewport.height * texAspect, viewport.height]
    : [viewport.width, viewport.width / texAspect]

  useFrame((_, delta) => {
    if (!matRef.current) return
    const alpha = 1 - Math.exp(-delta * FADE_SPEED)
    const newOpacity = THREE.MathUtils.lerp(matRef.current.opacity, opacity, alpha)
    matRef.current.opacity = newOpacity
    if (Math.abs(newOpacity - opacity) < 0.01) {
      matRef.current.opacity = opacity
      if (opacity === 0 || opacity === 1) onFadeComplete?.()
    }
  })

  return (
    <mesh position={[0, 0, 0]}>
      <planeGeometry args={[sx, sy]} />
      <meshBasicMaterial ref={matRef} map={texture} transparent opacity={opacity} />
    </mesh>
  )
}

export function Background3D() {
  const layer = useKAGScenarioStore(s => s.layers.find(l => l.id === 'base'))
  const transition = useKAGScenarioStore(s => s.currentTransition)
  const isWaiting = useKAGScenarioStore(s => s.isWaitingTransition)

  const prevFileRef = useRef<string | undefined>(undefined)
  const currentFile = layer?.file

  // When a new file arrives with a transition, show crossfade
  const isTransitioning = isWaiting && transition?.method === 'crossfade' &&
    prevFileRef.current !== undefined && prevFileRef.current !== currentFile

  useEffect(() => {
    if (currentFile && !isWaiting) {
      prevFileRef.current = currentFile
    }
  }, [currentFile, isWaiting])

  // Read transition callback from store (set by useKAGScenarioManager)
  const handleFadeComplete = () => {
    useKAGScenarioStore.getState().transitionCompleteCallback?.()
  }

  if (!currentFile) return null

  return (
    <>
      {/* Previous background fades out */}
      {isTransitioning && prevFileRef.current && (
        <BackgroundMesh file={prevFileRef.current} opacity={0} />
      )}
      {/* Current background fades in */}
      <BackgroundMesh
        file={currentFile}
        opacity={1}
        onFadeComplete={isTransitioning ? handleFadeComplete : undefined}
      />
    </>
  )
}
