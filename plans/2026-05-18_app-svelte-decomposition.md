# App.svelte Decomposition + TypeScript Migration

## Goal

Break App.svelte (568 lines) into focused `.svelte.ts` modules, each fully typed from birth, then add `lang="ts"` to the residual shell. All phases are TS-only — no intermediate JS step.

Background: `svelte/types/index.d.ts` is pulled in by `src/vite-env.d.ts` (which imports `ComponentType` from `"svelte"`), so `$state()` and other runes are recognised by `tsc` in `.ts` and `.svelte.ts` files.

---

## Design

Extract three modules, each owning a slice of state and exported functions that mutate it:

```
App.svelte (thin shell, ~100 lines)
  ├── sketch-params.svelte.ts      — params map + persistence
  ├── sketch-lifecycle.svelte.ts   — p5 instance + mount/unmount
  └── sketch-router.svelte.ts      — navigation + URL sync
```

Shared dependency: `getSketchById()` is extracted to `sketches/index.js` (where `sketches` already lives) rather than owned by any module, avoiding unnecessary cross-module coupling.

---

## Module API surfaces

### sketch-params.svelte.ts

```ts
export const paramsBySketch = $state(new Map<string, Record<string, unknown>>());

export function getParamsForSketch(sketchId: string): Record<string, unknown>;
  // creates entry from defaults or store if missing; guaranteed non-null return

export function updateParam(sketchId: string, key: string, value: unknown): void;
  // sets value, triggers reactivity via spread + new Map ref

export function resetParams(sketchId: string): void;
  // restores defaults

export async function saveDefaults(sketchId: string): Promise<void>;
  // persists to store, updates sketch.defaults in-memory
```

- **Imports**: `sketches` + `getSketchById` from `./sketches/index.js`, `store` from `./utils/defaults-store.js`
- **No dependency on router or lifecycle modules**

### sketch-lifecycle.svelte.ts

```ts
export const currentP5 = $state<p5 | null>(null);
export const currentController = $state<SketchAnimationController | null>(null);
export const currentSketchModule = $state<SketchModuleWithDefaults | null>(null);
// currentParams also exported — read by App.svelte template for ParameterControls
export const currentParams = $state<Record<string, unknown> | null>(null);

export function mountSketch(
  sketchId: string,
  theme: Theme,
  options?: { redrawControls?: boolean },
): void;
export function unmountSketch(): void;
export function regenerate(sketchId: string, theme: Theme): void;
export function savePNG(sketchId: string | null): void;
```

- **Imports**: `p5` from `"p5"`, `getParamsForSketch` from `./sketch-params.svelte.js`, `GlobalParams`/`globalDefaults` from `./sketches/global-parameters.js`, `createRng`, `createAnimationController`, `getSeedFromUrl`
- **Only cross-module dependency**: lifecycle → params (`getParamsForSketch`)

### sketch-router.svelte.ts

```ts
export const currentSketchId = $state<string | null>(null);

export function navigateToSketch(id: string): void;   // pushState + set state
export function navigateToGallery(): void;             // delete param + set null
export function initRouter(): (() => void);            // read URL, popstate, returns cleanup
export function resolveSketchFromUrl(): string | null; // URL → validated sketchId or null
```

- **Imports**: `sketches` + `getSketchById` from `./sketches/index.js`
- **No dependency on params or lifecycle modules**

### Residual App.svelte

**Own state**: `currentTheme` (with `applyTheme` + localStorage toggle via `handleThemeToggle`), `lastMountedSketchId` (for `$effect` guard)

**Orchestration** (coordination between modules):
- `$effect` on `currentSketchId` → calls `mountSketch()` or `unmountSketch()`
- `onMount` → calls `initRouter()`, sets up keyboard listener
- `handleKeyDown` → `regenerate()` on R/Space
- `handleParamChange(key, value)` → `updateParam()` + `mountSketch()` (used by both ParameterControls and DimensionsControl — they were identical in the original code)

**Template**: wires imported state and functions to UI components. No direct p5, Map, or URL manipulation.

---

## Phase 1 — Extract `getSketchById` to `sketches/index.ts`

**Prerequisite** for all three modules (each needs sketch lookup). Adds ~5 lines to `src/sketches/index.ts`.

