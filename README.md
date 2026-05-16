# Generative Art Playground

A p5.js + Svelte 5 sketchbook framework for exploring code-based generative art.

## Quick Start

```bash
pnpm install
pnpm dev        # start Vite dev server
pnpm build      # production build
pnpm test:run   # unit tests (Vitest)
pnpm test:visual # visual regression (Playwright)
```

## Adding a New Sketch

1. Create `src/sketches/<name>/sketch.ts` and `defaults.json`
2. Export a default `defineSketch({ title, description, date, parameters, create })` from `sketch.ts`
3. Place numeric parameter defaults in `defaults.json` matching your parameter keys
4. That's it — sketches are auto-discovered via `import.meta.glob`, no registry to update

The sketch contract (`defineSketch` in `src/utils/defineSketch.ts`) validates that your module has a title, description, date, parameters array with valid types, and a create function. Duplicate IDs and missing defaults keys are caught at import time.

## Key Concepts

- **Seeded Randomness** — All sketches use `createRng()` from `src/utils/seeded-random.ts` instead of `Math.random()` or `p.random()`. Pass `?seed=N` in the URL for deterministic output, used by Playwright visual tests for stable snapshots. Falls back to `Math.random()` in normal usage.

- **Animation Controller** — Animated sketches use an external `requestAnimationFrame` loop via `SketchAnimationController` instead of p5's internal draw loop. Sketches receive `animation` in their context and register a frame callback via `animation.onFrame()`. The controller calls `p.noLoop()` to prevent p5 from starting its own loop. Static sketches simply call `p.noLoop()` in their setup.

- **Global Parameters** — Framework-managed parameters (currently `dimensions` for canvas width/height) are auto-injected into every sketch via `context.global`. Pass them to `attachResponsiveCanvas()` for fixed or auto-sized canvases. The global parameter list is extensible in `src/sketches/global-parameters.ts`.

- **Theme Awareness** — Each sketch receives the current theme (`"dark"` | `"light"`) in its context. Use `themeAccent()` from `src/utils/colour.ts` to invert accent colours via HSL for the light theme. The theme is toggled in the UI and persisted to `localStorage`.

- **Defaults Persistence** — Each sketch has a `defaults.json` with its default parameter values. Users can save overrides via the "Save As Default" button, which writes back through a Vite dev server endpoint (`/__sketch-defaults`). For static deployments, the `localStorageStore` is used instead.

## Testing

- **Unit tests** — Vitest with `@testing-library/svelte`, run via `pnpm test:run`
- **Visual regression** — Playwright (Chromium only), uses `?seed=N` for deterministic output. Run with `pnpm test:visual` or update snapshots with `pnpm test:visual:update`

## Toolchain

- **Package manager**: pnpm
- **Framework**: Svelte 5 (runes), Vite, p5.js
- **Language**: TypeScript (strict mode, `moduleResolution: "bundler"`)
- **Formatter/linter**: Biome (tabs, double quotes in JS)
- **Git hooks**: lefthook — pre-commit runs Biome check, then `tsc --noEmit`, then `svelte-check --threshold warning`, then tests
