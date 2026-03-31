import { useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useTexture } from '@react-three/drei'
import * as THREE from 'three'
import { useKAGScenarioStore } from '@/states/kagScenarioStore'
import type { KAGLayer } from '@/types/kag'

const ANIM_SPEED = 8

// Single layer sprite with animated opacity/position/scale
function LayerSprite({ layer }: { layer: KAGLayer }) {
  const meshRef = useRef<THREE.Mesh>(null)
  const matRef = useRef<THREE.MeshBasicMaterial>(null)
  const { viewport } = useThree()

  const imageDir = typeof layer.id === 'number' && layer.id >= 3 ? 'image' : 'fgimage'
  const texture = useTexture(
    layer.file ? `/images/${imageDir}/${layer.file}` : `/images/${imageDir}/placeholder.webp`
  )

  const targetOpacity = layer.visible ? layer.opacity / 255 : 0
  const z = 0.05 + (typeof layer.id === 'number' ? layer.id * 0.01 : 0)

  useFrame((_, delta) => {
    if (!meshRef.current || !matRef.current) return

    // Opacity only: lerp for crossfade effect (as specified by [trans method=crossfade])
    const alpha = 1 - Math.exp(-delta * ANIM_SPEED)
    matRef.current.opacity = THREE.MathUtils.lerp(matRef.current.opacity, targetOpacity, alpha)

    const img = texture.image as HTMLImageElement | undefined
    const imgAspect = img?.width && img?.height ? img.width / img.height : 1
    const isCoverLayer = typeof layer.id === 'number' && layer.id >= 3

    let scaleX: number, scaleY: number
    if (isCoverLayer) {
      const viewAspect = viewport.width / viewport.height
      if (imgAspect >= viewAspect) {
        scaleY = viewport.height * layer.scale
        scaleX = scaleY * imgAspect
      } else {
        scaleX = viewport.width * layer.scale
        scaleY = scaleX / imgAspect
      }
    } else {
      // Foot-anchored: sprite fills from top= down to screen bottom
      scaleY = layer.scale * (1.0 - layer.y / 1080) * viewport.height
      scaleX = scaleY * imgAspect
    }

    // Snap scale and position immediately (no lerp) — only opacity animates
    meshRef.current.scale.set(scaleX, scaleY, 1)

    // X: left edge in KAG px on 1920-wide canvas
    // Y: bottom-anchored — sprite bottom at screen bottom edge
    const posX = (layer.x / 1920) * viewport.width - viewport.width / 2 + scaleX / 2
    const posY = -viewport.height / 2 + scaleY / 2
    meshRef.current.position.set(posX, posY, z)
  })

  return (
    <mesh ref={meshRef}>
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial
        ref={matRef}
        map={texture}
        transparent
        opacity={targetOpacity}
      />
    </mesh>
  )
}

// Renders all foreground layers (id: 0-9) from the store
export function ForegroundLayer() {
  const layers = useKAGScenarioStore(s => s.layers.filter(l => typeof l.id === 'number'))
  return (
    <>
      {layers.map(layer => (
        layer.file ? (
          <LayerSprite key={layer.id} layer={layer} />
        ) : null
      ))}
    </>
  )
}
