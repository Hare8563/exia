# Exia - Novel Game Engine

Exia is a lightweight and high-performance visual novel game engine inspired by the UI/UX of "Victory Goddess: NIKKE". It is built using the Tauri framework for the desktop shell and Vite + React for the frontend.

## Project Overview

*   **Purpose:** A flexible and stylish visual novel engine that allows UI customization using JSX and CSS.
*   **Main Technologies:**
    *   **Backend:** Tauri (Rust)
    *   **Frontend:** Vite, React, TypeScript
    *   **State Management:** Zustand
    *   **Styling:** Tailwind CSS, PostCSS
    *   **Voice Integration:** VOICEVOX (optional)
*   **Architecture:**
    *   `src-tauri/`: Rust backend and Tauri configuration.
    *   `src/`: React frontend source code.
        *   `components/`: UI components (Screens, Modules, Layouts).
        *   `states/`: Zustand stores for global state management (Scenario, Screen, Navigation, etc.).
        *   `scenarios/`: JSON-based scenario files.
        *   `types/`: TypeScript type definitions.
    *   `public/`: Static assets (images, backgrounds, characters, voices).
    *   `editor/`: A separate Next.js-based scenario editor.

## Building and Running

### Development
To start the development server with Tauri:
```bash
pnpm run tauri dev
```
This will run the Vite development server and open the Tauri desktop window.

### Production Build
To build the production application:
```bash
pnpm run tauri build
```
The resulting executable will be located in `src-tauri/target/release/`.

### Other Commands
*   **Type Checking:** `pnpm run type-check`
*   **Voice Generation:** `pnpm run build-voice` (Requires VOICEVOX running locally)
*   **Scenario Editor:** `cd editor && pnpm run dev`

## Development Conventions

*   **State Management:** Use Zustand stores located in `src/states/`. Avoid using local state for data that needs to be shared across screens or modules.
*   **Scenarios:** Scenarios are defined in JSON files within `src/scenarios/`. The default scenario is `S_000.json`.
*   **Styling:** Follow the existing Tailwind CSS patterns. Global styles are managed in `src/styles/globals.css`.
*   **Components:** Prefer functional components and hooks. Use the `Layout` component for consistent screen structure.
*   **IPC:** Frontend to backend communication is handled via Tauri's `invoke` API. The backend implementation is in `src-tauri/src/lib.rs`.

## Key Files and Directories

*   `src-tauri/tauri.conf.json`: Main Tauri configuration (window size, bundle identifier, etc.).
*   `src-tauri/src/lib.rs`: Rust backend logic and command handlers (e.g., `save_scenario`).
*   `src/App.tsx`: The main entry point for the React application.
*   `src/states/`: Definitions of global stores (Scenario, Screen, etc.).
*   `src/scenarios/S_000.json`: The main scenario data file.
*   `public/images/`: Storage for backgrounds, character sprites, and cut-ins.
