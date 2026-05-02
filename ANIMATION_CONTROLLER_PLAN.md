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

```typescript
import type p5 from "p5";
import type { SketchAnimationController } from "../types/sketch.js";

export function createAnimationController(): SketchAnimationController & {
  attachToP5(p: p5): void;
} {
  let frameCount = 0;
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
      // Prevent p5's default draw loop - we drive externally
      p.noLoop();
    },
  };
}
```

---

### 3. Test Controller (`tests/visual/utils.ts`)

Calls the frame callback **exactly once** with `frameCount=1`, then stops.

```typescript
// In tests/visual/utils.ts gotoSketch():
await page.addInitScript(() => {
  // Override: tests use a one-shot controller
  window.__CREATE_TEST_CTRL__ = () => ({
    onFrame: (cb) => {
      // Call exactly once for deterministic output
      cb(1);
    },
    stop: () => {},
  });
});
```

---

### 4. App Integration (`src/App.svelte`)

Creates the appropriate controller based on environment.

```typescript
import { createAnimationController } from './utils/animation-controller.js';

function mountSketch(sketchId, options = {}) {
  // ... existing setup ...

  const controller = window.__CREATE_TEST_CTRL__ 
    ? window.__CREATE_TEST_CTRL__() 
    : createAnimationController();

  currentP5 = new p5(
    (p) => {
      sketch.create({ p, theme: currentTheme, params, rng, animation: controller });
      if (controller.attachToP5) {
        controller.attachToP5(p);
      }
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

1. **p5's `noLoop()` works synchronously** - When called in `attachToP5`, p5 should NOT start its internal draw loop
   - Testing: Check p5 source/docs - `noLoop()` sets an internal flag that prevents the draw loop from starting
   - **Confidence**: Medium - need to verify p5's behavior

2. **`p.draw()` override works** - Setting `p.draw = () => {}` in `attachToP5` should prevent the default empty draw
   - Testing: Add console.log to verify p5 doesn't call draw
   - **Confidence**: High - this is standard p5 behavior

3. **Test controller calls callback exactly once** - The test's `onFrame` implementation calls `cb(1)` synchronously
   - Testing: The sketch registers its callback via `onFrame(cb)`, then the test controller immediately calls it once
   - **Confidence**: High - straightforward callback pattern

4. **No frameCount leakage** - Using `frameCount` parameter instead of `p.frameCount` ensures deterministic output
   - Testing: `flow-field-particles` uses `frameCount * 0.002` in noise function
   - **Confidence**: High - `frameCount` is controlled externally

5. **Static sketches unaffected** - Non-animated sketches don't receive `animation`, continue using `p.draw()` or `noLoop()`
   - Testing: `grid-variations`, `stereogram`, etc. should work unchanged
   - **Confidence**: High - they simply don't use the `animation` parameter

---

## Open Questions / Risks

1. **p5 Instance Creation Timing**: When `new p5(sketchFn, container)` is called, p5:
   - Calls `sketchFn(p)` immediately
   - Inside `sketchFn`, we call `sketch.create({..., animation: controller })`
   - The sketch may call `p.setup()` and potentially start the draw loop BEFORE `controller.attachToP5(p)` is called
   
   **Risk**: Medium - If p5 starts draw loop before we call `p.noLoop()`, we have a race condition.
   
   **Mitigation**: Call `p.noLoop()` INSIDE the sketch's `create()` function, before any setup that might trigger draw.

2. **Test Controller Injection**: Using `window.__CREATE_TEST_CTRL__` with `addInitScript` should work because:
   - `addInitScript` runs BEFORE page scripts
   - When `mountSketch` runs, `window.__CREATE_TEST_CTRL__` should be available
   
   **Risk**: Low - Playwright's `addInitScript` is designed for this purpose.

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
| Production controller | Medium | Need to verify p5 noLoop() timing |
| Test controller | High | Simple callback pattern |
| Sketch refactoring | High | No branching, single code path |
| App integration | Medium | Race condition risk with p5 initialization |

**Overall**: The design is sound. Main risk is p5 initialization timing. Recommend adding `p.noLoop()` at the start of the sketch's `create()` function as a safety measure.
