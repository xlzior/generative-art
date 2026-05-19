# Per-Sketch Speed Multiplier

## Problem

All animated sketches run at the browser's native refresh rate (~60fps) via `requestAnimationFrame`. There is no mechanism to control animation speed — every frame callback fires on every rAF tick. The `frameRate` parameter in Cellular Automata is dead code because `p.noLoop()` disables p5's internal draw loop and the external rAF loop ignores it.

## Solution

Add a `speed` property to `SketchAnimationController` that uses a **fixed-timestep accumulator** to decouple animation ticks from rAF callbacks.

## Implementation Steps

### 1. Update `SketchAnimationController` type

**File:** `src/types/sketch.ts`

- Add `speed: number` property (getter/setter) to the interface

### 2. Modify `animation-controller.ts`

Switch from per-rAF callback to a fixed-timestep accumulator:

```
TICK_DURATION = 1000 / 60  // ~16.67ms
MAX_TICKS_PER_FRAME = 5   // safety cap to prevent spiral of death

On each rAF:
  if lastTime is null:
    lastTime = performance.now()  // init on first frame
    return                         // skip first frame to avoid 0-dt burst

  now = performance.now()
  elapsed = now - lastTime
  lastTime = now

  accumulator += elapsed * speed
  ticks = 0

  while accumulator >= TICK_DURATION && ticks < MAX_TICKS_PER_FRAME:
    frameCount++
    renderer(frameCount)
    accumulator -= TICK_DURATION
    ticks++
```

- `speed` defaults to `1`, clamped to `Math.max(0.01, speed)` to prevent freeze at 0
- `speed = 0.5` → half-speed (1 tick per ~33ms)
- `speed = 2` → double-speed (2 ticks per rAF when possible)
- `frameCount` still increments by 1 per tick — modulo-based logic (e.g. `frameCount % N === 0`) works unchanged

### 3. Update each animated sketch

Each sketch sets `animation.speed` **before** calling `animation.onFrame()` (since `onFrame()` immediately starts the rAF loop), then adds a `speed` parameter:

| Sketch | Param Name | Range | Step | Default | Notes |
|--------|-----------|-------|------|---------|-------|
| Cellular Automata | `speed` | 0.05–2 | 0.05 | 0.167 (~10fps equiv) | Replaces dead `frameRate` param; remove `frameRate` from parameter defs. Saved `frameRate` defaults will be stale — manual reset needed. |
| Flow Field Particles | `speed` | 0.05–2 | 0.05 | 1 | New param |
| Lightning | `speed` | 0.05–2 | 0.05 | 1 | New param |

### 4. Update visual test mock

**File:** `tests/visual/utils.ts`

- Ensure test mock controller accepts and stores `speed` (no behavioral change needed for single-frame snapshots)

### 5. Update `defaults.json` for each animated sketch

Add the `speed` default to each sketch's `defaults.json`.

### 6. Cleanup

- Remove the dead `p.frameRate()` call in Cellular Automata

## Backward Compatibility

- Sketches that don't set `speed` use default `1` — existing behavior unchanged
- `onFrame()` signature unchanged — `frameCount` still passed as before
- No changes to `defineSketch`, `SketchContext`, or global parameters
- Cellular Automata's `frameRate` param is removed — saved defaults with that key are orphaned (minor)

## Known Limitations

- **Fixed-timestep produces choppy slow-motion for continuous animations.** With speed < 1, the callback fires fewer times per second. For discrete/tick-based animations (Cellular Automata) this is ideal, but for continuous animations (Flow Field Particles) it produces stuttering rather than smooth slow-motion. Smooth slow-motion would require a dt-based approach where the callback fires every rAF and the sketch scales movement by delta time — that's a per-sketch enhancement beyond this scope.
