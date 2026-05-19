# Reuse Particle Array on Resize

## Problem

`src/sketches/flow-field-particles/sketch.ts:133` — `resetParticles()` allocates a brand-new array via `Array.from({ length: count }, spawnParticle)` on every call. This is invoked from both `onSetup` and `onResize`. On resize, the old array is thrown away, causing unnecessary GC pressure and churn.

## Approach

Mutate the existing `particles` array in-place instead of replacing it:

1. **`onSetup`** — unchanged semantic: if there's no existing array (or it's empty), populate with fresh particles. (We can keep the current `Array.from` for setup, or unify both paths.)

2. **`onResize`** — compare the new `count` against the current array length:
   - **Same count** — loop through and reassign each particle's position/ttl via `Object.assign(part, spawnParticle())` (same pattern already used in `draw` for dead particles).
   - **Smaller count** — truncate with `particles.length = count`, then reuse remaining entries as above.
   - **Larger count** — push new particles for the difference.

This avoids allocating a new array and keeps the existing particle objects alive for reuse.

## Changes

### `src/sketches/flow-field-particles/sketch.ts`

**Replace `resetParticles` function** (lines 133–136) with a mutation-only version:

```ts
function resetParticles(): void {
  const count = Math.max(1, Math.floor(params.particleCount));
  if (particles.length > count) {
    particles.length = count;
  }
  for (let i = 0; i < count; i++) {
    if (i < particles.length) {
      Object.assign(particles[i], spawnParticle());
    } else {
      particles.push(spawnParticle());
    }
  }
}
```

No other changes needed — `draw` loop still iterates `particles` the same way.

## Verification

- `pnpm dev` — visually confirm resize works without errors.
- `pnpm test:visual` — ensure snapshot tests still pass (resize behaviour isn't covered by visual tests, but no regressions elsewhere).
- `pnpm biome check --write` — formatting/lint.
- `pnpm tsc --noEmit` — typecheck.
