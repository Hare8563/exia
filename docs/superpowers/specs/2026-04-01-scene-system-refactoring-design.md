# Scene System Refactoring Design

**Date:** 2026-04-01  
**Branch:** refactoring  
**Status:** Approved

---

## Overview

Refactor the current hardcoded screen routing into a Unity-like scene system. Each scene is an independent context with its own UI and logic. KAG3 runs inside the Novel scene. A persistent WebGL canvas underlies all scenes, with HTML/DOM as an overlay.

---

## Goals

- Replace numeric `screenStore` constants with a file-based, string-keyed scene system
- Allow new scenes to be added by creating `src/scenes/<name>/index.tsx` with no other changes
- Preserve KAG state across scene transitions (sleep/wake via global Zustand store)
- Reuse a single WebGL context across all scenes (no context recreation on transition)

---

## Architecture

### Two-Layer Rendering Model

```
┌─────────────────────────────┐
│  HTML/DOM layer (overlay)   │  SceneManager — position: absolute
│  Scene UI, text, buttons    │  Content swaps on scene transition
├─────────────────────────────┤
│  WebGL Canvas (persistent)  │  ThreeCanvas — always present
│  Scenes inject 3D content   │  Context created once, never destroyed
└─────────────────────────────┘
```

`App.tsx` owns both layers. `DebugMenu` retains its `CONFIG.DEBUG` guard:

```tsx
function App() {
  useAuthListener()
  return (
    <>
      <ThreeCanvas />
      <SceneManager />
      {CONFIG.DEBUG && <DebugMenu />}
    </>
  )
}
```

---

## Directory Structure

### New layout

```
src/
  scenes/
    sign-in/index.tsx        ← SignInScreen.tsx
    asset-update/index.tsx   ← AssetUpdater screen (see Migration Map)
    title/index.tsx          ← StartScreen.tsx
    novel/index.tsx          ← MainScreen.tsx
    ending/index.tsx         ← EndingScreen.tsx

  scene-manager/
    SceneManager.tsx         new — renders current scene as HTML overlay
    sceneStore.ts            ← screenStore.ts (numeric constants → string IDs)

  components/
    ThreeCanvas.tsx          modified — reads SceneThreeComponent from threeContentStore
    Layout.tsx               unchanged
    DebugMenu.tsx            unchanged
    modules/                 unchanged

  states/
    threeContentStore.ts     new — holds the active scene's Three.js component reference
    (screenStore removed, replaced by scene-manager/sceneStore.ts)

  utils/                     unchanged
  types/                     unchanged

  App.tsx                    simplified — 2-layer render + auth listener only
  main.tsx                   add initial scene determination after async init
```

### Deleted

- `src/components/screens/` — contents moved to `src/scenes/`
- `src/states/screenStore.ts` — replaced by `src/scene-manager/sceneStore.ts`

---

## Scene Manager

### sceneStore

Replaces `screenStore`. Scene IDs are strings matching directory names. The `isLoaded`
field from `ScreenStore` is intentionally dropped — no scene currently consumes it.

```ts
// src/scene-manager/sceneStore.ts
interface SceneStore {
  currentScene: string        // e.g. 'novel', 'title'. Initial value: 'sign-in'
  previousScene: string | null
  navigate: (to: string) => void
}
```

Numeric constants (`MAIN_SCREEN = 1`, etc.) are removed entirely.

**Initial value:** `currentScene` is initialized to `'sign-in'`. In practice, React renders
only after `main.tsx` init completes (existing pattern), so `navigate()` is called before
the first render and the initial value is never seen. The guard in `SceneManager` handles
the edge case defensively anyway.

### SceneManager component

Uses Vite's `import.meta.glob` for auto-discovery and `React.lazy` for code splitting.
`React.lazy` is called inside `useMemo` so a new lazy component is only created when the
scene ID changes — not on every re-render. If `currentScene` does not match any discovered
file, renders nothing:

```tsx
// src/scene-manager/SceneManager.tsx
const sceneModules = import.meta.glob('../scenes/*/index.tsx')

function SceneManager() {
  const currentScene = useSceneStore(s => s.currentScene)

  const SceneComponent = useMemo(() => {
    const loader = sceneModules[`../scenes/${currentScene}/index.tsx`]
    if (!loader) return null
    return React.lazy(loader)
  }, [currentScene])

  if (!SceneComponent) return null
  return (
    <Suspense fallback={null}>
      <SceneComponent />
    </Suspense>
  )
}
```

Adding a new scene requires only creating `src/scenes/<name>/index.tsx`. No other files change.

---

## Scene Interface

Each scene exports a default React component. No special interface required.

```tsx
// src/scenes/novel/index.tsx
export default function NovelScene() {
  return <NovelUI />
}
```

Lifecycle is handled with standard React patterns:

| Purpose | Mechanism |
|---|---|
| On scene enter | `useEffect(() => { ... }, [])` |
| On scene exit cleanup | `useEffect` return function |
| Register 3D content | `useEffect` + `threeContentStore.setSceneThreeComponent` |
| KAG sleep/wake | Nothing — `kagScenarioStore` is global, state persists automatically |

---

## 3D Content Injection

### threeContentStore

