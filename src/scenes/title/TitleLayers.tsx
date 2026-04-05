import React, { Suspense, useEffect, useRef, useMemo } from 'react'
import { useThree, useFrame } from '@react-three/fiber'
import { useTexture } from '@react-three/drei'
import * as THREE from 'three'
import { assetManager } from '@/utils/assetManager'

function Particles({ count = 150 }) {
  const mesh = useRef<THREE.Points>(null)
  
  // Create a circular texture for particles
  const particleTexture = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 64
    canvas.height = 64
    const ctx = canvas.getContext('2d')
    if (ctx) {
      const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32)
      gradient.addColorStop(0, 'rgba(255, 255, 255, 1)')
      gradient.addColorStop(0.2, 'rgba(255, 255, 255, 0.8)')
      gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.3)')
      gradient.addColorStop(1, 'rgba(255, 255, 255, 0)')
      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, 64, 64)
    }
    const tex = new THREE.CanvasTexture(canvas)
    return tex
  }, [])

  const particles = useMemo(() => {
    const positions = new Float32Array(count * 3)
    const speeds = new Float32Array(count)
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 20
      positions[i * 3 + 1] = (Math.random() - 0.5) * 12
      positions[i * 3 + 2] = Math.random() * 4 - 1 // Between -1 and 3
      speeds[i] = Math.random() * 0.1 + 0.05
    }
    return { positions, speeds }
  }, [count])

  useFrame((state) => {
    if (!mesh.current) return
    const t = state.clock.getElapsedTime()
    
    // Slow drift
    mesh.current.position.y = Math.sin(t * 0.2) * 0.2
    mesh.current.rotation.y = t * 0.02
  })

  return (
    <points ref={mesh}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={particles.positions.length / 3}
          array={particles.positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.15}
        color="#fffbeb"
        transparent
        opacity={0.4}
        map={particleTexture}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  )
}

function DriftingLayer({ 
    url, 
    depth, 
    parallaxFactor, 
    scaleFactor = 1.0,
    opacity = 1.0
}: { 
    url: string, 
    depth: number, 
    parallaxFactor: number,
    scaleFactor?: number,
    opacity?: number
}) {
  const meshRef = useRef<THREE.Mesh>(null)
  const { viewport, camera } = useThree()
  const texture = useTexture(url)
  const globalMouse = useRef({ x: 0, y: 0 })

  useEffect(() => {
    if (texture) {
      texture.minFilter = THREE.LinearFilter
      texture.magFilter = THREE.LinearFilter
      texture.needsUpdate = true
    }
  }, [texture])

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      // Normalize to -1 to 1
      globalMouse.current.x = (e.clientX / window.innerWidth) * 2 - 1
      globalMouse.current.y = -(e.clientY / window.innerHeight) * 2 + 1
    }
    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [])

  const img = texture.image as HTMLImageElement | null
  const texAspect = img?.width && img?.height ? img.width / img.height : 16 / 9
  
  // Calculate viewport size specifically at this depth
  const v = viewport.getCurrentViewport(camera, new THREE.Vector3(0, 0, depth))
  const vpAspect = v.width / v.height
  
  // Calculate scale to cover viewport
  let sx, sy
  if (texAspect > vpAspect) {
    sy = v.height * scaleFactor
    sx = sy * texAspect
  } else {
    sx = v.width * scaleFactor
    sy = sx / texAspect
  }

  useFrame((state) => {
    if (!meshRef.current) return
    const t = state.clock.getElapsedTime()
    
    // Target position combines mouse parallax and a subtle time-based drift
    const driftX = Math.sin(t * 0.2) * v.width * 0.01 * parallaxFactor
    const driftY = Math.cos(t * 0.15) * v.height * 0.01 * parallaxFactor
    
    const targetX = (-globalMouse.current.x * v.width * parallaxFactor) + driftX
    const targetY = (-globalMouse.current.y * v.height * parallaxFactor) + driftY
    
    meshRef.current.position.x += (targetX - meshRef.current.position.x) * 0.05
    meshRef.current.position.y += (targetY - meshRef.current.position.y) * 0.05
  })

  return (
    <mesh ref={meshRef} position={[0, 0, depth]}>
      <planeGeometry args={[sx, sy]} />
      <meshBasicMaterial map={texture} transparent={true} opacity={opacity} />
    </mesh>
  )
}

export const TitleLayers: React.FC = () => {
    const bgUrl = assetManager.resolve('cover_bg.png', 'images/bgimage')
    const charUrl = assetManager.resolve('cover_char.png', 'images/bgimage')
    
    return (
        <Suspense fallback={null}>
            {/* Background Layer (Far) */}
            <DriftingLayer 
                url={bgUrl} 
                depth={-5} 
                parallaxFactor={0.01} 
                scaleFactor={1.05}
            />
            {/* Character Layer (Middle) */}
            <DriftingLayer 
                url={charUrl} 
                depth={-2} 
                parallaxFactor={0.03} 
                scaleFactor={1.1} // Increased from 1.0 to prevent edge clipping
            />
            {/* Particles (Floating in front of character) */}
            <Particles count={100} />
            
            {/* Atmosphere Overlay (Subtle Gradient/Mist using BG texture) */}
            <DriftingLayer 
                url={bgUrl}
                depth={0}
                parallaxFactor={0.05}
                scaleFactor={1.2}
                opacity={0.1}
            />

            <ambientLight intensity={0.5} />
            <pointLight position={[5, 5, 5]} intensity={1} />
        </Suspense>
    )
}
