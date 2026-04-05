# Title Screen Effects Implementation Plan

> **For Gemini:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Enhance the title screen with a "purple mist" background effect, a blinking "TOUCH TO START" UI, and sound effects.

**Architecture:** Use THREE.js `useFrame` for procedural mist movement and React `useEffect` for sound/UI state. Mist is implemented as semi-transparent drifting planes with a purple tint.

**Tech Stack:** React, THREE.js, @react-three/fiber, @react-three/drei, Tailwind CSS.

---

### Task 1: Add Blink Animation CSS

**Files:**
- Modify: `src/styles/globals.css`

**Step 1: Add the blink keyframes**

Add to the end of `src/styles/globals.css`:
```css
@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}

.animate-blink {
  animation: blink 2s infinite;
}
```

**Step 2: Commit**

```bash
git add src/styles/globals.css
git commit -m "style: add blink animation to globals.css"
```

---

### Task 2: Implement Purple Mist Effect

**Files:**
- Modify: `src/scenes/title/TitleLayers.tsx`

**Step 1: Add Mist component with drifting logic**

Update `src/scenes/title/TitleLayers.tsx`:
```tsx
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
```

**Step 2: Commit**

```bash
git add src/scenes/title/TitleLayers.tsx
git commit -m "feat: add purple mist effect to TitleLayers"
```

---

### Task 3: Update TitleScene UI and Sound

**Files:**
- Modify: `src/scenes/title/index.tsx`

**Step 2: Implement blink class and SE playback**

Update `src/scenes/title/index.tsx`:
- Import `assetManager`
- Add `animate-blink` class to "TOUCH TO START" button
- Play `se_001.wav` on click

```tsx
// ... (imports)
import { assetManager } from '@/utils/assetManager'

export default function TitleScene() {
  const navigate = useSceneStore(s => s.navigate)
  const setSceneThreeComponent = useThreeContentStore(s => s.setSceneThreeComponent)
  const uid = auth.currentUser?.uid ?? 'UID'

  useEffect(() => {
    setSceneThreeComponent(TitleLayers)
    return () => setSceneThreeComponent(null)
  }, [setSceneThreeComponent])

  const handleStart = () => {
    const se = new Audio(assetManager.resolve('se_001.wav', 'sounds/se'))
    se.play().catch(e => console.error("SE play failed", e))
    
    // Transition after a short delay for SE impact
    setTimeout(() => {
      navigate('novel')
    }, 300)
  }

  // ... (handleLogout)

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
      {/* ... (logo/icons) */}

      {/* TOUCH TO START */}
      <button
        onClick={handleStart}
        className="animate-blink"
        style={{
          // ... (styles)
        }}
      >
        TOUCH TO START
      </button>
      
      {/* ... (footer) */}
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add src/scenes/title/index.tsx
git commit -m "feat: add blink effect and click SE to TitleScene"
```
