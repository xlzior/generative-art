# ParameterControls Decomposition

## Problem

`ParameterControls.svelte` (260 lines) is a monolithic component that handles rendering, event handling, value formatting, and theme logic for all 6 parameter types via a single `{#if}{:else if}...` chain. Every type is a distinct concern coupled together, making the component hard to test, extend, and maintain.

Meanwhile, `DimensionsControl.svelte` (85 lines) duplicates the dimensions input UI present inside `ParameterControls`' `type === 'dimensions'` branch — the same two-text-input layout with `×` separator, same input validation, same grid layout.

## Design

Extract each parameter type into its own component in `src/components/parameters/`. All components share a single props interface — including `DimensionsControl` — so the dispatcher can use a registry map with `<svelte:component>` instead of an `{#if}` chain. Extract the shared dimensions input UI into `DimensionsInput` (pure molecule) used by `DimensionsControl`.

### TypeScript

All new `.svelte` files in `parameters/` use `<script lang="ts">` with explicit prop types. `ParameterControls.svelte` also gets `lang="ts"` in Phase 8 (its props interface benefits from types). Each component imports its relevant types from `src/types/sketch.ts`. Since these are largely new files or type-added conversions, the cost is minimal — the verification step (`pnpm tsc --noEmit` + `pnpm svelte-check --threshold warning`) confirms everything works.

### Proposed file layout

```
src/components/
├── ParameterControls.svelte           ← thin dispatcher (~30 lines)
├── parameters/
│   ├── NumberControl.svelte           ← range slider
│   ├── StringControl.svelte           ← text input
│   ├── BooleanControl.svelte          ← toggle switch
│   ├── ColourControl.svelte           ← colour picker + theme invert
│   ├── SelectControl.svelte           ← <select> dropdown
│   ├── DimensionsControl.svelte       ← unified, used by both global + per-sketch
│   ├── DimensionsInput.svelte         ← pure W×H input molecule
│   └── __tests__/
│       ├── DimensionsControl.test.ts
│       ├── DimensionsInput.test.ts
│       ├── format-param-value.test.ts
│       ├── NumberControl.test.ts
│       ├── StringControl.test.ts
│       ├── BooleanControl.test.ts
│       ├── ColourControl.test.ts
│       └── SelectControl.test.ts
└── __tests__/
    └── ParameterControls.test.ts      ← updated
```

### Component interfaces

All new components use `<script lang="ts">` and import types from `src/types/sketch.ts`. Each parameter control accepts a consistent props interface. The dispatcher passes the full parameter definition object down so each component can read its type-specific fields:

```ts
import type { SketchParameter, Theme } from "../../types/sketch.js";

// Shared props shape for parameter controls
{
  parameter: SketchParameter,  // the full definition (key, label, type, + type-specific fields)
  value: unknown,              // current value from params[parameter.key]
  onchange: (value: unknown) => void,
  theme: Theme,
}
```

The dispatcher provides `onchange` as a closure already bound to the parameter key, so child components don't need to know about keys.

### Label/input association

Currently, ParameterControls uses `for`/`id` attributes to associate labels with inputs, relying on `sketch.id` + `parameter.key` to produce unique IDs (e.g. `id="param-mona-lisa-circles-seed"`). Child components won't have access to `sketch.id`, so extracted components should use label-wrapping instead:

```svelte
<label>
  {label}
  <input ... />
</label>
```

This eliminates the `for`/`id` coupling, avoids ID generation concerns, and is semantically correct. The one exception is the `BooleanControl` toggle, which currently splits label text and toggle UI across two `<label>` elements — that can be restructured to use a `<span>` for the text label and a single `<label>` wrapping the hidden checkbox and toggle track.

### DimensionsInput (pure molecule)

Pure UI with no knowledge of sketch/parameter objects. Uses `lang="ts"`.

```svelte
<script lang="ts">
  import type { DimensionsValue } from "../../types/sketch.js";

  let {
    width,
    height,
    oninput,
  }: {
    width: DimensionsValue["width"];
    height: DimensionsValue["height"];
    oninput: (dimension: "width" | "height", event: Event) => void;
  } = $props();
</script>
```

