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

`App.tsx` owns both layers:

```tsx
function App() {
  useAuthListener()
  return (
    <>
      <ThreeCanvas />
      <SceneManager />
      <DebugMenu />
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
    asset-update/index.tsx   ← AssetUpdater.tsx
    title/index.tsx          ← StartScreen.tsx
    novel/index.tsx          ← MainScreen.tsx
    ending/index.tsx         ← EndingScreen.tsx

  scene-manager/
    SceneManager.tsx         new — renders current scene as HTML overlay
    sceneStore.ts            ← screenStore.ts (numeric constants → string IDs)

  components/
    ThreeCanvas.tsx          unchanged — stays at app level (persistent canvas)
    Layout.tsx               unchanged
    DebugMenu.tsx            unchanged
    modules/                 unchanged

  states/                    unchanged (screenStore removed, replaced by sceneStore)
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

Replaces `screenStore`. Scene IDs are strings matching directory names.

```ts
// src/scene-manager/sceneStore.ts
interface SceneStore {
  currentScene: string        // e.g. 'novel', 'title'
  previousScene: string | null
  navigate: (to: string) => void
}
```

Numeric constants (`MAIN_SCREEN = 1`, etc.) are removed entirely.

### SceneManager component

Uses Vite's `import.meta.glob` for auto-discovery and `React.lazy` for code splitting:

```tsx
// src/scene-manager/SceneManager.tsx
const scenes = import.meta.glob('../scenes/*/index.tsx')

function SceneManager() {
  const currentScene = useSceneStore(s => s.currentScene)
  const SceneComponent = React.lazy(scenes[`../scenes/${currentScene}/index.tsx`])

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
| Register 3D content | `useEffect` + `threeContentStore.setContent` |
| KAG sleep/wake | Nothing — `kagScenarioStore` is global, state persists automatically |

---

## 3D Content Injection

Scenes that need Three.js inject content into the persistent canvas via `threeContentStore`:

```ts
// src/states/threeContentStore.ts
interface ThreeContentStore {
  content: React.ReactNode | null
  setContent: (node: React.ReactNode | null) => void
}
```

Usage in Novel scene:

```tsx
function NovelScene() {
  const setContent = useThreeContentStore(s => s.setContent)
  useEffect(() => {
    setContent(<NovelLayers />)
    return () => setContent(null)
  }, [])
  return <NovelUI />
}
```

`ThreeCanvas` reads from this store and renders whatever is registered. Scenes with no 3D needs simply don't call `setContent`; the canvas renders nothing.

---

## Boot / Initialization Flow

### main.tsx

Determines initial scene after async initialization completes:

```ts
async function init() {
  await assetManager.loadManifest()
  const user = await restoreFirebaseSession()

  if (!user) {
    sceneStore.navigate('sign-in')
  } else if (await assetManager.hasUpdates()) {
    sceneStore.navigate('asset-update')
  } else {
    sceneStore.navigate('title')
  }
}
```

### App.tsx

Retains the Firebase `onAuthStateChanged` listener (extracted to `useAuthListener` hook). On sign-out, navigates to `sign-in`.

---

## Migration Map

| Current file | Action | New location |
|---|---|---|
| `components/screens/SignInScreen.tsx` | Move + rename | `scenes/sign-in/index.tsx` |
| `components/screens/AssetUpdater.tsx` | Move + rename | `scenes/asset-update/index.tsx` |
| `components/screens/StartScreen.tsx` | Move + rename | `scenes/title/index.tsx` |
| `components/screens/MainScreen.tsx` | Move + rename | `scenes/novel/index.tsx` |
| `components/screens/EndingScreen.tsx` | Move + rename | `scenes/ending/index.tsx` |
| `states/screenStore.ts` | Replace | `scene-manager/sceneStore.ts` |
| `App.tsx` (routing logic) | Simplify | Keep, remove conditional rendering |
| `main.tsx` (init) | Extend | Add initial scene determination |
| `components/ThreeCanvas.tsx` | No change | Stays at `components/ThreeCanvas.tsx` |
| `components/modules/` | No change | Unchanged |
| All other stores (`kagScenarioStore` etc.) | No change | Unchanged |

---

## What This Does Not Change

- Zustand stores other than `screenStore` — all remain global and unchanged
- KAG interpreter, parser, loader — no changes
- Asset management — no changes
- `modules/` components — no changes
- Firebase integration — no changes
- Three.js rendering logic within `NovelLayers` — no changes
