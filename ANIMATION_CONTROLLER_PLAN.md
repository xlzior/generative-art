# Animation Controller Refactoring Plan

## Problem Statement

Animated sketches (`flow-field-particles`, `cellular-automata`) use p5's internal `p.draw()` loop, making visual regression tests non-deterministic. The current approach of trying to stop/override p5's draw loop is fragile and complex.

## Solution: Dependency Injection via Animation Controller

### Core Principle
The sketch should only interact with the `animation` controller **interface**. The **implementation** differs between production and tests, but the sketch calls it identically - **no branching** in sketch code.

---

## Design

### 1. Interface (`src/types/sketch.ts`)

```typescript
export interface SketchAnimationController {
  /**
   * Register a callback to be called on each animation frame.
   * The callback receives the current frame count (starts at 1).
   */
  onFrame: (renderer: (frameCount: number) => void) => void;
  /**
   * Stop the animation loop.
   */
  stop: () => void;
}
```

Added to `SketchContext`:
```typescript
export interface SketchContext<TParams extends Record<string, unknown>> {
  p: p5;
  theme: Theme;
  params: TParams;
  rng: Rng;
  animation?: SketchAnimationController; // Only present for animated sketches
}
```

---

### 2. Production Controller (`src/utils/animation-controller.ts`)

Drives animation via `requestAnimationFrame`, calling the sketch's render callback continuously.

**Important**: `attachToP5(p)` MUST be called before the sketch's `create()` function to prevent p5 from starting its internal draw loop.

```typescript
import type p5 from "p5";
import type { SketchAnimationController } from "../types/sketch.js";

export function createAnimationController(): SketchAnimationController & {
  attachToP5(p: p5): void;
  destroy(): void;
} {
  let frameCount = -1; // Initialized to -1 so first increment results in 0, matching p5's frameCount (starts at 0)
  let renderer: ((frameCount: number) => void) | null = null;
  let animating = false;
  let rafId: number | null = null;

  function loop() {
    if (!animating) return;
    frameCount++;
    renderer?.(frameCount);
    rafId = requestAnimationFrame(loop);
  }

  return {
    onFrame: (cb) => {
      renderer = cb;
      if (!animating) {
        animating = true;
        loop();
      }
    },
    stop: () => {
      animating = false;
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
    },
    attachToP5(p: p5) {
      // MUST be called before sketch.create() to prevent p5's draw loop
      p.noLoop();
    },
    destroy() {
      // Cleanup on sketch unmount
      animating = false;
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      renderer = null;
    },
  };
}
```

---

### 3. Test Controller (`tests/visual/utils.ts`)

Calls the frame callback **exactly once** with `frameCount=0`, then stops. This matches p5's `frameCount` which starts at 0.

```typescript
// In tests/visual/utils.ts gotoSketch():
await page.addInitScript(() => {
  // Override: tests use a one-shot controller
  window.__CREATE_TEST_CTRL__ = () => ({
    onFrame: (cb) => {
      // Call exactly once for deterministic output
      cb(0);
    },
    stop: () => {},
  });
});
```

---

### 4. App Integration (`src/App.svelte`)

Creates the appropriate controller based on environment, attaches to p5 **before** sketch initialization, and cleans up on unmount.

```typescript
import { createAnimationController } from './utils/animation-controller.js';

// Store current controller for cleanup
let currentController: ReturnType<typeof createAnimationController> | null = null;

function unmountSketch() {
  if (currentController) {
    currentController.destroy();
    currentController = null;
  }
  if (currentP5) {
    currentP5.remove();
    currentP5 = null;
  }
}

function mountSketch(sketchId, options = {}) {
  unmountSketch(); // Clean up previous sketch/controller first

  // ... existing setup (load sketch, theme, params, rng) ...

  const isTest = !!window.__CREATE_TEST_CTRL__;
  const controller = isTest
    ? window.__CREATE_TEST_CTRL__()
    : createAnimationController();

  if (!isTest) {
    currentController = controller as ReturnType<typeof createAnimationController>;
  }

  currentP5 = new p5(
    (p) => {
      // Attach to p5 FIRST to prevent default draw loop
      if (!isTest) {
        controller.attachToP5(p);
      }
      // Then initialize sketch with controller
      sketch.create({ p, theme: currentTheme, params, rng, animation: controller });
    },
    container,
  );

  // ... rest of function
}
```

---

### 5. Sketch Refactoring (NO BRANCHING)

Both `flow-field-particles/sketch.ts` and `cellular-automata/sketch.ts` follow the **same pattern**:

```typescript
import type { SketchAnimationController } from "../../types/sketch.js";

create({ p, theme, params, rng, animation }: SketchContext<Params> & { animation?: SketchAnimationController }) {
  // ... setup code (colors, particles, etc.) ...

  attachResponsiveCanvas(p, { /* ... */ });

  // Single path - no if/else
  if (animation) {
    animation.onFrame((frameCount) => {
      // ALL draw logic here - identical to what was in p.draw()
      p.fill(...);
      for (const part of particles) { /* ... */ }
      // Use frameCount instead of p.frameCount
    });
  }
  // If no animation controller provided, sketch is static - no animation
}
```

