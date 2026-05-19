# Decouple sketch context from DOM structure

**Date**: 2026-05-19
**Status**: Draft

## Motivation

`getCanvasSize()` currently uses `document.getElementById(containerId)` to locate the canvas container by string ID. This creates an implicit DOM dependency that makes testing harder (tests must set up DOM elements with specific IDs) and couples sketch infrastructure to the DOM tree structure.

## Changes

### 1. `src/utils/canvas-size.ts` — accept `HTMLElement` instead of `string`

- Change signature from `getCanvasSize(containerId, minSize)` to `getCanvasSize(container, minSize)`
- First param becomes `HTMLElement | null` (null = fall back to `window.innerWidth/Height`)
- Remove the `document.getElementById()` call entirely
- Keep `minSize` unchanged (default `320`)

```ts
// Before
export function getCanvasSize(
  containerId: string = "canvas-container",
  minSize: number = 320,
): CanvasSize {
  const container = document.getElementById(containerId);
  return { ... };
}

// After
export function getCanvasSize(
  container: HTMLElement | null,
  minSize: number = 320,
): CanvasSize {
  return {
    width: Math.max(minSize, Math.floor(container?.clientWidth ?? window.innerWidth)),
    height: Math.max(minSize, Math.floor(container?.clientHeight ?? window.innerHeight)),
  };
}
```

### 2. `src/types/sketch.ts` — add `container: HTMLElement` to `SketchContext`

- Add `container: HTMLElement` field to the `SketchContext` interface
- Add `container?: HTMLElement` (optional) to `ResponsiveCanvasOptions` as an alternative to `containerId`
- Keep `containerId` in `ResponsiveCanvasOptions` for backwards compat but mark it as deprecated

### 3. `src/utils/responsive-canvas.ts` — thread container through

- `attachResponsiveCanvas` already receives `p` and `options`. Add `container` resolution:
  - If `options.container` is provided, use it directly
  - Otherwise, fall back to `document.getElementById(options.containerId)` for backwards compat
- Pass the resolved container to `getCanvasSize()`

### 4. `src/sketch-lifecycle.svelte.ts` — pass container via context

- Already does `const container = document.getElementById("canvas-container")` at line 74
- Instead of `getElementById` here, get it from the caller (App.svelte can pass it)
- Well, actually App.svelte doesn't call mountSketch directly — it goes through the router. Let me rethink.

**Better approach**: `mountSketch` already has a `container` lookup. Instead of doing the lookup here:

```ts
const container = document.getElementById("canvas-container");  // line 74
```

We can either:
- **(a)** Pass container as a param to `mountSketch()`, or  
- **(b)** Keep `document.getElementById` in `mountSketch` but pass the resolved container into `SketchContext` so sketches can use it without DOM queries.

Option (b) is less invasive: just pass the already-looked-up `container` into the context. The real decoupling happens in `getCanvasSize()` and `ResponsiveCanvasOptions`. Let me go with **(b)** — minimal blast radius but still gives sketches direct container access.