Used only by `DimensionsControl`.

### DimensionsControl (unified)

Uses the same interface as every other parameter control. Both the global settings panel and per-sketch parameters pass a `parameter` object — the global definition is just `{ type: "dimensions", key: "dimensions", label: "Canvas Size" }` from `global-parameters.ts`. Ignored props (`theme` for dimensions) are harmless no-ops.

```svelte
<script lang="ts">
  import DimensionsInput from "./DimensionsInput.svelte";
  import type { DimensionsValue, SketchParameter, Theme } from "../../types/sketch.js";

  let {
    parameter,
    value = { width: null, height: null },
    onchange,
    theme,
  }: {
    parameter: SketchParameter;
    value: DimensionsValue;
    onchange: (value: DimensionsValue) => void;
    theme: Theme;
  } = $props();
</script>

<div class="dimensions-control">
  <label>
    {parameter.label}
    <DimensionsInput
      width={value.width}
      height={value.height}
      oninput={(dimension, event) => {
        const raw = (event.target as HTMLInputElement).value.trim();
        const parsed = raw === "" ? null : Number.parseInt(raw, 10);
        const v = Number.isFinite(parsed) ? parsed : null;
        onchange({ ...value, [dimension]: v });
      }}
    />
  </label>
</div>
```

Usage in global panel (`App.svelte`):
```svelte
<DimensionsControl parameter={{ type: "dimensions", key: "dimensions", label: "Canvas Size" }} value={global.dimensions} onchange={(v) => handleGlobalDimensionsChange(v)} {theme} />
```

Usage in per-sketch dispatch (`ParameterControls.svelte`):
```svelte
<DimensionsControl {parameter} value={params[parameter.key]} onchange={(v) => onchange(parameter.key, v)} {theme} />
```

### What moves where

| Logic | Current home | New home |
|---|---|---|
| `formatParamValue(parameter, value)` — formatting numbers (toFixed, trim), string/colour passthrough | ParameterControls | `NumberControl.svelte` (inlined), `formatParamValue` as shared utility in `parameters/format-param-value.ts` |
| `handleNumberChange(parameter, event)` | ParameterControls | `NumberControl.svelte` |
| `handleStringChange(parameter, event)` | ParameterControls | `StringControl.svelte` |
| `handleSelectChange(parameter, event)` | ParameterControls | `SelectControl.svelte` |
| `handleDimensionsChange(parameter, event)` | ParameterControls | `DimensionsControl.svelte` |
| toggle switch + animated thumb CSS | ParameterControls | `BooleanControl.svelte` |
| colour picker + `themeAccent()` invert | ParameterControls | `ColourControl.svelte` |
| Global "Canvas Size" + dimensions input UI | DimensionsControl (old) | `DimensionsControl.svelte` (new) with `parameter.label="Canvas Size"` |
| `{#if}` chain dispatching by `parameter.type` | ParameterControls | `control-map.ts` registry + `<svelte:component>` |

### Registry map (`parameters/control-map.ts`)

```ts
import NumberControl from "./NumberControl.svelte";
import StringControl from "./StringControl.svelte";
import BooleanControl from "./BooleanControl.svelte";
import ColourControl from "./ColourControl.svelte";
import SelectControl from "./SelectControl.svelte";
import DimensionsControl from "./DimensionsControl.svelte";

export const controlMap = {
  number: NumberControl,
  string: StringControl,
  boolean: BooleanControl,
  colour: ColourControl,
  select: SelectControl,
  dimensions: DimensionsControl,
} as const;
```

### ParameterControls (after decomposition)

```svelte
<script lang="ts">
import { controlMap } from "./parameters/control-map.js";
import type { SketchModuleWithDefaults } from "../types/sketch.js";
import type { Theme } from "../types/sketch.js";

let {
  sketch,
  params,
  onchange,
  theme = "light",
}: {
  sketch: SketchModuleWithDefaults<Record<string, unknown>>;
  params: Record<string, unknown>;
  onchange: (key: string, value: unknown) => void;
  theme: Theme;
} = $props();
</script>

<div id="params-list">
  {#each sketch.parameters as parameter (parameter.key)}
    <div class="param-control">
      <svelte:component
        this={controlMap[parameter.type]}
        {parameter}
        value={params[parameter.key]}
        onchange={(v) => onchange(parameter.key, v)}
        {theme}
      />
    </div>
  {/each}
</div>
```

