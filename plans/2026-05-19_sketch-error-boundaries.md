# Sketch error boundaries

**Date**: 2026-05-19
**Status**: Draft

## Motivation

Currently, if a sketch throws during `create()`, `draw()`, or an animation frame, the error propagates with zero guards:

- **`mountSketch()`** is called from an `$effect` in `App.svelte` and several event handlers. An uncaught throw here corrupts the effect's reactivity. The canvas stays blank.
- **Animation controller** (`animation-controller.ts:42`) calls `renderer?.(frameCount)` unprotected. If the renderer throws, `requestAnimationFrame` is never re-queued — the animation permanently freezes.
- **Thumbnails** (`SketchThumbnail.svelte`) create p5 instances in a gallery context. One bad thumbnail during gallery rendering shouldn't block others.

The app shell (controls, nav, theme toggle) survives sketch errors due to Svelte's component model — the crash is DOM-isolated to the canvas area. But the user has no indication of what went wrong, and stale/broken state can linger in `lifecycle`.

**Goal**: Wrap sketch execution in targeted try/catch boundaries. When a sketch fails, show a fallback UI in the canvas container, keep the animation loop alive, and log the error so it's diagnosable.

## Changes

### 1. `src/sketch-lifecycle.svelte.ts` — wrap `mountSketch` in try/catch

Wrap the sketch-creation block (lines 88–100) so that any throw during `new p5()` or `sketch.create()` is caught, logged, and produces a fallback canvas container state.

```ts
export function mountSketch(
  sketchId: string,
  theme: Theme,
  options?: { redrawControls?: boolean },
): void {
  const { redrawControls = true } = options ?? {};
  // ... (params, container, rng setup — unchanged) ...
  // ... (unmountSketch — unchanged) ...

  try {
    lifecycle.currentP5 = new p5((p) => {
      if (!isTest) {
        controller.attachToP5(p);
      }
      sketch.create({
        p, theme, params: sketchParams,
        global: globalParams as GlobalParams,
        rng, animation: controller,
      });
    }, container);
  } catch (err) {
    console.error(`[sketch:${sketchId}] Failed to mount:`, err);
    showFallbackInCanvas(container);
    unmountSketch(); // clear stale lifecycle state
    return;
  }

  document.title = sketch.title;
  // ... (redrawControls trigger — unchanged) ...
}
```

**`showFallbackInCanvas()`** — render an inline fallback message in the canvas container:

```ts
function showFallbackInCanvas(container: HTMLElement): void {
  container.innerHTML = `<div class="sketch-error">
    <p>Sketch failed to render</p>
    <p class="sketch-error-detail">Check the console for details.</p>
  </div>`;
}
```

Add accompanying styles in `App.svelte` (or a shared stylesheet) for `.sketch-error` and `.sketch-error-detail`.

**Edge case**: `unmountSketch()` is called at the top of `mountSketch()`. If the try/catch also calls `unmountSketch()`, we end up calling it twice. The current `unmountSketch()` is idempotent (null-checks every field), so this is safe. But wrap the fallback `unmountSketch()` in a guard or restructure to avoid double-call confusion.

**Alternative**: Restructure so `unmountSketch()` is called once at the top, and the try/catch only needs to clean up after `new p5()`:
```ts
unmountSketch(); // always clean first
// ... setup ...
try {
  lifecycle.currentP5 = new p5(...);
} catch (err) {
  console.error(...);
  showFallback(container);
  return; // lifecycle state already cleared by unmountSketch
}
```

### 2. `src/utils/animation-controller.ts` — wrap `renderer?.(frameCount)` in try/catch

A single bad frame should not kill the entire animation loop. Wrap the renderer call so the loop continues:

```ts
while (accumulator >= TICK_DURATION && ticks < MAX_TICKS_PER_FRAME) {
  frameCount++;
  try {
    renderer?.(frameCount);
  } catch (err) {
    console.error("[animation-controller] Renderer threw:", err);
  }
  accumulator -= TICK_DURATION;
  ticks++;
}
```

**Design decision**: swallow and log vs. stop on error. Chosen: **swallow and log**. Stopping on error makes transient failures fatal, while the sketch may recover on the next frame. If the error is persistent, the loop keeps failing silently — but the user sees the canvas frozen and can Regenerate. This matches p5's own behaviour (it doesn't stop the draw loop on error, though the error does break the current frame). On balance, keeping the loop alive is strictly better.

### 3. `src/components/SketchThumbnail.svelte` — wrap `sketch.create()` in try/catch

If a thumbnail's sketch throws, it shouldn't break the entire gallery grid. Wrap the p5 constructor call:

```ts
try {
  instance = new p5((p) => {
    // ...
    sketch.create({ ... });
    // ...
  }, container);
} catch (err) {
  console.error(`[thumbnail] Failed to create sketch:`, err);
  instance = null;
}
```

**Design decision**: individual catch per thumbnail vs. one catch in the parent (SketchGallery). Per-thumbnail is better: it isolates failures so one bad sketch doesn't take down the gallery. The container div stays empty (or could show a small error icon, but that's polish — an empty tile is visually fine).

### 4. (Low priority) `src/utils/colour.ts` — consider `safeHexToRgb` variant

`hexToRgb()` throws on invalid hex. Currently no caller guards against this. If a sketch calls `hexToRgb()` with an unchecked user-supplied colour during `draw()`, it crashes the frame. 

**Not changing** for now — the fix belongs at the sketch level (validate colour input) rather than adding a silent fallback in the utility. The animation controller boundary in change #2 will catch the resulting frame error anyway. Revisit if invalid colours become a common source of frame errors.

## Error state UI

The fallback rendered by `showFallbackInCanvas()`:

```
+----------------------------------+
|                                  |
|        Sketch failed to render   |
|    Check the console for details.|
|                                  |
+----------------------------------+
```

Styled to match the app's visual language:
- Centred text in the canvas container
- Uses `var(--muted-ink)` for the detail line
- No interaction (the user navigates away or regenerates)

## Files changed

| File | Change |
|------|--------|
| `src/sketch-lifecycle.svelte.ts` | Wrap `new p5()` in try/catch with fallback |
| `src/utils/animation-controller.ts` | Wrap `renderer?.()` in try/catch |
| `src/components/SketchThumbnail.svelte` | Wrap `new p5()` in try/catch |
| `src/App.svelte` | Add styles for `.sketch-error` fallback |

## Not changing

- `defineSketch()` — build-time validation is already solid; a malformed sketch module is a fatal error that should prevent the app from loading
- `sketch-params.svelte.ts` — already has try/catch for its network request
- `defaults-store.ts` — already has try/catch for JSON parse
- `colour.ts` — see rationale above

## Verification

1. `pnpm tsc --noEmit` — typecheck
2. `pnpm test:run` — unit tests pass
3. Manual: introduce a deliberate throw in a sketch's `create()`, verify:
   - Fallback message appears in canvas container
   - Console.error shows the error
   - Left panel controls remain interactive
   - Navigating to another sketch works
4. Manual: introduce a deliberate throw in an animated sketch's `onFrame` callback, verify:
   - Animation continues running (frame error is logged, next frame renders)
   - Canvas doesn't freeze permanently
5. `pnpm dev` — gallery thumbnails all render; switching sketches works