**Revised plan**: Keep `document.getElementById` in `mountSketch` as-is (it's the single coordination point), but:

- Add `container` to the `SketchContext` object passed to `sketch.create()`
- Update `attachResponsiveCanvas` to accept `container` in `ResponsiveCanvasOptions`

### 5. Update callers

**`attachResponsiveCanvas` callers** (9 sketches):
- No sketch currently passes `containerId` — they all rely on the default `"canvas-container"`
- No change needed in individual sketches — they just need to typecheck with the updated `ResponsiveCanvasOptions`

**`getCanvasSize` callers**:
- Only called from `responsive-canvas.ts` internally — no external callers besides tests
- Update the two callsites in `responsive-canvas.ts`

### 6. Update tests

**`src/utils/__tests__/canvas-size.test.ts`**:
- All tests currently set up DOM containers with `document.createElement('div')` and `container.id = "canvas-container"`
- Update to pass the container element directly instead of a string ID
- The "fallback to window" test case becomes `getCanvasSize(null)` instead of `getCanvasSize("non-existent")`

**`src/utils/__tests__/responsive-canvas.test.ts`**:
- Tests currently mock `getCanvasSize` entirely, so they mostly won't change
- The `containerId` test can be updated to use `container` option instead

## Files changed

| File | Change |
|------|--------|
| `src/types/sketch.ts` | Add `container: HTMLElement` to `SketchContext`, add optional `container` to `ResponsiveCanvasOptions` |
| `src/utils/canvas-size.ts` | Change first param from `string` to `HTMLElement \| null` |
| `src/utils/responsive-canvas.ts` | Accept `container` option, pass to `getCanvasSize` |
| `src/sketch-lifecycle.svelte.ts` | Pass `container` into `SketchContext` |
| `src/utils/__tests__/canvas-size.test.ts` | Update calls to pass elements instead of strings |
| `src/utils/__tests__/responsive-canvas.test.ts` | Optional: update `containerId` test to use `container` |

## Pros & Cons

### Overall approach

**Pros**
- `getCanvasSize()` becomes pure: given a DOM element (or null) + minSize, it returns a size. No side effects, no implicit DOM queries. Testable without setting up DOM by ID.
- Sketches get `container` in their context — any sketch that needs the container element (e.g. to measure it, attach event listeners) can do so without `document.getElementById`.
- No changes needed in any of the 9 existing sketches — fully backwards compatible.
- `containerId` deprecation path is clear: phase it out once no callers use it.

**Cons**
- `mountSketch()` still calls `document.getElementById("canvas-container")` internally (option b). The single coordination point remains coupled to the DOM, just one layer removed from sketches. A future refactor would need to push this lookup up to App.svelte.
- `ResponsiveCanvasOptions` now has two ways to specify the container (`container` and `containerId`), adding a small conceptual overhead.
- The `container` field on `SketchContext` is technically always the same element as `document.getElementById("canvas-container")` — it's redundant with the existing DOM structure for anyone already holding a reference.

### Design decision: option (a) vs option (b)

**Option (a)** — pass container as a param to `mountSketch()`:

| (+) | (-) |
|-----|-----|
| `mountSketch` becomes fully decoupled from DOM | Requires threading `container` through the router call chain |
| Single source of truth for container resolution in App.svelte | More files changed, bigger blast radius |
| Cleaner for tests that create p5 in arbitrary containers | |

**Option (b)** — keep `document.getElementById` in `mountSketch`, pass into context (chosen):

| (+) | (-) |
|-----|-----|
| Minimal changes (5 files, no router/App changes) | `mountSketch` still coupled to DOM ID |
| No risk of regression from re-plumbing | Future refactor will need to undo this |
| Good enough for the stated goal (testability of `getCanvasSize` + sketch access to container) | |

Option (b) was chosen because the stated goal is to decouple `getCanvasSize` and give sketches container access. Fully decoupling `mountSketch` is a separate concern that can be addressed later when there's a concrete need for it.

### Design decision: `HTMLElement | null` vs requiring `HTMLElement`

**`HTMLElement | null`** (chosen):

| (+) | (-) |
|-----|-----|
| Graceful fallback: `null` means "use window dimensions" | Callers must handle null or pass a valid element |
| Matches existing behaviour when container ID doesn't exist | Slightly looser type contract |
| No breaking change for the `getCanvasSize` fallback path | |

**Require `HTMLElement`**:

| (+) | (-) |
|-----|-----|
| Stronger type guarantee — callers must resolve the container first | Forces every callsite to handle the "no container" case before calling |
| One less null-check path internally | More invasive change to existing callers |

### Design decision: deprecate vs. remove `containerId`

**Deprecate** (chosen):

| (+) | (-) |
|-----|-----|
| Zero sketch changes needed | `ResponsiveCanvasOptions` gains a deprecated field |
| Safe migration path | Linter noise if warnings are enabled |
| No risk of breaking existing sketches | |

**Remove immediately**:

| (+) | (-) |
|-----|-----|
| Cleaner API surface | Requires updating all 9 existing sketches plus `mountSketch` |
| Forces all callers to use the proper approach | More changes, more risk |

## Not changing

- `mountSketch()` signature: keeps `document.getElementById` internally as the coordination point; the `container` is extracted there and passed into context
- Individual sketch files: no changes needed; `attachResponsiveCanvas` remains backwards-compatible

## Verification

1. `pnpm tsc --noEmit` — typecheck
2. `pnpm test:run` — all unit tests pass
3. `pnpm dev` — manual smoke test: navigate sketches, verify canvas sizes correct
