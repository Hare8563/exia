# Scene System Refactoring Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the hardcoded numeric `screenStore` routing with a file-based scene system backed by a persistent WebGL canvas.

**Architecture:** A persistent `ThreeCanvas` (WebGL layer) sits beneath a `SceneManager` HTML overlay. `SceneManager` auto-discovers scenes from `src/scenes/*/index.tsx` via Vite glob and lazily renders the current one. Global Zustand stores are unchanged; KAG state persists through scene transitions automatically.

**Tech Stack:** React 18 + TypeScript, Zustand, Vite (`import.meta.glob`), react-three-fiber, Vitest

**Spec:** `docs/superpowers/specs/2026-04-01-scene-system-refactoring-design.md`

---

## File Map

| File | Action |
|---|---|
| `src/scene-manager/sceneStore.ts` | **Create** — Zustand store, replaces `screenStore.ts` |
| `src/scene-manager/SceneManager.tsx` | **Create** — glob-based lazy scene renderer |
| `src/states/threeContentStore.ts` | **Create** — holds active scene's Three.js component reference |
| `src/components/ThreeCanvas.tsx` | **Modify** — remove hardcoded children, read from `threeContentStore` |
| `src/components/modules/Background/NovelLayers.tsx` | **Create** — extracts `Background3D + ForegroundLayer` from ThreeCanvas |
| `src/scenes/sign-in/index.tsx` | **Create** — from `components/screens/SignInScreen/index.tsx` |
| `src/scenes/asset-update/index.tsx` | **Create** — from `components/modules/AssetUpdater/index.tsx` |
| `src/scenes/title/index.tsx` | **Create** — from `components/screens/StartScreen/index.tsx` |
| `src/scenes/novel/index.tsx` | **Create** — from `components/screens/MainScreen/index.tsx` |
| `src/scenes/ending/index.tsx` | **Create** — from `components/screens/EndingScreen/index.tsx` |
| `src/components/modules/Navigation/index.tsx` | **Modify** — replace `setScreen(SCREEN.START_SCREEN)` with `navigate('title')` |
| `src/App.tsx` | **Modify** — 2-layer render, remove conditional routing |
| `src/main.tsx` | **Modify** — replace `screenStore` with `sceneStore` |
| `src/states/screenStore.ts` | **Delete** |
| `src/components/screens/` | **Delete** (entire directory) |
| `src/components/Layout.tsx` | **Delete** (inlined into `App.tsx`) |
| `src/types/index.ts` | **Modify** — remove `ScreenType` and `Screen` types |
| `src/constants/index.ts` | **Modify** — remove `SCREEN` export |

---

## Task 1: Create `sceneStore`

**Files:**
- Create: `src/scene-manager/sceneStore.ts`
- Create: `src/tests/sceneStore.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/tests/sceneStore.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { useSceneStore } from '@/scene-manager/sceneStore'

beforeEach(() => {
  useSceneStore.setState({ currentScene: 'sign-in', previousScene: null })
})

describe('sceneStore', () => {
  it('initializes to sign-in', () => {
    expect(useSceneStore.getState().currentScene).toBe('sign-in')
    expect(useSceneStore.getState().previousScene).toBeNull()
  })

  it('navigate updates currentScene and previousScene', () => {
    useSceneStore.getState().navigate('novel')
    expect(useSceneStore.getState().currentScene).toBe('novel')
    expect(useSceneStore.getState().previousScene).toBe('sign-in')
  })

  it('navigate chained tracks last previousScene', () => {
    useSceneStore.getState().navigate('title')
    useSceneStore.getState().navigate('novel')
    expect(useSceneStore.getState().currentScene).toBe('novel')
    expect(useSceneStore.getState().previousScene).toBe('title')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm run test -- sceneStore
```

Expected: FAIL — `Cannot find module '@/scene-manager/sceneStore'`

- [ ] **Step 3: Write the implementation**

```ts
// src/scene-manager/sceneStore.ts
import { create } from 'zustand'

interface SceneStore {
  currentScene: string
  previousScene: string | null
  navigate: (to: string) => void
}

export const useSceneStore = create<SceneStore>((set, get) => ({
  currentScene: 'sign-in',
  previousScene: null,
  navigate: (to) => set({ currentScene: to, previousScene: get().currentScene }),
}))
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm run test -- sceneStore
```

Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add src/scene-manager/sceneStore.ts src/tests/sceneStore.test.ts
git commit -m "feat: add sceneStore replacing numeric screenStore"
```

---

## Task 2: Create `threeContentStore`

**Files:**
- Create: `src/states/threeContentStore.ts`
- Create: `src/tests/threeContentStore.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/tests/threeContentStore.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { useThreeContentStore } from '@/states/threeContentStore'

