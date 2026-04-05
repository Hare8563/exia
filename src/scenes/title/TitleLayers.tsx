import React, { Suspense, useEffect } from 'react'
import { useThree } from '@react-three/fiber'
import { useTexture } from '@react-three/drei'
import * as THREE from 'three'
import { assetManager } from '@/utils/assetManager'

function CoverMesh() {
  const { viewport } = useThree()
  const texture = useTexture(assetManager.resolve('cover.png', 'images/bgimage'))

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

  return (
    <mesh position={[0, 0, 0]}>
      <planeGeometry args={[sx, sy]} />
      <meshBasicMaterial map={texture} transparent={false} opacity={1} />
    </mesh>
  )
}

export const TitleLayers: React.FC = () => (
  <Suspense fallback={null}>
    <CoverMesh />
  </Suspense>
)
