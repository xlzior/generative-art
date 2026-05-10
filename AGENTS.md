# AGENTS.md

## Commands

- `pnpm dev` — start Vite dev server
- `pnpm build` — production build
- `pnpm biome check --write` — format + lint (runs on pre-commit)
- `pnpm tsc --noEmit` — typecheck (runs on pre-commit, after biome)
- `pnpm svelte-check --threshold warning` — Svelte type checking (runs on pre-commit, after tsc)
- `pnpm test:run` — unit tests (runs on pre-commit, after biome and typecheck)
- `pnpm test:visual` — visual regression tests (runs on pre-commit, after unit tests)

## Testing

Test framework: Vitest with @testing-library/svelte (jsdom) and Playwright for visual tests.

Commands:
- `pnpm test:run` — run all unit tests
- `pnpm test` — watch mode
- `pnpm test:visual` — Playwright visual regression tests

Test files go in `__tests__/` folders adjacent to source files. Node environment is default; use jsdom for components via `environmentMatchGlobs` in `vitest.config.ts`.

## Toolchain quirks

- **Package manager**: pnpm (not npm/yarn). Lockfile is `pnpm-lock.yaml`.
- **Formatter/linter**: Biome, configured in `biome.json`. Uses tabs and double quotes in JS.
- **Git hooks**: lefthook (not husky), config in `lefthook.yml`. Pre-commit runs biome then tsc.
- **Svelte 5** with runes. Vite plugin: `@sveltejs/vite-plugin-svelte`.

## Global parameters

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

Sketches auto-discover via `import.meta.glob` in `src/sketches/index.ts`. No manual registry.

Each sketch needs two files in `src/sketches/<sketch-name>/`:
- `sketch.ts` — export default `defineSketch({ id, title, date, parameters, create })`
- `defaults.json` — numeric defaults matching `parameters` keys

`defaults.json` can be updated from the UI via a custom Vite dev server endpoint (`/__sketch-defaults`).

Sketch contract is enforced by `defineSketch()` in `src/utils/defineSketch.ts`. Sketches sort by date (newest first), then title. Duplicate IDs are rejected.

## TypeScript

Strict mode enabled. `moduleResolution: "bundler"`, `noEmit: true`. Typecheck with `pnpm tsc --noEmit`.

## Seeded randomness

All sketches MUST use `rng()` from `src/utils/seeded-random.ts` for any randomness. This ensures deterministic output when a seed is provided via URL `?seed=N` (used in Playwright visual regression tests).

- Import `rngRandom`, `rngInt`, `rngChoice` from `src/utils/seeded-random.ts`
- Use `rng` passed in `SketchContext` — never use `Math.random()` or `p.random()`
- The seed is only used in Playwright tests; normal app usage falls back to `Math.random()`

## Agent conventions

- Clean up Vite dev servers you start (use `kill` or similar when done).
- Never kill the Vite server on port 5173 — that is the user's dev server.
- If you change the application in a way that makes this file outdated, update `AGENTS.md` to match.
