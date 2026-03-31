import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useTexture } from '@react-three/drei'
import * as THREE from 'three'
import { useKAGScenarioStore } from '@/states/kagScenarioStore'
import type { KAGLayer } from '@/types/kag'

const ANIM_SPEED = 8

// Single layer sprite with animated opacity
function LayerSprite({ layer, startOpacity }: { layer: KAGLayer; startOpacity?: number }) {
  const meshRef = useRef<THREE.Mesh>(null)
  const matRef = useRef<THREE.MeshBasicMaterial>(null)
  const { viewport } = useThree()

  const imageDir = typeof layer.id === 'number' && layer.id >= 3 ? 'image' : 'fgimage'
  const texture = useTexture(`/images/${imageDir}/${layer.file}`)

  useEffect(() => {
    // VN sprites are large 2D textures; mipmaps add memory pressure and can
    // trigger WebGL context loss in WebView2 during back/fore crossfades.
    texture.generateMipmaps = false
    texture.minFilter = THREE.LinearFilter
    texture.magFilter = THREE.LinearFilter
    texture.wrapS = THREE.ClampToEdgeWrapping
    texture.wrapT = THREE.ClampToEdgeWrapping
    texture.needsUpdate = true
  }, [texture])

  const targetOpacity = layer.visible ? layer.opacity / 255 : 0
  const z = 0.05 + (typeof layer.id === 'number' ? layer.id * 0.01 : 0)

  useFrame((_, delta) => {
    if (!meshRef.current || !matRef.current) return

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

    meshRef.current.scale.set(scaleX, scaleY, 1)
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
        opacity={startOpacity ?? targetOpacity}
      />
    </mesh>
  )
}

// Renders all foreground layers (id: 0-9) from the store.
// During a crossfade: fore buffer (typically clear2=nothing) is hidden,
// back buffer (the real image) fades in from opacity 0.
export function ForegroundLayer() {
  const layers = useKAGScenarioStore(s => s.layers.filter(l => typeof l.id === 'number'))
  const transition = useKAGScenarioStore(s => s.currentTransition)
  const transitionEntries = transition?.entries ?? []

  // Set of foreground layer ids currently being transitioned
  const transitioningIds = new Set(
    transition?.layers.filter(l => l !== 'base') ?? []
  )

  return (
    <>
      {layers.map(layer => {
        if (!layer.file) return null
        // Hide the fore buffer for layers being transitioned (it's clear2 = transparent)
        if (transitioningIds.has(layer.id as number)) return null
        return <LayerSprite key={layer.id} layer={layer} />
      })}
      {/* Back buffer layers fade in from opacity 0 during transition */}
      {transition && Array.from(transitioningIds).map(id => {
        const entry = transitionEntries.find(candidate => candidate.layer === id)
        const backLayer = transition.backLayers.find(l => l.id === id)
        if (!backLayer?.file) return null
        if (entry && entry.method !== 'crossfade') {
          return <LayerSprite key={`trans-${id}`} layer={backLayer} />
        }
        return <LayerSprite key={`trans-${id}`} layer={backLayer} startOpacity={0} />
      })}
    </>
  )
}
