# Plan: Add "dimensions" parameter type ✅ IMPLEMENTED

## Overview
Add a new `dimensions` parameter type rendered as two text inputs (W × H) with an "x" separator. Default `{ width: null, height: null }` means "fill screen". Implement for `grid-variations`.

---

## Files modified

### 1. `src/types/sketch.ts` ✅
- Added `{ type: "dimensions"; key: string; label: string }` to `SketchParameter` union
- Added `DimensionsValue` type and updated `InferParams` to map `dimensions` → `DimensionsValue`
- Added `width?: number | null` and `height?: number | null` to `ResponsiveCanvasOptions`

### 2. `src/utils/defineSketch.ts` ✅
- Added `"dimensions"` to `VALID_TYPES`
- Updated type check to use `VALID_TYPES.includes(type)`

### 3. `src/components/ParameterControls.svelte` ✅
- Added `{:else if parameter.type === 'dimensions'}` block: two text inputs + "x" separator
- Added `handleDimensionsChange(parameter, event)` — parses input, emits `{ width, height }` object
  - Empty or non-numeric input → `null`; valid number → parsed integer
- Added CSS for `.dimensions-input` (flex row, monospace inputs, "x" separator)

### 4. `src/utils/responsive-canvas.ts` ✅
- Added `width?: number | null` and `height?: number | null` to the destructured options
- `resolveSize()` returns `{ width: width ?? autoSize.width, height: height ?? autoSize.height }`
- **Behavior note**: Explicit dimensions (non-null) take precedence over auto-size and persist across `windowResized`. `null` means "fill screen" (auto-size), which does respond to resize.

### 5. `src/sketches/grid-variations/sketch.ts` ✅
- Added `{ type: "dimensions", key: "dimensions", label: "Canvas Size" }` to parameters
- Pass `width: params.dimensions?.width, height: params.dimensions?.height` to `attachResponsiveCanvas`

### 6. `src/sketches/grid-variations/defaults.json` ✅
- Added `"dimensions": { "width": null, "height": null }`

### 7. Verify null preservation in params loading path ✅
- Verified: `cloneDefaults()` in `App.svelte` uses spread operator which preserves `null` values
- `null` values from `defaults.json` are correctly preserved when loaded into `params`

### 8. `src/components/__tests__/ParameterControls.test.ts` ✅
- Added `dimensionsParam` test fixture
- Added tests: renders two inputs, fires `onchange` with correct object

### 9. `src/sketches/validation.ts` ✅
- Updated `validateDefaultValue` to handle `dimensions` type
- Allows `null` or object with `width`/`height` as numbers or `null`

### 10. `src/vite/endpoint-utils.ts` ✅
- Updated `DefaultsPayload` type to include dimensions objects
- Updated validation to accept dimensions objects in defaults payload

---

## Verification
```bash
pnpm tsc --noEmit && pnpm test:run && pnpm biome check --write
```
All checks pass ✅