Adding a new parameter type: create the component, add one line to `control-map.ts`. No template changes.

---

## Phase 1 — Create `formatParamValue` utility

Extract `formatParamValue` to `src/components/parameters/format-param-value.ts` since both `NumberControl` and potentially other components need it.

```ts
import type { SketchParameter } from "../../types/sketch.js";

export function formatParamValue(parameter: SketchParameter, value: unknown): string {
  if (parameter.type === "colour" || parameter.type === "string") {
    return String(value);
  }
  const num = value as number;
  if (Number.isInteger(num)) {
    return String(num);
  }
  return num
    .toFixed(3)
    .replace(/\.0+$/, "")
    .replace(/(\.\d*?)0+$/, "$1");
}
```

**Tests** (`src/components/parameters/__tests__/format-param-value.test.ts`):

| Test |
|---|
| `formatParamValue` returns stringified value for `string` type parameters |
| `formatParamValue` returns stringified value for `colour` type parameters |
| `formatParamValue` returns integer string for integer numbers |
| `formatParamValue` trims trailing zeros (3.100 → "3.1") |
| `formatParamValue` trims trailing decimal zeros (3.000 → "3") |
| `formatParamValue` preserves non-zero decimals (3.141 → "3.141") |
| `formatParamValue` handles zero correctly ("0") |

---

## Phase 2 — Create `DimensionsInput.svelte`

Extract the shared dimensions input UI from `DimensionsControl.svelte`.

```svelte
<script lang="ts">
  import type { DimensionsValue } from "../../types/sketch.js";

  let {
    width,
    height,
    oninput,
  }: {
    width: DimensionsValue["width"];
    height: DimensionsValue["height"];
    oninput: (dimension: "width" | "height", event: Event) => void;
  } = $props();
</script>

<div class="dimensions-input">
  <input
    type="text"
    inputmode="numeric"
    value={width ?? ""}
    oninput={(e) => oninput("width", e)}
    placeholder="W"
  />
  <span class="dimensions-separator">×</span>
  <input
    type="text"
    inputmode="numeric"
    value={height ?? ""}
    oninput={(e) => oninput("height", e)}
    placeholder="H"
  />
</div>

<style>
  /* same styles as current .dimensions-input in both files */
</style>
```

**Tests** (`src/components/parameters/__tests__/DimensionsInput.test.ts`):

| Test |
|---|
| renders two inputs with W and H placeholders |
| renders `×` separator between inputs |
| displays width and height values passed as props |
| renders empty inputs when values are null |
| calls `oninput("width", event)` when first input changes |
| calls `oninput("height", event)` when second input changes |

---

## Phase 3 — Create `NumberControl.svelte`

Renders a range slider with formatted value display. Calls `formatParamValue`.

Props: `{ parameter: SketchParameter & { type: "number" }, value: number, onchange: (v: number) => void, theme: Theme }`.

**Tests** (`src/components/parameters/__tests__/NumberControl.test.ts`):

| Test |
|---|
| renders label from parameter definition |
| renders formatted value |
| renders range input with min, max, step from parameter |
| sets range input value from `value` prop |
| calls `onchange` with parsed number on input |
| handles integer value formatting (no decimals) |
| handles decimal value formatting (3 decimals, trimmed) |

---

## Phase 4 — Create `StringControl.svelte`

**Tests** (`src/components/parameters/__tests__/StringControl.test.ts`):

| Test |
|---|
| renders label from parameter definition |
| renders text input with current value |
| calls `onchange` with string value on input |
| shows empty string when value is undefined/null |

---

## Phase 5 — Create `BooleanControl.svelte`

Toggle switch with animated thumb.

**Tests** (`src/components/parameters/__tests__/BooleanControl.test.ts`):

