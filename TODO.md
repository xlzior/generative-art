# TODO

## Bug Fixes

- [ ] **Fix mona-lisa-circles image loading race condition** — `loadImage` callback in `preload` may not block `setup`. Use synchronous `p.loadImage(MONA_LISA_URL)` instead so p5 blocks until the image is loaded (`src/sketches/mona-lisa-circles/sketch.ts:134-139`).

## Architecture & Structure

- [ ] **Chain lifecycle methods instead of overwriting** — `responsive-canvas.ts` replaces `p.setup` and `p.windowResized` entirely, preventing sketches from defining their own hooks. Use decorator/chain pattern:
  ```typescript
  const originalSetup = p.setup;
  p.setup = () => {
    originalSetup?.(); /* responsive logic */
  };
  ```
- [ ] **Add error boundaries around sketches** — If a sketch throws during `create()` or `draw()`, it breaks the entire app. Wrap each sketch in try-catch with graceful fallback (e.g., show error state in canvas container).
- [ ] **Decouple sketch context from DOM structure** — Sketches implicitly depend on `#sketch-container` DOM structure via `responsive-canvas.ts`. Consider passing container reference explicitly to reduce coupling and improve testability.

## Performance

- [ ] **Optimize cellular-automata board allocation** — `src/sketches/cellular-automata/sketch.ts:136-138` allocates new board objects every frame. Use buffer swapping (two pre-allocated buffers, swap references) instead of creating new arrays per frame.
- [ ] **Cache Mona Lisa image** — `mona-lisa-circles` fetches the image from Wikipedia on every sketch mount. Add caching (in-memory or service worker) to avoid repeated network requests.
- [ ] **Reuse particle array on resize** — `flow-field-particles/sketch.ts:120` creates a new array on every resize. Consider reusing/mutating the existing array instead.

## Code Quality

- [ ] **Consolidate duplicate CSS** — CSS in `App.svelte:261-387` duplicates much of `styles.css`. Move all global styles to `styles.css` and keep only component-scoped styles in Svelte files.
- [ ] **Standardize color formats across sketches** — Some sketches use RGB arrays `[9, 9, 11]` (cellular-automata, flow-field-particles, mona-lisa-circles) while others use hex strings `"#0A0E15"` (fractal-tree, grid-variations, changing-circle-line). Create a helper or pick one format.
- [ ] **Add explicit type to `paramsBySketch` Map** — `App.svelte` uses `new Map()` without type parameters. Add: `new Map<string, Record<string, number | string | boolean>>()`.

## Developer Experience

- [ ] **Add UI feedback for save defaults** — `App.svelte` has a `#save-status` element but never updates it. Show success/error message to user when saving defaults succeeds or fails.
- [ ] **Switch to `lucide-svelte`** — `App.svelte` uses `lucide` + `createIcons()` with `data-lucide` attributes (vanilla JS approach). Use `lucide-svelte` for proper Svelte 5 component integration.
- [ ] **Add sketch generator script** — Create a script or CLI command to scaffold new sketches (create folder, `sketch.ts`, `defaults.json`) following the established pattern.

## Documentation

## Build & Configuration

- [ ] **Add Vite build optimizations** — Configure `manualChunks` for p5.js (large library) in `vite.config.ts`:
  ```typescript
  build: {
    target: 'es2022',
    rollupOptions: {
      output: { manualChunks: { p5: ['p5'] } }
    }
  }
  ```
- [ ] **Add `.env.example`** — Document any environment variables or add environment variable handling if needed.

## Testing

- [ ] **Test `src/sketches/index.ts` auto-discovery** — Add tests for glob discovery, defaults merging, duplicate detection integration, and sort behavior.
- [ ] **Test `src/utils/seeded-random.ts`** — Add unit tests for `createRng()` determinism, `rngRandom()` range, `rngInt()` bounds, `rngChoice()` distribution.
- [ ] **Test `src/utils/seed.ts`** — Add tests for `getSeedFromUrl()` and `setSeedInUrl()` (requires jsdom environment).
- [ ] **Test `src/utils/animation-controller.ts`** — Add tests for animation loop start/stop/loop behavior.
- [ ] **Test `src/utils/canvas-size.ts`** — Add tests for canvas dimension calculations.
- [ ] **Test `src/utils/responsive-canvas.ts`** — Add tests for responsive canvas behavior.
- [ ] **Test `src/App.svelte`** — Add component tests for the main app component.

## Sketches

- [ ] Add URL as a parameter to mona lisa sketch to allow for background images besides mona lisa
- [ ] Check if mona lisa is drawing in an infinite loop and if that is undesirable, find another way to implement it
- [ ] Use a reasonably-sized toggle for boolean parameters instead of a tiny checkbox (see depth map boolean parameter for stereogram)

## Gallery view

- [ ] Implement home page as a gallery of all sketches. Each sketch should be represented as a card, with a thumbnail-sized render of the sketch. Clicking on the card should bring you to to the full sketch.
