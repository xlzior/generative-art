# AGENTS.md

## Commands

- `pnpm dev` — start Vite dev server
- `pnpm build` — production build
- `pnpm biome check --write` — format + lint (runs on pre-commit)
- `pnpm tsc --noEmit` — typecheck (runs on pre-commit, after biome)
- `pnpm svelte-check --threshold warning` — Svelte type checking (runs on pre-commit, after tsc)
- `pnpm test:run` — unit tests (runs on pre-commit, after biome and typecheck)
- `pnpm test` — unit tests in watch mode
- `pnpm test:visual` — visual regression tests via Playwright (runs on pre-commit, after unit tests)
- `pnpm test:visual:update` — update Playwright visual snapshots

## Adding a New Sketch

1. Create `src/sketches/<name>/sketch.ts` and `defaults.json`
2. Export a default `defineSketch({ id, title, date, parameters, create })` from `sketch.ts`
3. Place numeric parameter defaults in `defaults.json` matching your parameter keys
4. That's it — sketches are auto-discovered via `import.meta.glob` in `src/sketches/index.ts`, no registry to update

Sketch contract is enforced by `defineSketch()` in `src/utils/defineSketch.ts`. Sketches sort by date (newest first), then title. Duplicate IDs are rejected.

## Key Concepts

### Seeded Randomness

All sketches MUST use `createRng()` from `src/utils/seeded-random.ts` for any randomness. This ensures deterministic output when a seed is provided via URL `?seed=N` (used in Playwright visual regression tests). Falls back to `Math.random()` in normal usage.

- Import `rngRandom`, `rngInt`, `rngChoice` from `src/utils/seeded-random.ts`
- Use `rng` passed in `SketchContext` — never use `Math.random()` or `p.random()`

### Animation Controller

Animated sketches use an external `requestAnimationFrame` loop via `SketchAnimationController` instead of p5's internal draw loop. Sketches receive `animation` in their context and register a frame callback via `animation.onFrame()`. The controller calls `p.noLoop()` to prevent p5 from starting its own loop. Static sketches simply call `p.noLoop()` in their setup.

### Global Parameters

Global parameters (defined in `src/sketches/global-parameters.ts`) are framework-managed parameters available to every sketch via `context.global`. They auto-inject into the sketch pipeline — no per-sketch declaration needed.

Current global parameters:
- `dimensions` — canvas size (`{ width: number|null, height: number|null }`). `null` = auto-size to container.

To use global parameters in a sketch, destructure `global` from `SketchContext` and pass values to `attachResponsiveCanvas`:
```ts
create: ({ p, params, global }: SketchContext<Params>) => {
  attachResponsiveCanvas(p, {
    width: global.dimensions.width,
    height: global.dimensions.height,
    onSetup: ...,
    onResize: ...,
  });
}
```

### Theme Awareness

Each sketch receives the current theme (`"dark"` | `"light"`) in its context. Use `themeAccent()` from `src/utils/colour.ts` to invert accent colours via HSL for the light theme. The theme is toggled in the UI and persisted to `localStorage`.

### Defaults Persistence

Each sketch has a `defaults.json` with its default parameter values. Users can save overrides via the "Save As Default" button, which writes back through a Vite dev server endpoint (`/__sketch-defaults`). For static deployments, `localStorageStore` is used instead.

## Testing

- **Unit tests** — Vitest with `@testing-library/svelte` (jsdom). Run via `pnpm test:run` or `pnpm test` for watch mode.
- **Visual regression** — Playwright (Chromium only), uses `?seed=N` for deterministic output. Run with `pnpm test:visual` or update snapshots with `pnpm test:visual:update`.
- Test files go in `__tests__/` folders adjacent to source files. Node environment is default; use jsdom for components via `environmentMatchGlobs` in `vitest.config.ts`.

## TypeScript

Strict mode enabled. `moduleResolution: "bundler"`, `noEmit: true`. Typecheck with `pnpm tsc --noEmit`.

## Toolchain

- **Package manager**: pnpm (not npm/yarn). Lockfile is `pnpm-lock.yaml`.
- **Framework**: Svelte 5 (runes), Vite, p5.js
- **Formatter/linter**: Biome, configured in `biome.json`. Uses tabs and double quotes in JS.
- **Git hooks**: lefthook (not husky), config in `lefthook.yml`. Pre-commit runs Biome, then `tsc --noEmit`, then `svelte-check --threshold warning`, then unit tests, then visual tests.

## Plans

Plan documents in `plans/` follow this naming convention:
- All lowercase, kebab-case
- Prefixed with the date in `YYYY-MM-DD_` format
- Example: `2026-05-03_sketch-gallery-homepage.md`

## Agent conventions

- Clean up Vite dev servers you start (use `kill` or similar when done).
- Never kill the Vite server on port 5173 without asking. To kill it safely, use `./bin/kill-port 5173` or `pnpm kill:port 5173` — this verifies the process is Vite before killing.
- `bin/kill-port` can kill Vite on any port: `./bin/kill-port 4173`
- If you change the application in a way that makes this file outdated, update `AGENTS.md` to match.
