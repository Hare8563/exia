// src/components/modules/Background/Background3D.tsx
import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useTexture } from '@react-three/drei'
import * as THREE from 'three'
import { useKAGScenarioStore } from '@/states/kagScenarioStore'

const FADE_SPEED = 3   // crossfade animation speed

function BackgroundMesh({ file, startOpacity, targetOpacity, onFadeComplete }: {
  file: string
  startOpacity: number
  targetOpacity: number
  onFadeComplete?: () => void
}) {
  const matRef = useRef<THREE.MeshBasicMaterial>(null)
  const firedRef = useRef(false)
  const { viewport } = useThree()
  const texture = useTexture(`/images/bgimage/${file}`)

  useEffect(() => {
    texture.generateMipmaps = false
    texture.minFilter = THREE.LinearFilter
    texture.magFilter = THREE.LinearFilter
    texture.wrapS = THREE.ClampToEdgeWrapping
    texture.wrapT = THREE.ClampToEdgeWrapping
    texture.needsUpdate = true
  }, [texture])

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
    const newOpacity = THREE.MathUtils.lerp(matRef.current.opacity, targetOpacity, alpha)
    matRef.current.opacity = newOpacity
    if (!firedRef.current && Math.abs(newOpacity - targetOpacity) < 0.01) {
      matRef.current.opacity = targetOpacity
      firedRef.current = true
      onFadeComplete?.()
    }
  })

  return (
    <mesh position={[0, 0, 0]}>
      <planeGeometry args={[sx, sy]} />
      {/* startOpacity sets the THREE material's initial opacity before useFrame takes over */}
      <meshBasicMaterial ref={matRef} map={texture} transparent opacity={startOpacity} />
    </mesh>
  )
}

export function Background3D() {
  const layer = useKAGScenarioStore(s => s.layers.find(l => l.id === 'base'))
  const transition = useKAGScenarioStore(s => s.currentTransition)
  const isWaiting = useKAGScenarioStore(s => s.isWaitingTransition)

  const transitionKeyRef = useRef(0)
  const prevIsWaitingRef = useRef(false)

  // Increment key each time a new wait starts → forces BackgroundMesh to remount → resets firedRef
  if (isWaiting && !prevIsWaitingRef.current) {
    transitionKeyRef.current++
  }
  prevIsWaitingRef.current = isWaiting

  // Read transition callback from store (set by useKAGScenarioManager)
  const handleFadeComplete = () => {
    useKAGScenarioStore.getState().transitionCompleteCallback?.()
  }

  // Use double-buffer snapshots from transition object for crossfade
  const isCrossfade = isWaiting && transition?.method === 'crossfade'
    && transition.layers.includes('base')
  const outgoingFile = isCrossfade
    ? transition!.foreLayers.find(l => l.id === 'base')?.file
    : undefined
  const incomingFile = isCrossfade
    ? transition!.backLayers.find(l => l.id === 'base')?.file
    : layer?.file

  if (!incomingFile && !outgoingFile) return null

  return (
    <>
      {/* Previous background fades out (1→0) using fore buffer snapshot */}
      {isCrossfade && outgoingFile && (
        <BackgroundMesh file={outgoingFile} startOpacity={1} targetOpacity={0} />
      )}
      {/* Incoming background fades in (0→1) using back buffer snapshot, or snaps to 1 if no transition.
          key changes each transition to remount and reset firedRef. */}
      {incomingFile && (
        <BackgroundMesh
          key={transitionKeyRef.current}
          file={incomingFile}
          startOpacity={isCrossfade ? 0 : 1}
          targetOpacity={1}
          onFadeComplete={isWaiting ? handleFadeComplete : undefined}
        />
      )}
    </>
  )
}