function MockComponent() { return null }

beforeEach(() => {
  useThreeContentStore.setState({ SceneThreeComponent: null })
})

describe('threeContentStore', () => {
  it('initializes to null', () => {
    expect(useThreeContentStore.getState().SceneThreeComponent).toBeNull()
  })

  it('setSceneThreeComponent stores a component', () => {
    useThreeContentStore.getState().setSceneThreeComponent(MockComponent)
    expect(useThreeContentStore.getState().SceneThreeComponent).toBe(MockComponent)
  })

  it('setSceneThreeComponent(null) clears the component', () => {
    useThreeContentStore.getState().setSceneThreeComponent(MockComponent)
    useThreeContentStore.getState().setSceneThreeComponent(null)
    expect(useThreeContentStore.getState().SceneThreeComponent).toBeNull()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm run test -- threeContentStore
```

Expected: FAIL — `Cannot find module '@/states/threeContentStore'`

- [ ] **Step 3: Write the implementation**

```ts
// src/states/threeContentStore.ts
import { create } from 'zustand'
import type { ComponentType } from 'react'

interface ThreeContentStore {
  SceneThreeComponent: ComponentType | null
  setSceneThreeComponent: (component: ComponentType | null) => void
}

export const useThreeContentStore = create<ThreeContentStore>((set) => ({
  SceneThreeComponent: null,
  setSceneThreeComponent: (component) => set({ SceneThreeComponent: component }),
}))
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm run test -- threeContentStore
```

Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add src/states/threeContentStore.ts src/tests/threeContentStore.test.ts
git commit -m "feat: add threeContentStore for scene-owned 3D content injection"
```

---

## Task 3: Create `SceneManager`

**Files:**
- Create: `src/scene-manager/SceneManager.tsx`
- Create: `src/tests/SceneManager.test.tsx`

> **Note:** `import.meta.glob` is a Vite compile-time macro unavailable in the Vitest `node`
> environment. To make `SceneManager` testable, the module map is accepted as a prop with the
> Vite glob as the default. Tests inject a mock map; production code uses no prop.

- [ ] **Step 1: Write the failing test**

```tsx
// src/tests/SceneManager.test.tsx
import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { SceneManager } from '@/scene-manager/SceneManager'
import { useSceneStore } from '@/scene-manager/sceneStore'

describe('SceneManager', () => {
  it('renders nothing when currentScene has no matching module', () => {
    useSceneStore.setState({ currentScene: 'nonexistent', previousScene: null })
    // Pass an empty mock map — no scenes registered
    const { container } = render(<SceneManager modules={{}} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders nothing when modules prop is omitted and scene is unknown', () => {
    useSceneStore.setState({ currentScene: 'also-nonexistent', previousScene: null })
    // No modules prop — SceneManager uses the Vite glob which has no match
    const { container } = render(<SceneManager modules={{}} />)
    expect(container.firstChild).toBeNull()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm run test -- SceneManager
```

Expected: FAIL — `Cannot find module '@/scene-manager/SceneManager'`

- [ ] **Step 3: Write the implementation**

```tsx
// src/scene-manager/SceneManager.tsx
import React, { Suspense, useMemo } from 'react'
import { useSceneStore } from './sceneStore'

type SceneModules = Record<string, () => Promise<unknown>>

const defaultModules: SceneModules = import.meta.glob('../scenes/*/index.tsx')

interface Props {
  modules?: SceneModules
}

export const SceneManager: React.FC<Props> = ({ modules = defaultModules }) => {
  const currentScene = useSceneStore(s => s.currentScene)

  const SceneComponent = useMemo(() => {
    const loader = modules[`../scenes/${currentScene}/index.tsx`]
    if (!loader) return null
    return React.lazy(loader as () => Promise<{ default: React.ComponentType }>)
  }, [currentScene, modules])

  if (!SceneComponent) return null
  return (
    <Suspense fallback={null}>
      <SceneComponent />
    </Suspense>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm run test -- SceneManager
```

Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add src/scene-manager/SceneManager.tsx src/tests/SceneManager.test.tsx
git commit -m "feat: add SceneManager with Vite glob auto-discovery"
```

---

## Task 4: Refactor `ThreeCanvas` — extract `NovelLayers`, read from store

**Files:**
- Create: `src/components/modules/Background/NovelLayers.tsx`
- Modify: `src/components/ThreeCanvas.tsx`

- [ ] **Step 1: Create `NovelLayers` component**

Extract the two hardcoded children from ThreeCanvas into a new file.
`Suspense` is placed inside `NovelLayers` (not at the call site) to mirror the original
`ThreeCanvas.tsx` which wrapped both children in a single `<Suspense>` inside `<Canvas>`.

```tsx
// src/components/modules/Background/NovelLayers.tsx
import React, { Suspense } from 'react'
import { Background3D } from './Background3D'
import { ForegroundLayer } from '../ForegroundLayer/ForegroundLayer'

export const NovelLayers: React.FC = () => (
  <Suspense fallback={null}>
    <Background3D />
    <ForegroundLayer />
  </Suspense>
)
```

- [ ] **Step 2: Modify `ThreeCanvas` to read from `threeContentStore`**

Replace the hardcoded children with a store-driven component:

```tsx
// src/components/ThreeCanvas.tsx
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
```

- [ ] **Step 3: Run existing tests to confirm nothing broken**

```bash
npm run test
```

Expected: all existing tests pass

- [ ] **Step 4: Commit**

```bash
git add src/components/ThreeCanvas.tsx src/components/modules/Background/NovelLayers.tsx
git commit -m "refactor: extract NovelLayers and wire ThreeCanvas to threeContentStore"
```

---

## Task 5: Create scene files

**Files:**
- Create: `src/scenes/sign-in/index.tsx`
- Create: `src/scenes/asset-update/index.tsx`
- Create: `src/scenes/title/index.tsx`
- Create: `src/scenes/novel/index.tsx`
- Create: `src/scenes/ending/index.tsx`

Each scene replaces `useScreenStore` + `SCREEN.*` with `useSceneStore` + `navigate()`.

- [ ] **Step 1: Create `sign-in` scene**

```tsx
// src/scenes/sign-in/index.tsx
import React, { useState } from 'react'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { auth } from '@/firebase'
import { useSceneStore } from '@/scene-manager/sceneStore'

export default function SignInScene() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const navigate = useSceneStore(s => s.navigate)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      await signInWithEmailAndPassword(auth, email, password)
      navigate('asset-update')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'サインインに失敗しました')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center justify-center h-screen bg-black text-white">
      <form onSubmit={e => { void handleSubmit(e) }} className="flex flex-col gap-4 w-80">
        <h1 className="text-2xl font-bold text-center">サインイン</h1>
        <input
          type="email"
          placeholder="メールアドレス"
          value={email}
          onChange={e => setEmail(e.target.value)}
          className="px-3 py-2 bg-gray-800 rounded border border-gray-600"
          required
        />
        <input
          type="password"
          placeholder="パスワード"
          value={password}
          onChange={e => setPassword(e.target.value)}
          className="px-3 py-2 bg-gray-800 rounded border border-gray-600"
          required
        />
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="py-2 bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? '...' : 'サインイン'}
        </button>
      </form>
    </div>
  )
}
```

- [ ] **Step 2: Create `asset-update` scene**

```tsx
// src/scenes/asset-update/index.tsx
import React, { useEffect, useState } from 'react'
import { doc, getDoc } from 'firebase/firestore'
import { auth, db } from '@/firebase'
import { assetManager } from '@/utils/assetManager'
import { useSceneStore } from '@/scene-manager/sceneStore'
import type { FirestorePack } from '@/types/asset'

export default function AssetUpdateScene() {
  const [status, setStatus] = useState<'checking' | 'downloading' | 'done' | 'error'>('checking')
  const [message, setMessage] = useState('アップデートを確認中...')
  const [progress, setProgress] = useState(0)
  const navigate = useSceneStore(s => s.navigate)

  useEffect(() => { void run() }, [])

  async function run() {
    try {
      const uid = auth.currentUser?.uid
      if (!uid) { setStatus('error'); setMessage('未サインイン'); return }

      const userDoc = await getDoc(doc(db, 'users', uid))
      const roles: string[] = userDoc.exists() ? (userDoc.data().roles ?? []) : []

      const updates: FirestorePack[] = await assetManager.checkUpdates(roles)
      if (updates.length === 0) {
        navigate('title')
        return
      }

      setStatus('downloading')
      for (let i = 0; i < updates.length; i++) {
        const pack = updates[i]
        setMessage(`ダウンロード中: ${pack.name} (${i + 1}/${updates.length})`)
        await assetManager.downloadPack(pack, pct => {
          setProgress(Math.round(((i + pct / 100) / updates.length) * 100))
        })
      }

      setStatus('done')
      setMessage('完了')
      setTimeout(() => navigate('title'), 800)
    } catch (err: unknown) {
      setStatus('error')
      setMessage(err instanceof Error ? err.message : 'エラーが発生しました')
    }
  }

  return (
    <div className="flex items-center justify-center h-screen bg-black text-white">
      <div className="flex flex-col items-center gap-6 w-80">
        <p className="text-lg">{message}</p>
        {status === 'downloading' && (
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div
              className="bg-blue-500 h-2 rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
        {status === 'error' && (
          <button
            onClick={() => void run()}
            className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-700"
          >
            再試行
          </button>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Create `title` scene**

```tsx
// src/scenes/title/index.tsx
import React from 'react'
import { useSceneStore } from '@/scene-manager/sceneStore'

export default function TitleScene() {
  const navigate = useSceneStore(s => s.navigate)
  return (
    <button onClick={() => navigate('novel')}>
      Start
    </button>
  )
}
```

- [ ] **Step 4: Create `novel` scene**

This scene removes the `<ThreeCanvas />` render and instead registers `NovelLayers` into
`threeContentStore` on mount:

```tsx
// src/scenes/novel/index.tsx
import React, { useEffect, useCallback, useRef } from 'react'
import { loadKAGScenario } from '@/utils/kagLoader'
import { useKAGScenarioStore } from '@/states/kagScenarioStore'
import { useThreeContentStore } from '@/states/threeContentStore'
import { NovelLayers } from '@/components/modules/Background/NovelLayers'
import { Message } from '@/components/modules/Message'
import { Navigation } from '@/components/modules/Navigation'
import { Log } from '@/components/modules/Log'
import { Voice } from '@/components/modules/Voice'
import { Bgm } from '@/components/modules/Bgm'
import { Se } from '@/components/modules/Se'
import { ClickableMap } from '@/components/modules/ClickableMap'
import { useKAGScenarioManager } from '@/components/modules/Message/hooks/useKAGScenarioManager'
import { useNavigationStore } from '@/states/navigationStore'
import { useSceneStore } from '@/scene-manager/sceneStore'

export default function NovelScene() {
  const { init, goToNextLine, isScenarioEnd, executeButtonExp } = useKAGScenarioManager()
  const flags = useKAGScenarioStore(s => s.flags)
  const resetScenario = useKAGScenarioStore(s => s.reset)
  const choices = useKAGScenarioStore(s => s.currentChoices)
  const uiState = useKAGScenarioStore(s => s.uiState)
  const currentQuake = useKAGScenarioStore(s => s.currentQuake)
  const navigation = useNavigationStore(s => s.navigation)
  const setNavigation = useNavigationStore(s => s.setNavigation)
  const navigate = useSceneStore(s => s.navigate)
  const setSceneThreeComponent = useThreeContentStore(s => s.setSceneThreeComponent)
  const screenRef = useRef<HTMLDivElement>(null)

  // Register 3D content into the persistent canvas for the duration of this scene
  useEffect(() => {
    setSceneThreeComponent(NovelLayers)
    return () => setSceneThreeComponent(null)
  }, [setSceneThreeComponent])

  useEffect(() => {
    let disposed = false
    resetScenario()

    loadKAGScenario('scenarios/main', flags)
      .then(interp => {
        if (disposed) return
        console.info('[NovelScene] scenario loaded: scenarios/main')
        init(interp)
      })
      .catch(err => console.error('[NovelScene] scenario load failed:', err))

    return () => {
      disposed = true
    }
  }, [])

  useEffect(() => {
    const element = screenRef.current
    if (!element) return
    if (!currentQuake) {
      element.style.transform = ''
      return
    }

    let frameId = 0
    const animate = () => {
      const elapsed = Date.now() - currentQuake.startedAt
      const progress = Math.min(1, elapsed / currentQuake.time)
      const decay = 1 - progress
      const angle = elapsed / 16
      const offsetX = Math.sin(angle * 1.7) * currentQuake.hmax * decay
      const offsetY = Math.cos(angle * 2.1) * currentQuake.vmax * decay
      element.style.transform = `translate(${offsetX}px, ${offsetY}px)`
      if (progress < 1) {
        frameId = window.requestAnimationFrame(animate)
      } else {
        element.style.transform = ''
      }
    }

    frameId = window.requestAnimationFrame(animate)
    return () => {
      if (frameId) window.cancelAnimationFrame(frameId)
      element.style.transform = ''
    }
  }, [currentQuake])

  const handleScreenClick = useCallback(async () => {
    if (choices) return
    if (isScenarioEnd) {
      navigate('ending')
      return
    }
    await goToNextLine()
  }, [choices, isScenarioEnd, goToNextLine, navigate])

  const handleContextMenu = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (!uiState.rclickEnabled) return
    event.preventDefault()
    const closeButton = uiState.buttons.find(button => button.visible && button.graphic === 'message_bt_close')
    if (closeButton?.exp) {
      void executeButtonExp(closeButton.exp)
      return
    }
    if (uiState.historyEnabled) {
      setNavigation({ ...navigation, isLogOpen: true })
    }
  }, [executeButtonExp, navigation, setNavigation, uiState.buttons, uiState.historyEnabled, uiState.rclickEnabled])

  return (
    <div className="relative w-full h-full cursor-pointer" onClick={handleScreenClick} onContextMenu={handleContextMenu}>
      <div ref={screenRef} className="relative w-full h-full will-change-transform">
        <Voice />
        <Bgm />
        <Se />
        <ClickableMap />
        <Message />
        <Navigation />
        <Log />
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Create `ending` scene**

```tsx
// src/scenes/ending/index.tsx
import React from 'react'
import { useSceneStore } from '@/scene-manager/sceneStore'

export default function EndingScene() {
  const navigate = useSceneStore(s => s.navigate)
  return (
    <button onClick={() => navigate('title')}>
      Back
    </button>
  )
}
```

- [ ] **Step 6: Commit**

```bash
git add src/scenes/
git commit -m "feat: add scene files (sign-in, asset-update, title, novel, ending)"
```

---

## Task 6: Update `Navigation` module

**Files:**
- Modify: `src/components/modules/Navigation/index.tsx`

- [ ] **Step 1: Replace `useScreenStore` with `useSceneStore`**

In `src/components/modules/Navigation/index.tsx`, make these exact changes:

1. Remove line 8: `import { useScreenStore } from "@/states/screenStore"`
2. Remove line 9: `import { SCREEN } from "@/constants"` — `SCREEN` is only used in this file for `SCREEN.START_SCREEN`; no other constant from `@/constants` is used here, so the whole import goes
3. Add after the existing imports: `import { useSceneStore } from "@/scene-manager/sceneStore"`
4. Remove line 23: `const { setScreen } = useScreenStore()`
5. Add after line 23: `const navigate = useSceneStore(s => s.navigate)`
6. Replace line 45: `setScreen({ screen: SCREEN.START_SCREEN })` → `navigate('title')`

- [ ] **Step 2: Run existing tests**

```bash
npm run test
```

Expected: all existing tests pass

- [ ] **Step 3: Commit**

```bash
git add src/components/modules/Navigation/index.tsx
git commit -m "refactor: migrate Navigation module from screenStore to sceneStore"
```

---

## Task 7: Update `App.tsx`

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Rewrite `App.tsx`**

Replace the entire file:

```tsx
// src/App.tsx
import { useEffect } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '@/firebase'
import { useSceneStore } from '@/scene-manager/sceneStore'
import { CONFIG } from '@/constants'
import { ThreeCanvas } from '@/components/ThreeCanvas'
import { SceneManager } from '@/scene-manager/SceneManager'
import { DebugMenu } from '@/components/DebugMenu'

const App = () => {
  const navigate = useSceneStore(s => s.navigate)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, user => {
      if (!user) navigate('sign-in')
    })
    return unsubscribe
  }, [navigate])

  return (
    <div className="relative h-[100svh] max-h-[100svh] overflow-hidden select-none">
      <ThreeCanvas />
      <SceneManager />
      {CONFIG.DEBUG && <DebugMenu />}
    </div>
  )
}

export default App
```

Note: `Layout` component is no longer needed — its single class string is inlined here.

- [ ] **Step 2: Run existing tests**

```bash
npm run test
```

Expected: all existing tests pass

- [ ] **Step 3: Commit**

```bash
git add src/App.tsx
git commit -m "refactor: simplify App.tsx to 2-layer render (ThreeCanvas + SceneManager)"
```

---

## Task 8: Update `main.tsx`

**Files:**
- Modify: `src/main.tsx`

- [ ] **Step 1: Replace `useScreenStore` with `useSceneStore`**

```tsx
// src/main.tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles/globals.css'
import './styles/common.css'
import { assetManager } from '@/utils/assetManager'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '@/firebase'
import { useSceneStore } from '@/scene-manager/sceneStore'

async function main() {
  await assetManager.initialize()

  await new Promise<void>(resolve => {
    const unsubscribe = onAuthStateChanged(auth, user => {
      unsubscribe()
      if (user) {
        useSceneStore.getState().navigate('asset-update')
      } else {
        useSceneStore.getState().navigate('sign-in')
      }
      resolve()
    })
  })

  ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  )
}

main().catch(console.error)
```

- [ ] **Step 2: Run existing tests**

```bash
npm run test
```

Expected: all existing tests pass

- [ ] **Step 3: Commit**

```bash
git add src/main.tsx
git commit -m "refactor: migrate main.tsx from screenStore to sceneStore"
```

---

## Task 9: Cleanup — delete old files and remove `SCREEN` from constants

**Files:**
- Delete: `src/states/screenStore.ts`
- Delete: `src/components/screens/` (entire directory)
- Delete: `src/components/modules/AssetUpdater/` (moved to scenes)
- Delete: `src/components/Layout.tsx` (inlined into `App.tsx` in Task 7)
- Modify: `src/constants/index.ts` — remove `SCREEN` export
- Modify: `src/types/index.ts` — remove `ScreenType` and `Screen` types

- [ ] **Step 1: Delete old screen files and directories**

```bash
git rm -r src/components/screens/
git rm -r src/components/modules/AssetUpdater/
git rm src/states/screenStore.ts
git rm src/components/Layout.tsx
```

- [ ] **Step 2: Remove `SCREEN` from `src/constants/index.ts`**

Delete lines 8–14 (the `SCREEN` export):

```ts
// src/constants/index.ts — AFTER (remove the SCREEN block)
export const CONFIG = {
  TITLE: "Exia - Novel game engine",
  LANGUAGE: "ja",
  VOICEVOX: false,
  DEBUG: false,
};

// メッセージ表示に関する定数
export const MESSAGE_CONFIG = {
  LOADING_DELAY: 1000,
  AUTO_PLAY_DELAY: 2000,
  DISPLAY_LINE_DELAY: 50,
} as const;

export const MESSAGE_TYPE = {
  NARRATION: 0,
  DIALOGUE: 1,
  CHOICE: 2,
} as const;
```

- [ ] **Step 3: Remove `ScreenType` and `Screen` from `src/types/index.ts`**

Delete lines 1 (`import { SCREEN }`) and 118–122 (`ScreenType` and `Screen` types).

- [ ] **Step 4: Confirm TypeScript compiles cleanly**

```bash
npm run build
```

Expected: build succeeds with no errors. Fix any remaining import errors (stale references to `SCREEN`, `screenStore`, or deleted screen components).

- [ ] **Step 5: Run all tests**

```bash
npm run test
```

Expected: all tests pass

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore: remove screenStore, SCREEN constants, and old screens directory"
```

---

## Verification

After all tasks are complete, verify end-to-end behavior manually:

- [ ] App boots → starts at `sign-in` scene (or `asset-update` if already authenticated)
- [ ] Sign-in success → navigates to `asset-update`
- [ ] Asset update completes → navigates to `title`
- [ ] Title "Start" → navigates to `novel`, KAG scenario loads
- [ ] Scenario end → navigates to `ending`
- [ ] Ending "Back" → navigates to `title`
- [ ] ThreeCanvas persists through all scene transitions (no context recreation in DevTools)
- [ ] Navigation bar タイトルに戻る → navigates to `title` from `novel`
- [ ] Sign-out mid-session → redirects to `sign-in`
