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
  const targetX = (layer.x / 1920) * viewport.width   // normalize from px to viewport
  const targetY = -(layer.y / 1080) * viewport.height
  const z = 0.05 + (typeof layer.id === 'number' ? layer.id * 0.01 : 0)

  useFrame((_, delta) => {
    if (!meshRef.current || !matRef.current) return
    const alpha = 1 - Math.exp(-delta * ANIM_SPEED)
    matRef.current.opacity = THREE.MathUtils.lerp(matRef.current.opacity, targetOpacity, alpha)
    meshRef.current.position.x = THREE.MathUtils.lerp(meshRef.current.position.x, targetX, alpha)
    meshRef.current.position.y = THREE.MathUtils.lerp(meshRef.current.position.y, targetY, alpha)
    meshRef.current.position.z = z
    const img = texture.image as HTMLImageElement | undefined
    const imgAspect = img?.width && img?.height ? img.width / img.height : 1
    const isCoverLayer = typeof layer.id === 'number' && layer.id >= 3
    let targetScaleX: number, targetScaleY: number
    if (isCoverLayer) {
      // Cover: fill entire viewport, crop if needed
      const viewAspect = viewport.width / viewport.height
      if (imgAspect >= viewAspect) {
        targetScaleY = viewport.height * layer.scale
        targetScaleX = targetScaleY * imgAspect
      } else {
        targetScaleX = viewport.width * layer.scale
        targetScaleY = targetScaleX / imgAspect
      }
    } else {
      targetScaleY = layer.scale * (viewport.height * 0.8)
      targetScaleX = targetScaleY * imgAspect
    }
    meshRef.current.scale.y = THREE.MathUtils.lerp(meshRef.current.scale.y, targetScaleY, alpha)
    meshRef.current.scale.x = THREE.MathUtils.lerp(meshRef.current.scale.x, targetScaleX, alpha)
  })

  return (
    <mesh ref={meshRef} position={[targetX, targetY, z]}>
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