```ts
export function getSketchById(
  id: string,
): SketchModuleWithDefaults<Record<string, unknown>> | undefined {
  return sketches.find((s) => s.id === id);
}
```

**Tests** (`src/sketches/__tests__/index.test.ts` — extend existing):

| Test |
|------|
| `getSketchById` returns sketch for valid string id |
| `getSketchById` returns undefined for unknown id |

---

## Phase 2 — Create `sketch-router.svelte.ts`

Extract navigation. Fully typed from birth — `tsc` checks it immediately.

**Functions extracted from App.svelte:**
- `navigateToSketch(sketchId)` → `navigateToSketch(id)`
- `navigateToGallery()` — unchanged signature
- `resolveSketchFromUrl()` — unchanged, uses `getSketchById` from `sketches/index.ts`
- `handlePopState` — inlined into `initRouter()`

**New:** `initRouter()` — called from App's `onMount`, sets up popstate listener, returns cleanup function.

**Tests** (`src/__tests__/sketch-router.test.ts`):

| Test |
|------|
| `navigateToSketch` updates URL with `?sketch=<id>` and sets `currentSketchId` |
| `navigateToGallery` removes `sketch` param from URL and sets `currentSketchId` to null |
| `resolveSketchFromUrl` returns sketch id from `?sketch=` when sketch exists |
| `resolveSketchFromUrl` returns null for missing param |
| `resolveSketchFromUrl` returns null for unknown sketch id |
| `initRouter` sets `currentSketchId` from URL on call |
| `initRouter` returns cleanup that removes popstate listener |
| popstate event triggers `currentSketchId` update to URL value |

---

## Phase 3 — Create `sketch-params.svelte.ts`

This phase delivers the **original typed-Map todo**: `paramsBySketch` is typed from creation.

**Functions extracted from App.svelte:**
- `cloneDefaults(sketch)` → module-private helper (internal)
- `getParamsForSketch(sketch)` → `getParamsForSketch(sketchId)` — takes string, uses `getSketchById` internally
- `handleParamChange(key, value)` body → `updateParam(sketchId, key, value)`
- `handleGlobalParamChange(key, value)` body → also `updateParam(sketchId, key, value)` (identical)
- `handleResetParams()` body → `resetParams(sketchId)`
- `handleSaveDefaults()` body → `saveDefaults(sketchId)`

**Note:** `getParamsForSketch` uses a `!` assertion on `Map.get()` after the `has`/`set` guard — guaranteed non-null by construction. The return type excludes `undefined`.

**Tests** (`src/__tests__/sketch-params.test.ts`):

| Test |
|------|
| `getParamsForSketch` creates entry from defaults when store returns null |
| `getParamsForSketch` loads from store when available |
| `getParamsForSketch` returns same reference on repeated calls (caching) |
| `updateParam` sets value and triggers new Map reference for reactivity |
| `updateParam` preserves other params (spread integrity) |
| `updateParam` auto-initialises params for sketch if missing |
| `resetParams` restores original defaults |
| `saveDefaults` calls `store.save` with sketch id + params |
| `saveDefaults` updates `sketch.defaults` on successful save |

---

## Phase 4 — Create `sketch-lifecycle.svelte.ts`

The heaviest module. Handles p5 lifecycle, parameter assembly, and animation controller wiring.

**Functions extracted from App.svelte:**
- `unmountSketch()` — unchanged logic
- `mountSketch(sketchId, theme, options?)` — main lifecycle entry point
- `handleRegenerate()` → `regenerate(sketchId, theme)`
- `handleSavePNG()` → `savePNG(sketchId)`

**Logic that moves with mountSketch:**
- Parameter splitting: `allParams` → `globalParams` (typed as `GlobalParams`) + `sketchParams`
- `__CREATE_TEST_CTRL__` test mode handling
- `document.title` update
- Seed-based or `Math.random` rng setup
- Animation controller wiring

**Global window augmentation** lives at the top of this file:
```ts
declare global {
  interface Window {
    __CREATE_TEST_CTRL__?: () => SketchAnimationController;
  }
}
```

**Tests** (`src/__tests__/sketch-lifecycle.test.ts`):

