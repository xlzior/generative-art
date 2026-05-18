# Select Parameter Type Implementation

Add a new `"select"` SketchParameter variant with typed options, improving the stereogram sketch.

---

## Phase 1 — Type system

### Files
- `src/types/sketch.ts`

### Changes
1. Add the `select` variant to the `SketchParameter` discriminated union.
   **Important**: Use `ReadonlyArray` (not `Array`) — the `as const satisfies` pattern produces deeply readonly types, and `ReadonlyArray` accepts them while `Array` would reject them.

```typescript
| {
    type: "select";
    key: string;
    label: string;
    options: ReadonlyArray<{ label: string; value: string }>;
  }
```

2. Add a `"select"` branch to `InferParams` that extracts the literal union of `value` strings:

```typescript
K extends { type: "select" }
  ? K["options"] extends ReadonlyArray<{ value: infer V }>
    ? V
    : never
  : never;
```

This relies on `as const` preserving literal types through `satisfies`. For example:

```typescript
const parameters = [
  { type: "select", key: "viewMode", label: "View Mode", options: [
    { label: "Parallel View", value: "parallel" },
    { label: "Depth Map", value: "depth" },
  ] },
] as const satisfies readonly SketchParameter[];

type Params = InferParams<typeof parameters>;
// => { viewMode: "parallel" | "depth" }
```

Verified: this approach compiles correctly via a test file.

### Verification
- `pnpm tsc --noEmit` passes
- A sketch with `as const satisfies readonly SketchParameter[]` and a select param correctly infers literal value unions

---

## Phase 2 — Validation

### Files
- `src/utils/defineSketch.ts`

### Changes
1. Add `"select"` to `VALID_TYPES`

2. In `validateParameter()`, add a check for `"select"`:
   - `options` must exist and be a non-empty array
   - Each item must have a non-empty `label` (string)
   - Each item must have a non-empty `value` (string)
   - **No duplicate `value` strings** across options (prevents ambiguity)
   - **Reject empty string values** (`value: ""`) — empty string is `<select>`'s default unselected state in browsers, which can cause edge cases

```typescript
if (parameter.type === "select") {
  if (!Array.isArray(parameter.options) || parameter.options.length === 0) {
    throw new TypeError(
      `Sketch parameter ${parameter.key} must have a non-empty options array.`,
    );
  }

  const seenValues = new Set<string>();
  for (const opt of parameter.options) {
    if (typeof opt.label !== "string" || opt.label.trim() === "") {
      throw new TypeError(
        `Sketch parameter ${parameter.key} has an option with a missing or empty label.`,
      );
    }
    if (typeof opt.value !== "string" || opt.value === "") {
      throw new TypeError(
        `Sketch parameter ${parameter.key} has an option with a missing or empty value.`,
      );
    }
    if (seenValues.has(opt.value)) {
      throw new TypeError(
        `Sketch parameter ${parameter.key} has duplicate option value: "${opt.value}".`,
      );
    }
    seenValues.add(opt.value);
  }
}
```

### Verification
- `pnpm tsc --noEmit` passes
- `pnpm test:run` passes (existing validation tests)

---

## Phase 3 — Default validation

### Files
- `src/sketches/validation.ts`

### Changes
1. Add a `"select"` branch in `validateDefaultValue()`:
   - Default must be a string
   - Must match at least one `options[*].value`
   - If the default doesn't match any option, throw a descriptive error

```typescript
} else if (parameter.type === "select") {
  if (typeof value !== "string") {
    throw new TypeError(
      `Sketch ${sketchId} defaults.json key ${parameter.key} must be a string matching one of the select options.`,
    );
  }
  const validValues = parameter.options.map((o) => o.value);
  if (!validValues.includes(value)) {
    throw new TypeError(
      `Sketch ${sketchId} defaults.json key ${parameter.key} has value "${value}" which is not a valid option. Valid options: ${validValues.join(", ")}`,
    );
  }
}
```

### Verification
- `pnpm tsc --noEmit` passes
- `pnpm test:run` passes