**Key Points:**
- No `if (animation) { ... } else { p.draw = () => { ... } }` - this was the problematic duplication
- The sketch ONLY uses `animation.onFrame()` when available
- Static sketches simply don't receive an `animation` parameter

---

## Files to Modify

| File | Change |
|------|--------|
| `src/types/sketch.ts` | Add `SketchAnimationController` interface, add `animation?` to `SketchContext` |
| `src/utils/animation-controller.ts` | **NEW** - Production animation controller |
| `src/App.svelte` | Import controller, create in `mountSketch`, expose test hook via `window.__CREATE_TEST_CTRL__` |
| `src/sketches/flow-field-particles/sketch.ts` | Use `animation.onFrame()` instead of `p.draw()` |
| `src/sketches/cellular-automata/sketch.ts` | Use `animation.onFrame()` instead of `p.draw()` |
| `tests/visual/utils.ts` | Add `addInitScript` to inject test controller, simplify `waitForRender` |

---

## Verification Checklist

Before implementing, I need to verify:

1. ~~**p5's `noLoop()` works synchronously**~~ - **RESOLVED**: `attachToP5(p)` is now called before `sketch.create()`, ensuring `p.noLoop()` executes before any sketch setup.
   - **Confidence**: High - `noLoop()` sets an internal flag synchronously

2. **`p.draw()` override works** - Setting `p.draw = () => {}` in `attachToP5` should prevent the default empty draw
   - Testing: Add console.log to verify p5 doesn't call draw
   - **Confidence**: High - this is standard p5 behavior

3. **Test controller calls callback exactly once** - The test's `onFrame` implementation calls `cb(1)` synchronously
   - Testing: The sketch registers its callback via `onFrame(cb)`, then the test controller immediately calls it once
   - **Confidence**: High - straightforward callback pattern
   - **Note**: Verify canvas is ready when `cb(1)` is called synchronously during `create()`

4. **No frameCount leakage** - Using `frameCount` parameter instead of `p.frameCount` ensures deterministic output
   - Testing: `flow-field-particles` uses `frameCount * 0.002` in noise function
   - **Confidence**: High - `frameCount` is controlled externally
   - **Note**: Production controller starts at 0 (initialized to -1, increments before first call), matching p5's `frameCount` behavior (p5 starts at 0)

5. **Static sketches unaffected** - Non-animated sketches don't receive `animation`, continue using `p.draw()` or `noLoop()`
   - Testing: `grid-variations`, `stereogram`, etc. should work unchanged
   - **Confidence**: High - they simply don't use the `animation` parameter

6. **Controller cleanup on unmount** - `destroy()` cancels pending `requestAnimationFrame` and nulls renderer
   - Testing: Switch sketches rapidly, verify no stale animation frames
   - **Confidence**: High - explicit cleanup via `unmountSketch()`

---

## Open Questions / Risks

1. **p5 Instance Creation Timing** ~~(RESOLVED)~~: `attachToP5(p)` is now called **before** `sketch.create()` inside the p5 sketch function. This ensures `p.noLoop()` executes before the sketch can set up any draw behavior.

2. **Test Controller Injection**: Using `window.__CREATE_TEST_CTRL__` with `addInitScript` should work because:
   - `addInitScript` runs BEFORE page scripts
   - When `mountSketch` runs, `window.__CREATE_TEST_CTRL__` should be available
   
   **Risk**: Low - Playwright's `addInitScript` is designed for this purpose.

3. **Controller Cleanup on Unmount**: `destroy()` method added to production controller. `unmountSketch()` calls it before removing p5 instance to cancel any pending `requestAnimationFrame`.

---

## Suggested Implementation Order

1. Add `SketchAnimationController` to `src/types/sketch.ts`
2. Create `src/utils/animation-controller.ts`
3. Update `src/App.svelte` to use controller
4. Refactor `flow-field-particles/sketch.ts`
5. Refactor `cellular-automata/sketch.ts`
6. Update `tests/visual/utils.ts` with test controller
7. Run `pnpm tsc --noEmit` to verify types
8. Run `pnpm dev` and manually test all sketches
9. Run `pnpm test:visual` to verify tests pass

---

## Confidence Assessment

| Aspect | Confidence | Notes |
|---------|-------------|-------|
| Interface design | High | Clean separation, follows seeded RNG pattern |
| Production controller | High | frameCount starts at 0 (matching p5), noLoop() called before sketch init |
| Test controller | High | Simple callback pattern, calls cb(0) for consistency |
| Sketch refactoring | High | No branching, single code path |
| App integration | High | Race condition resolved, cleanup via destroy() |

**Overall**: The design is sound. Main risk is p5 initialization timing. Recommend adding `p.noLoop()` at the start of the sketch's `create()` function as a safety measure.