| Test |
|------|
| `mountSketch` creates a new p5 instance and calls `sketch.create` |
| `mountSketch` passes `theme: Theme` in context |
| `mountSketch` passes split params (`global: GlobalParams` + `params: Record<string, unknown>`) |
| `mountSketch` wires animation controller via `attachToP5` |
| `mountSketch` skips controller in `__CREATE_TEST_CTRL__` test mode |
| `mountSketch` uses seed-based rng when `?seed=` is present |
| `mountSketch` uses `Math.random` when no seed |
| `mountSketch` sets `document.title` |
| `unmountSketch` calls `p5.remove()` and `controller.destroy()` |
| `unmountSketch` is a no-op when nothing mounted (idempotent) |
| `unmountSketch` nulls out `currentP5`, `currentController`, etc. |
| `regenerate` remounts with same id and theme |
| `savePNG` calls `currentP5.saveCanvas` when p5 exists |
| `savePNG` is a no-op when `currentP5` is null |

---

## Phase 5 — Thin down App.svelte + add `lang="ts"`

**Removed** from App.svelte (delegated to modules):
- `paramsBySketch`, `cloneDefaults`, `getParamsForSketch`, `handleParamChange`, `handleResetParams`, `handleSaveDefaults`
- `currentP5`, `currentController`, `currentSketchModule`, `mountSketch`, `unmountSketch`, `handleRegenerate`, `handleSavePNG`
- `currentSketchId`, `navigateToSketch`, `navigateToGallery`, `resolveSketchFromUrl`, `getSketchById`, `initRouter`
- `handleGlobalParamChange` (merged with `handleParamChange`, since they were identical)

**Kept** in App.svelte:
- `currentTheme` + `applyTheme()` + `resolveInitialTheme()` — simple, ~10 lines
- `handleThemeToggle` — coordinates theme switch + remount
- `lastMountedSketchId` + `$effect` — auto-mount on navigation
- `onMount` — calls `initRouter()`, `applyTheme(initial)`, sets up keyboard listener
- `handleKeyDown` — R / Space → `regenerate()`
- `handleParamChange(key, value)` — calls `updateParam()` + `mountSketch()` (single handler for both ParameterControls and DimensionsControl)
- Template — wires imports to UI

All handlers are thin — each is 1-4 lines delegating to the modules.

**Then add `lang="ts"`** — the residual script block is ~50 lines of simple types. Should fix in <5 minutes: add type annotations to the few remaining untyped params (`event`, `handleKeyDown`, `handleThemeToggle`), the `onMount` callback, and the `keyof` dimensions.

**Tests:** Update `src/__tests__/App.test.ts` — component behavior should be identical. Mock structure stays the same.

---

## Execution order

```
Phase 1: Add getSketchById to sketches/index.ts
Phase 2: Create sketch-router.svelte.ts (re-route App.svelte imports)
Phase 3: Create sketch-params.svelte.ts  (re-route App.svelte imports)
Phase 4: Create sketch-lifecycle.svelte.ts (re-route App.svelte imports)
Phase 5: Strip App.svelte, add lang="ts"
```

Each phase is independently testable — the module is `tsc`-checked from creation, and `svelte-check` stays at 0 errors (App.svelte keeps plain `<script>` until Phase 5).

---

## Module dependency graph

```
App.svelte ────────────────────────────────────────┐
  ├── sketches/index.ts (getSketchById)             │
  ├── sketch-router.svelte.ts                       │
  ├── sketch-params.svelte.ts                       │
  └── sketch-lifecycle.svelte.ts                    │
        └── sketch-params.svelte.ts (getParamsForSketch only)
                                                    │
No circular dependencies ──────────────────────────˅
```

---

## Verification per phase

```bash
pnpm tsc --noEmit               # must pass (checks .svelte.ts + .ts files)
pnpm test:run                   # new + existing tests pass
pnpm svelte-check --threshold warning  # 0 errors through Phase 4
                                       # (App still uses plain <script>)
```

Phase 5 adds `lang="ts"` — then verify:

```bash
pnpm svelte-check --threshold warning  # 0 errors (including App.svelte now)
pnpm build                             # production build passes
```
