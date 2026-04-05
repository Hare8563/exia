import React, { Suspense, useEffect, useRef } from 'react'
import { useThree, useFrame } from '@react-three/fiber'
import { useTexture } from '@react-three/drei'
import * as THREE from 'three'
import { assetManager } from '@/utils/assetManager'

function Mist({ color, speed, opacity, scale, offset }: { 
  color: string, 
  speed: number, 
  opacity: number,
  scale: number,
  offset: [number, number, number]
}) {
  const meshRef = useRef<THREE.Mesh>(null)
  const { viewport } = useThree()

  useFrame((state) => {
    if (!meshRef.current) return
    const t = state.clock.getElapsedTime()
    // Drifting motion
    meshRef.current.position.x = offset[0] + Math.sin(t * speed * 0.5) * 0.5
    meshRef.current.position.y = offset[1] + Math.cos(t * speed * 0.8) * 0.2
    // Slight pulsing
    meshRef.current.scale.setScalar(scale + Math.sin(t * speed) * 0.05)
  })

  return (
    <mesh ref={meshRef} position={offset}>
      <planeGeometry args={[viewport.width * 1.5, viewport.height * 1.5]} />
      <meshBasicMaterial 
        color={color} 
        transparent 
        opacity={opacity} 
        depthTest={false}
      />
    </mesh>
  )
}

function CoverMesh() {
  const { viewport } = useThree()
  const texture = useTexture(assetManager.resolve('cover.png', 'images/bgimage'))

  useEffect(() => {
    if (texture) {
      texture.generateMipmaps = false
      texture.minFilter = THREE.LinearFilter
      texture.magFilter = THREE.LinearFilter
      texture.wrapS = THREE.ClampToEdgeWrapping
      texture.wrapT = THREE.ClampToEdgeWrapping
      texture.needsUpdate = true
    }
  }, [texture])

  const img = texture.image as HTMLImageElement | null
  const texAspect = img?.width && img?.height ? img.width / img.height : 16 / 9
  const vpAspect = viewport.width / viewport.height
  const [sx, sy] = texAspect > vpAspect
    ? [viewport.height * texAspect, viewport.height]
    : [viewport.width, viewport.width / texAspect]

  return (
    <group>
      <mesh position={[0, 0, 0]}>
        <planeGeometry args={[sx, sy]} />
        <meshBasicMaterial map={texture} transparent opacity={1} />
      </mesh>
      {/* Mist layers */}
      <Mist color="#a855f7" speed={0.2} opacity={0.05} scale={1.0} offset={[0, 0, 0.1]} />
      <Mist color="#7e22ce" speed={0.15} opacity={0.03} scale={1.2} offset={[0.5, -0.2, 0.2]} />
    </group>
  )
}

export const TitleLayers: React.FC = () => (
  <Suspense fallback={null}>
    <CoverMesh />
  </Suspense>
)