---

## Phase 4 — UI rendering

### Files
- `src/components/ParameterControls.svelte`

### Changes
1. Add a `handleSelectChange` handler:

```typescript
function handleSelectChange(parameter, event) {
  const value = event.target.value;
  onchange(parameter.key, value);
}
```

2. Add a new `{:else if parameter.type === 'select'}` branch in the template (between `"colour"` and `"dimensions"`):

```svelte
{:else if parameter.type === 'select'}
  <label for="param-{sketch.id}-{parameter.key}">{parameter.label}</label>
  <select
    id="param-{sketch.id}-{parameter.key}"
    onchange={(e) => handleSelectChange(parameter, e)}
  >
    {#each parameter.options as option}
      <option
        value={option.value}
        selected={params[parameter.key] === option.value}
      >
        {option.label}
      </option>
    {/each}
  </select>
```

Note: Using `selected` attribute per-option rather than `value` binding on `<select>`. This is slightly more robust when the param value might be undefined/missing — `selected` is simply false for all options, which means the browser shows the first option but `params` stays as-is. The alternative (`value` prop on `<select>`) would auto-select the first option when no match is found, which could silently overwrite an undefined param.

3. Add CSS for the `<select>` element. Style it to match the text inputs — same font, padding, and `grid-column: 1 / span 2; width: 100%` to fill the control width (like `input[type="range"]`):

```css
.param-control select {
  grid-column: 1 / span 2;
  width: 100%;
  font: inherit;
  padding: 0.15rem 0.3rem;
  border: 1px solid var(--stroke);
  border-radius: 4px;
  background: var(--surface);
  color: var(--ink);
}
```

### Verification
- `pnpm tsc --noEmit` passes
- `pnpm svelte-check --threshold warning` passes
- Manual: open dev server, verify dropdown renders and changes propagate correctly

### Edge cases
- **Undefined param value**: When `params[parameter.key]` is `undefined`, all `selected` attributes are false. The browser shows the first option but `params` keeps its (undefined) value. This is acceptable — the sketch will re-render when a selection is made, and `validateDefaultValue` ensures a valid default is loaded.
- **Biome lint suppression**: The existing file has a `// biome-ignore-all lint/correctness/noUnusedVariables` comment at the top. The new `handleSelectChange` will be covered by it.

---

## Phase 5 — Tests

### Files
- `src/components/__tests__/ParameterControls.test.ts`

### Changes
1. **Update `createMockSketch`** to handle the `"select"` type:

```typescript
else if (p.type === "select") defaults[p.key] = p.options[0].value;
```

This ensures select parameters get a valid default in test fixtures.

2. Add a `selectParam` fixture:

```typescript
const selectParam: SketchParameter = {
  key: "viewMode",
  label: "View Mode",
  type: "select",
  options: [
    { label: "Parallel View", value: "parallel" },
    { label: "Depth Map", value: "depth" },
    { label: "Cross View", value: "cross" },
  ],
};
```

3. Add tests:

```typescript
it("renders select element with options", () => {
  const sketch = createMockSketch([selectParam]);
  render(ParameterControls, {
    props: {
      sketch,
      params: { viewMode: "parallel" },
      onchange: handleChange,
    },
  });

  expect(screen.getByLabelText("View Mode")).toBeInTheDocument();
  expect(screen.getByDisplayValue("Parallel View")).toBeInTheDocument();

  const select = screen.getByLabelText("View Mode");
  const options = select.querySelectorAll("option");
  expect(options).toHaveLength(3);
  expect(options[0]).toHaveValue("parallel");
  expect(options[1]).toHaveValue("depth");
  expect(options[2]).toHaveValue("cross");
});

it("calls onchange with correct key/value when select changes", async () => {
  const sketch = createMockSketch([selectParam]);
  render(ParameterControls, {
    props: {
      sketch,
      params: { viewMode: "parallel" },
      onchange: handleChange,
    },
  });

  const select = screen.getByLabelText("View Mode");
  await fireEvent.change(select, { target: { value: "depth" } });

  expect(onChangeCalls).toHaveLength(1);
  expect(onChangeCalls[0]).toEqual(["viewMode", "depth"]);
});
```

