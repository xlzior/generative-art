# AGENTS.md

## Commands

- `pnpm dev` — start Vite dev server
- `pnpm build` — production build
- `pnpm biome check --write` — format + lint (runs on pre-commit)
- `pnpm tsc --noEmit` — typecheck (runs on pre-commit, after biome)

No test framework is configured.

## Toolchain quirks

- **Package manager**: pnpm (not npm/yarn). Lockfile is `pnpm-lock.yaml`.
- **Formatter/linter**: Biome, configured in `biome.json`. Uses tabs and double quotes in JS.
- **Git hooks**: lefthook (not husky), config in `lefthook.yml`. Pre-commit runs biome then tsc.
- **Svelte 5** with runes. Vite plugin: `@sveltejs/vite-plugin-svelte`.

## Sketch system

Sketches auto-discover via `import.meta.glob` in `src/sketches/index.ts`. No manual registry.

Each sketch needs two files in `src/sketches/<sketch-name>/`:
- `sketch.ts` — export default `defineSketch({ id, title, date, parameters, create })`
- `defaults.json` — numeric defaults matching `parameters` keys

`defaults.json` can be updated from the UI via a custom Vite dev server endpoint (`/__sketch-defaults`).

Sketch contract is enforced by `defineSketch()` in `src/utils/defineSketch.ts`. Sketches sort by date (newest first), then title. Duplicate IDs are rejected.

## TypeScript

Strict mode enabled. `moduleResolution: "bundler"`, `noEmit: true`. Typecheck with `pnpm tsc --noEmit`.

## Agent conventions

- Clean up Vite dev servers you start (use `kill` or similar when done).
- Never kill the Vite server on port 5173 — that is the user's dev server.
- If you change the application in a way that makes this file outdated, update `AGENTS.md` to match.