Stores a **component reference** (`React.ComponentType | null`), not a `React.ReactNode`.
Storing a node directly in Zustand causes infinite re-renders due to referential inequality
on every state read. A component reference is stable across renders.

```ts
// src/states/threeContentStore.ts
interface ThreeContentStore {
  SceneThreeComponent: React.ComponentType | null
  setSceneThreeComponent: (component: React.ComponentType | null) => void
}
```

### ThreeCanvas.tsx changes

`ThreeCanvas` currently renders `<Background3D />` and `<ForegroundLayer />` as hardcoded
children. After refactoring:

- Remove the hardcoded children
- Read `SceneThreeComponent` from `threeContentStore`
- Render it inside `<Canvas>` when present

```tsx
// src/components/ThreeCanvas.tsx (after)
function ThreeCanvas() {
  const SceneThreeComponent = useThreeContentStore(s => s.SceneThreeComponent)
  return (
    <Canvas>
      {SceneThreeComponent && <SceneThreeComponent />}
    </Canvas>
  )
}
```

### Usage in Novel scene

```tsx
// src/scenes/novel/index.tsx
function NovelScene() {
  const setSceneThreeComponent = useThreeContentStore(s => s.setSceneThreeComponent)
  useEffect(() => {
    setSceneThreeComponent(NovelLayers)     // component reference, not JSX
    return () => setSceneThreeComponent(null)
  }, [])
  return <NovelUI />
}
```

`NovelLayers` is extracted from the current `ThreeCanvas` children into its own component.
Scenes with no 3D needs simply omit `setSceneThreeComponent`; the canvas renders nothing.

---

## Boot / Initialization Flow

### main.tsx

Determines initial scene after async initialization completes. React renders only after
this call, so `currentScene` is already set before the first render.

**Boot routing is kept simple:** `main.tsx` only decides sign-in vs. signed-in. Whether
assets need updating is the responsibility of `AssetUpdater` (it owns the role-gated
Firestore check). `main.tsx` never calls into that logic directly.

```ts
async function init() {
  // assetManager.initialize() is the actual API (not loadManifest)
  await assetManager.initialize()

  // Existing inline onAuthStateChanged pattern — no restoreFirebaseSession() utility
  const user = await new Promise<User | null>(resolve => {
    const unsub = onAuthStateChanged(auth, user => { unsub(); resolve(user) })
  })

  if (!user) {
    sceneStore.navigate('sign-in')
  } else {
    // Always go to asset-update first; AssetUpdater decides whether to proceed to title
    sceneStore.navigate('asset-update')
  }
  // ReactDOM.createRoot(...).render(<App />) follows here
}
```

### App.tsx

Retains the Firebase `onAuthStateChanged` listener (extracted to `useAuthListener` hook).
On sign-out, navigates to `sign-in`.

---

## Migration Map

| Current file | Action | New location |
|---|---|---|
| `components/screens/SignInScreen.tsx` | Move + rename | `scenes/sign-in/index.tsx` |
| `components/modules/AssetUpdater/index.tsx` | Move + rename | `scenes/asset-update/index.tsx` |
| `components/screens/StartScreen.tsx` | Move + rename | `scenes/title/index.tsx` |
| `components/screens/MainScreen.tsx` | Move + rename, **remove `<ThreeCanvas />` import and render** | `scenes/novel/index.tsx` |
| `components/screens/EndingScreen.tsx` | Move + rename | `scenes/ending/index.tsx` |
| `states/screenStore.ts` | Replace | `scene-manager/sceneStore.ts` |
| `components/ThreeCanvas.tsx` | Modify | Remove hardcoded children, read from `threeContentStore` |
| `App.tsx` (routing logic) | Simplify | Remove conditional rendering, keep `useAuthListener` |
| `main.tsx` (init) | Extend | Add initial scene determination before `render()` |
| `components/modules/` | No change | Unchanged (except AssetUpdater moved above) |
| All other stores (`kagScenarioStore` etc.) | No change | Unchanged |

**Note on AssetUpdater:** `components/screens/` may contain a thin wrapper that imports
from `modules/AssetUpdater/`. During migration, verify which file holds the actual
implementation and move that one. Delete any leftover wrapper.

---

## Future Work (Out of Scope for This Refactoring)

### KAG `[scene]` tag

KAG scripts will eventually need to trigger scene transitions directly, e.g.:

```
[scene name="ingame"]
[loadscenario file="after_battle.ks"]
```

This requires:
- A `[scene]` tag handler in `kagInterpreter.ts` that calls `sceneStore.navigate()` and suspends KAG execution
- A suspend/resume flag in `kagScenarioStore`
- Resume logic in `scenes/novel/index.tsx` (`useEffect` on mount)

The global `kagScenarioStore` already preserves state across scene transitions, so the architecture supports this pattern. Implementation is deferred to a separate spec.

---

## What This Does Not Change

- Zustand stores other than `screenStore` — all remain global and unchanged
- `isLoaded` field in `ScreenStore` — intentionally dropped (not consumed by any scene)
- KAG interpreter, parser, loader — no changes
- Asset management — no changes
- `modules/` components (except AssetUpdater migration above) — no changes
- Firebase integration — no changes
- Three.js rendering logic within `NovelLayers` — no changes (extracted, not rewritten)