| Test |
|---|
| renders toggle with label |
| checkbox reflects `value` prop (checked when truthy) |
| `aria-checked` matches `value` prop |
| calls `onchange` with `true` when unchecked checkbox is toggled on |
| calls `onchange` with `false` when checked checkbox is toggled off |

---

## Phase 6 — Create `ColourControl.svelte`

Colour picker with `themeAccent()` inversion.

**Tests** (`src/components/parameters/__tests__/ColourControl.test.ts`):

| Test |
|---|
| renders label from parameter definition |
| renders colour input with theme-inverted value |
| calls `onchange` with inverted colour value on input |
| passes value through `themeAccent` correctly in dark theme |
| passes value through `themeAccent` correctly in light theme |

---

## Phase 7 — Create `SelectControl.svelte`

**Tests** (`src/components/parameters/__tests__/SelectControl.test.ts`):

| Test |
|---|
| renders label from parameter definition |
| renders option elements for each entry in `parameter.options` |
| marks the matching option as selected based on `value` prop |
| calls `onchange` with selected option value on change |
| renders each option's label text |

---

## Phase 8 — Create `control-map.ts`, rewire `ParameterControls.svelte`, update `App.svelte`, delete old `DimensionsControl.svelte`

Create `src/components/parameters/control-map.ts`:

```ts
import NumberControl from "./NumberControl.svelte";
import StringControl from "./StringControl.svelte";
import BooleanControl from "./BooleanControl.svelte";
import ColourControl from "./ColourControl.svelte";
import SelectControl from "./SelectControl.svelte";
import DimensionsControl from "./DimensionsControl.svelte";

export const controlMap = {
  number: NumberControl,
  string: StringControl,
  boolean: BooleanControl,
  colour: ColourControl,
  select: SelectControl,
  dimensions: DimensionsControl,
} as const;
```

In `ParameterControls.svelte`:
- Add `<script lang="ts">` and import `controlMap` from `./parameters/control-map.js`
- Replace the `{#if}` chain with `<svelte:component this={controlMap[parameter.type]} ...>`
- Remove all handler functions, `formatParamValue`, and parameter-specific `<style>` rules
- Keep only grid layout for `.param-control` wrappers and `#params-list`

In `App.svelte`:
- Change `import DimensionsControl from "./components/DimensionsControl.svelte"` to `import DimensionsControl from "./components/parameters/DimensionsControl.svelte"`
- Update usage to pass `parameter` object and `theme`:
  ```svelte
  <DimensionsControl parameter={{ type: "dimensions", key: "dimensions", label: "Canvas Size" }} value={global.dimensions} onchange={(v) => handleGlobalDimensionsChange(v)} {theme} />
  ```

Delete `src/components/DimensionsControl.svelte`.

**Tests** (`src/components/__tests__/ParameterControls.test.ts` — update existing):

Most rendering detail tests move to child component tests. Update to verify dispatch:

| Test |
|---|
| renders all parameter types via child components |
| passes `onchange` bound to correct parameter key |
| passes `value` from `params` to each child component |
| passes `theme` to child components |

**`App.svelte` integration check:** `pnpm dev` / `pnpm build` verifies the global dimensions control still works.

---

## Execution order

```
Phase 1:  formatParamValue utility + tests
Phase 2:  DimensionsInput molecule + tests
Phase 3:  NumberControl + tests
Phase 4:  StringControl + tests
Phase 5:  BooleanControl + tests
Phase 6:  ColourControl + tests
Phase 7:  SelectControl + tests
Phase 8:  Thin ParameterControls + delete old DimensionsControl.svelte + update tests
```

Phases 3–7 are independent of each other and can be done in parallel (they only depend on Phase 1). Phase 2 must precede Phase 8 (because the new `DimensionsControl` used in the dispatcher depends on `DimensionsInput`). Phase 8 is the final integration step: rewire `ParameterControls` to import from child components, then delete `src/components/DimensionsControl.svelte` and update `App.svelte` to import `DimensionsControl` from `parameters/` instead.

---

## Verification

```bash
pnpm tsc --noEmit                          # types pass after each phase
pnpm test:run                              # all tests pass
pnpm svelte-check --threshold warning      # 0 errors
pnpm biome check --write                   # formatting
```
