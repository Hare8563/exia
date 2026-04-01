import React from 'react'
import { Canvas } from '@react-three/fiber'
import { useThreeContentStore } from '@/states/threeContentStore'

export const ThreeCanvas: React.FC = () => {
  const SceneThreeComponent = useThreeContentStore(s => s.SceneThreeComponent)
  return (
    <div className="absolute inset-0 z-0" style={{ pointerEvents: 'none' }}>
      <Canvas
        dpr={1}
        camera={{ position: [0, 0, 5], fov: 45 }}
        gl={{
          antialias: false,
          alpha: false,
          powerPreference: 'high-performance',
          preserveDrawingBuffer: false,
        }}
        onCreated={({ gl }) => {
          const canvas = gl.domElement
          canvas.addEventListener('webglcontextlost', event => {
            console.error('[ThreeCanvas] webglcontextlost', { type: event.type })
          })
          canvas.addEventListener('webglcontextrestored', event => {
            console.warn('[ThreeCanvas] webglcontextrestored', { type: event.type })
          })
          console.info('[ThreeCanvas] canvas created', {
            maxTextureSize: gl.capabilities.maxTextureSize,
            maxTextures: gl.capabilities.maxTextures,
            dpr: 1,
          })
        }}
        flat
      >
        {SceneThreeComponent && <SceneThreeComponent />}
      </Canvas>
    </div>
  )
}
