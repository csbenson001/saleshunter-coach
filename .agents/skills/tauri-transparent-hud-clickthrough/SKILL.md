---
name: tauri-transparent-hud-clickthrough
description: Build and control transparent, always-on-top, click-through desktop HUD overlays in Tauri/Rust and React without blocking desktop interactions or leaking window events.
---

# macOS Transparent Floating HUD & Click-Through Window Management

## 1. Problem Context & Business Goal
Sales reps on live Zoom/Meet calls need glanceable AI cues without taking focus away from their CRM or meeting window. The overlay window must float on top, support transparency, allow click-through for background clicks, and selectively capture clicks only when reps interact with actionable cue buttons (like concession trades).

## 2. Proven Architecture & Implementation Pattern
- **Tauri Window Attributes** in `tauri.conf.json` or window creation:
  - `alwaysOnTop: true`
  - `transparent: true`
  - `decorations: false`
  - `hasShadow: false`
- **Dynamic Click-Through Toggling via Tauri Commands**:
  - `set_ignore_cursor_events(true, ...)` when hovering transparent space
  - `set_ignore_cursor_events(false, ...)` when hovering interactive cards (trade pills, copy buttons)
- **React HUD Host Hook**:
  - Encapsulate window positioning, visibility toggles, and objection card queue in `src/lib/sales/useInCallNudgeHudHost.ts`
  - Coordinate state via Zustand store (`src/lib/sales/inCallNudgeHud.ts`)
  - Render via React Portal or dedicated Tauri window route

## 3. Critical Gotchas, Pitfalls & Anti-Patterns
- **React `act` Environment in Tests**: Vitest/React test suites with `IS_REACT_ACT_ENVIRONMENT = true` will error if intervals or window timers fire without cleanup. In hooks, avoid running unbounded `setInterval` during tests, or gate interval polling behind mock flags.
- **Mouse Exit Detection**: On macOS, moving cursor rapidly off the screen may miss `mouseleave` events. Always implement a safety poll or blur event listener to restore click-through ignore state so rep's clicks never freeze.
- **CSS Backdrop Blur & Transparency**: On transparent Tauri windows, use `background: rgba(..., ...)` with subtle border outlines (`border: 1px solid rgba(255,255,255,0.1)`) to maintain high contrast readability over both light and dark Zoom call screens.

## 4. Verification Recipe
Run the following command to verify the implementation pattern:
```bash
pnpm vitest run src/lib/sales/__tests__/inCallNudgeHudHost.test.ts src/lib/sales/__tests__/inCallNudgeHud.test.ts && npx tsc --noEmit
```
