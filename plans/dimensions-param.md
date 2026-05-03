# Plan: Add "dimensions" parameter type

## Overview
Add a new `dimensions` parameter type rendered as two text inputs (W × H) with an "x" separator. Default `{ width: null, height: null }` means "fill screen". Implement for `grid-variations`.

---

## Files to modify

### 1. `src/types/sketch.ts`
- Add `{ type: "dimensions"; key: string; label: string }` to `SketchParameter` union
- Update `InferParams` to map `dimensions` → `{ width: number | null; height: number | null }`
- Add `width?: number | null` and `height?: number | null` to `ResponsiveCanvasOptions`

### 2. `src/utils/defineSketch.ts`
- Add `"dimensions"` to `VALID_TYPES`
- Update type check to use `VALID_TYPES.includes(type)`

### 3. `src/components/ParameterControls.svelte`
- Add `{:else if parameter.type === 'dimensions'}` block: two text inputs + "x" separator
- Add `handleDimensionsChange(parameter, dimension, event)` — parses input, emits `{ width, height }` object
  - Empty or non-numeric input → `null`; valid number → parsed integer
- Add CSS for `.dimensions-input` (flex row, monospace inputs, "x" separator)

### 4. `src/utils/responsive-canvas.ts`
- Add `width?: number | null` and `height?: number | null` to the destructured options
- `resolveSize()` returns `{ width: width ?? autoSize.width, height: height ?? autoSize.height }`
- **Behavior note**: Explicit dimensions (non-null) take precedence over auto-size and persist across `windowResized`. `null` means "fill screen" (auto-size), which does respond to resize. This matches the intent that explicit dimensions are a fixed override.

### 5. `src/sketches/grid-variations/sketch.ts`
- Add `{ type: "dimensions", key: "dimensions", label: "Canvas Size" }` to parameters
- Pass `width: params.dimensions?.width, height: params.dimensions?.height` to `attachResponsiveCanvas`

### 6. `src/sketches/grid-variations/defaults.json`
- Add `"dimensions": { "width": null, "height": null }`

### 7. Verify null preservation in params loading path
- Ensure `null` values from `defaults.json` are preserved as `null` (not `undefined`) when loaded into `params`
- Check the defaults-loading utility (likely in `defineSketch.ts` or sketch discovery) handles `null` JSON values correctly

### 7. `src/components/__tests__/ParameterControls.test.ts`
- Add `dimensionsParam` test fixture
- Add tests: renders two inputs, fires `onchange` with correct object

---

## Verification
```bash
pnpm tsc --noEmit && pnpm test:run && pnpm biome check --write
```