Note: Using `getByLabelText("View Mode")` instead of `getByRole("combobox")` — the implicit ARIA role for `<select>` varies across testing-library versions and environments (could be "combobox" or "listbox"). `getByLabelText` is more reliable since we have proper `for`/`id` associations.

### Verification
- `pnpm test:run` passes

---

## Phase 6 — Stereogram sketch migration

### Files
- `src/sketches/stereogram/sketch.ts`
- `src/sketches/stereogram/defaults.json`

### Changes
1. Replace the boolean `viewMode` parameter with a `"select"` parameter:

```typescript
{
  type: "select",
  key: "viewMode",
  label: "View Mode",
  options: [
    { label: "Parallel View", value: "parallel" },
    { label: "Depth Map", value: "depth" },
    { label: "Cross View", value: "cross" },
  ],
},
```

Remove the old `{ type: "boolean", key: "viewMode", label: "Show Depth Map" }`.

2. Update description text from:
   `"A random-dot autostereogram for parallel viewing. Toggle to show the depth map."`
   to:
   `"A random-dot autostereogram. Switch between parallel view, depth map, and cross view."`

3. Update rendering logic. Replace the boolean branch (`if/else` on `params.viewMode`) with three branches:

   - **`"parallel"`** — Current stereogram rendering (unchanged from `!params.viewMode`)
   - **`"depth"`** — Current depth map rendering (unchanged from `params.viewMode`)
   - **`"cross"`** — New cross-view stereogram

   **Cross-view algorithm detail**:
   The cross-view algorithm copies from the right instead of the left, and the base pattern is on the right side of each row. Since source pixels are to the right (not yet computed in left-to-right order), iterate **right-to-left**:

```typescript
if (params.viewMode === "cross") {
  // Cross-view stereogram: inverse of parallel
  // Seed the base pattern on the right side of each row
  for (let y = 0; y < height; y += 1) {
    const rowOffset = y * width;
    const rowPixels = new Uint8Array(width);

    const baseStart = Math.max(0, width - period);
    for (let x = baseStart; x < width; x += 1) {
      rowPixels[x] = rowTone(params.seed, y, x);
    }

    // Walk right-to-left, copying from the right
    for (let x = baseStart - 1; x >= 0; x -= 1) {
      const shift = Math.round(depthMap[rowOffset + x] * maxOffset);
      const repeatDistance = Math.max(1, period - shift);
      const sourceX = x + repeatDistance;

      if (sourceX < width) {
        rowPixels[x] = rowPixels[sourceX];
      } else {
        rowPixels[x] = rowTone(params.seed, y, x);
      }
    }

    for (let x = 0; x < width; x += 1) {
      const tone = rowPixels[x];
      const pixelIndex = (rowOffset + x) * 4;
      pixels[pixelIndex] = tone;
      pixels[pixelIndex + 1] = tone;
      pixels[pixelIndex + 2] = tone;
      pixels[pixelIndex + 3] = 255;
    }
  }
}
```

4. Update `defaults.json`:

```json
"viewMode": "parallel"
```

Replace the old `"viewMode": false`.

### Verification
- `pnpm tsc --noEmit` passes
- `pnpm test:run` passes
- Manual: all three modes render correctly via dev server (visually inspect)

### Note on future visual tests
The stereogram already has Playwright visual tests. The cross-view mode may warrant a dedicated snapshot test, but this can be added separately from this implementation.

---

## Phase 7 — Final checks

### Steps
1. `pnpm biome check --write` — formatting/lint
2. `pnpm tsc --noEmit` — typecheck
3. `pnpm svelte-check --threshold warning` — Svelte typecheck
4. `pnpm test:run` — unit tests
5. `pnpm test:visual` — visual regression tests

All must pass before considering the implementation complete.
