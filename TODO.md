# TODO

## Architecture & Structure

- [ ] **Chain lifecycle methods instead of overwriting** — `responsive-canvas.ts` replaces `p.setup` and `p.windowResized` entirely, preventing sketches from defining their own hooks. Use decorator/chain pattern:
  ```typescript
  const originalSetup = p.setup;
  p.setup = () => {
    originalSetup?.(); /* responsive logic */
  };
  ```
- [ ] **Add error boundaries around sketches** — If a sketch throws during `create()` or `draw()`, it breaks the entire app. Wrap each sketch in try-catch with graceful fallback (e.g., show error state in canvas container).
- [ ] **Decouple sketch context from DOM structure** — `getCanvasSize()` uses `document.getElementById(containerId)` to locate the container by string ID. While `containerId` is configurable in `attachResponsiveCanvas()`, the sketch context doesn't receive the container element directly. Changes needed:
  - Add `container: HTMLElement` to `SketchContext` type
  - Update `getCanvasSize()` to accept `HTMLElement` instead of `string`
  - Pass container from `App.svelte:100` through sketch context instead of relying on DOM ID lookup
  - This improves testability by removing implicit DOM dependencies

## Performance

- [ ] **Optimize cellular-automata board allocation** — `src/sketches/cellular-automata/sketch.ts:136-138` allocates new board objects every frame. Use buffer swapping (two pre-allocated buffers, swap references) instead of creating new arrays per frame.
- [ ] **Cache Mona Lisa image** — `mona-lisa-circles` fetches the image from Wikipedia on every sketch mount. Add caching (in-memory or service worker) to avoid repeated network requests.
- [ ] **Reuse particle array on resize** — `flow-field-particles/sketch.ts:120` creates a new array on every resize. Consider reusing/mutating the existing array instead.

## Code Quality

- [ ] **Standardize color formats across sketches** — Some sketches use RGB arrays `[9, 9, 11]` (cellular-automata, flow-field-particles, mona-lisa-circles) while others use hex strings `"#0A0E15"` (fractal-tree, grid-variations, changing-circle-line). Create a helper or pick one format.
- [ ] **Add explicit type to `paramsBySketch` Map** — `App.svelte` uses `new Map()` without type parameters. Add: `new Map<string, Record<string, number | string | boolean>>()`.

## Developer Experience

- [ ] **Add UI feedback for save defaults** — `App.svelte` has a `#save-status` element but never updates it. Show success/error message to user when saving defaults succeeds or fails.

- [ ] **Add sketch generator script** — Create a script or CLI command to scaffold new sketches (create folder, `sketch.ts`, `defaults.json`) following the established pattern.

## Bug fixes

- [ ] Add sketch specific speed multiplier so that each animated sketch can be scaled to animate at a speed that makes sense for it rather than a constant frame rate for all animated sketches

## Features

- [ ] Add color picker parameter control
