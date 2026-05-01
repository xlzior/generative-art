# Testing Plan for Generative Art Application

## Goal
Prevent regressions when working on TODO items. Tests should be resilient to implementation changes — they must verify behavior, not internal structure.

---

## Testing Strategy

| Type | Tool | What It Catches | Resilience |
|------|------|----------------|------------|
| Contract tests | Vitest | Sketch system contract violations | High — tests public API |
| Visual regression | Playwright | Rendering output changes | High — tests output |
| Component tests | Vitest + @testing-library/svelte | UI behavior regressions | Medium — depends on DOM |

---

## Phase 1: Contract Tests (Vitest)

Test the sketch system's public contract. No seeded randomness needed.

### Prerequisites
- Package manager: `pnpm` (per project conventions)
- Existing `tsconfig.json` with strict mode and `"moduleResolution": "bundler"`

### Install Dependencies
```bash
pnpm add -D vitest @sveltejs/vite-plugin-svelte
```
- `vitest`: Test runner integrated with Vite toolchain
- `@sveltejs/vite-plugin-svelte`: Enables Svelte 5 (runes) support in Vitest for any Svelte file imports

### Configure Vitest
Create `vitest.config.ts` in project root:
```typescript
import { defineConfig } from 'vitest/config';
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default defineConfig({
  plugins: [svelte({ runes: true })],
  test: {
    include: ['src/**/*.{test,spec}.ts'],
    exclude: ['node_modules', 'dist', 'tests/visual', 'tests/component'],
    tsconfig: './tsconfig.json',
  },
});
```

Add test scripts to `package.json`:
```json
{
  "scripts": {
    "test": "vitest",
    "test:run": "vitest run"
  }
}
```

### 1.1 `defineSketch()` Validation (`src/utils/__tests__/defineSketch.test.ts`)
Tests the public API of `defineSketch()` from `src/utils/defineSketch.ts` with no mocked dependencies.

#### Detailed Test Cases:
1. **Valid sketch passes**
   - Input: Complete sketch with all required fields and valid number parameter:
     ```typescript
     defineSketch({
       id: 'test-sketch',
       title: 'Test Sketch',
       date: '2026-01-01',
       description: 'Test sketch for contract validation',
       parameters: [
         { id: 'size', type: 'number', min: 0, max: 100, step: 1, default: 50 }
       ],
       create: (ctx) => ctx.canvas.getContext('2d')!,
     })
     ```
   - Expect: No error thrown, returns sketch object with correct `id` and `parameters`

2. **Missing required fields throw**
   - Test each required field individually: omit `id`, `title`, `date`, `description`, `parameters`, `create`
   - Test multiple missing fields (e.g., omit `id` and `title`)
   - Expect: Throws error mentioning missing field name(s)

3. **Invalid parameter types throw**
   - Parameter with `type: 'invalid'` (only `number`/`boolean` permitted per contract)
   - Parameter missing `type` field
   - Parameter `id` is non-string (e.g., numeric `123`)
   - Expect: Throws error indicating invalid parameter type

4. **Duplicate parameter keys throw**
   - Input: Two parameters with identical `id: 'size'`
   - Expect: Throws error referencing duplicate parameter ID

5. **Number parameter validation**
   - `min >= max` (e.g., `min: 100, max: 50`) → throws
   - `step <= 0` (e.g., `step: 0` or `step: -1`) → throws
   - `default` outside `[min, max]` range (e.g., `min: 0, max: 100, default: 150`) → throws (if enforced by contract)
   - Valid number parameter (`min: 0, max: 100, step: 2, default: 50`) → passes

### 1.2 Sketch Auto-Discovery (`src/sketches/__tests__/validation.test.ts`)
First refactor `src/sketches/index.ts` to extract validation/sorting logic into pure, testable functions.

#### Refactoring Steps:
1. Create `src/sketches/validation.ts`:
   ```typescript
   import type { Sketch } from './types'; // Adjust per actual project types

   /** Validate sketch module against contract and matching defaults */
   export function validateSketchModule(
     sketch: Sketch,
     defaults: Record<string, number>
   ): void { /* throws if invalid */ }

   /** Sort sketches by date descending, then title ascending */
   export function sortSketches(sketches: Sketch[]): Sketch[] { /* returns sorted copy */ }

   /** Check for duplicate sketch IDs, throw if found */
   export function checkDuplicateIds(sketches: Sketch[]): void { /* throws if duplicates */ }
   ```

2. Update `src/sketches/index.ts` to use these functions for processing auto-discovered sketches.

#### Detailed Test Cases:
1. **`validateSketchModule()` tests**
   - Valid sketch + matching defaults → no error
   - Defaults keys mismatch parameter IDs (e.g., parameter `size` exists, defaults has `scale`) → throws
   - Defaults value type mismatch (number parameter, defaults has string value) → throws
   - Missing defaults key for a parameter → throws
   - Extra defaults keys not present in parameters → throws (per contract)

2. **`sortSketches()` tests**
   - Same date, different titles: `title: 'B'` vs `title: 'A'` → sorted A then B
   - Different dates: `2026-01-01` vs `2026-02-01` → newer date (Feb) first
   - 3+ sketches with mixed dates/titles → correct order
   - Invalid date strings (optional, if contract enforces ISO 8601)

3. **`checkDuplicateIds()` tests**
   - No duplicates → no error
   - Two sketches with identical `id: 'duplicate'` → throws with duplicate ID in message
   - Multiple duplicates → throws listing all duplicate IDs

### 1.3 Vite Endpoint Logic (`src/vite/__tests__/endpoint.test.ts`)
Refactor `vite.config.ts` to extract `/__sketch-defaults` endpoint logic into testable functions.

#### Refactoring Steps:
1. Create `src/vite/endpoint-utils.ts`:
   ```typescript
   import type { IncomingMessage } from 'node:http';

   /** Parse JSON request body, throw on invalid JSON */
   export async function readJsonBody(
     req: IncomingMessage
   ): Promise<Record<string, unknown>> { /* ... */ }

   /** Prevent path traversal by checking target path is within sketches root */
   export function isWithinSketchesRoot(
     targetPath: string,
     sketchesRoot: string = 'src/sketches'
   ): boolean { /* ... */ }
   ```

2. Update `vite.config.ts` to import and use these functions for the endpoint handler.

#### Detailed Test Cases:
1. **`readJsonBody()` tests**
   - Valid JSON `{"size": 50}` → returns parsed object
   - Invalid JSON (e.g., unquoted keys `{size: 50}`) → throws
   - Empty body → throws or returns empty object (per implementation)

2. **`isWithinSketchesRoot()` tests**
   - Valid path: `src/sketches/my-sketch/defaults.json` → returns `true`
   - Path traversal: `src/sketches/../other/defaults.json` → returns `false`
   - Absolute path outside root: `/etc/passwd` → returns `false`
   - Relative traversal: `src/sketches/my-sketch/../../defaults.json` → returns `false`

### Phase 1 Success Criteria
- All Vitest tests pass with `pnpm test:run`
- `pnpm tsc --noEmit` passes (no type errors in new files)
- `pnpm biome check --write` passes (formatting/linting)
- Existing `pnpm dev` and `pnpm build` commands still work after refactoring

---

## Phase 2: Seeded Randomness (Prerequisite for Visual Tests)

**Why:** Visual regression requires deterministic output. Currently sketches using `p.random()` / `Math.random()` are non-deterministic.

**Feasibility:** ✅ Feasible. 6/8 sketches need migration; all use `p.random()` (uniform replacement). 2 sketches (stereogram, l-system-plant) are already deterministic.

### Randomness Audit (All 8 Sketches)

| Sketch | Randomness Source | Calls | Deterministic Already? |
|--------|------------------|-------|----------------------|
| stereogram | Custom `hashUint(seed, row, col)` | 0 (`p.random`) | ✅ Yes — uses seed param |
| l-system-plant | None | 0 | ✅ Yes — pure L-system |
| cellular-automata | `p.random()` | 1 (`randomBoard`) | ❌ No |
| mona-lisa-circles | `p.random()` | 3 (x, y, radius) | ❌ No |
| grid-variations | `p.random()` | 5 (rotation, color, mode, sizes) | ❌ No |
| changing-circle-line | `p.random()` + `Math.random()` | 3 (points, reversal) | ❌ No |
| flow-field-particles | `p.random()` | 3 (spawn x, y, ttl) | ❌ No* |
| fractal-tree | `p.random()` | 2 (shrink per branch) | ❌ No |

\* `p.noise()` is deterministic per (x, y, z) input; only particle spawn needs seeding.

---

### Step 1: Create Seeded RNG Utility

**File:** `src/utils/seeded-random.ts`

```typescript
/**
 * Mulberry32 PRNG — simple, fast, seedable.
 * Returns a function that produces deterministic floats in [0, 1).
 */
export function createRng(seed: number): () => number {
  let state = seed | 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Type alias for the RNG function returned by createRng */
export type Rng = ReturnType<typeof createRng>;

/** Deterministic random in range [min, max) — mirrors p5's random(min, max) */
export function rngRandom(rng: Rng, min: number, max?: number): number {
  if (max === undefined) {
    max = min;
    min = 0;
  }
  return min + rng() * (max - min);
}

/** Deterministic integer in [0, bound) — mirrors p5's random(bound) for integers */
export function rngInt(rng: Rng, bound: number): number {
  return Math.floor(rng() * bound);
}

/** Deterministic choice from an array */
export function rngChoice<T>(rng: Rng, arr: readonly T[]): T {
  return arr[Math.floor(rng() * arr.length)];
}
```

**Verification:** Unit test `src/utils/__tests__/seeded-random.test.ts`:
- Same seed → same sequence of 100 calls produces identical values
- Different seed → different sequence
- `rngRandom(rng, 5, 10)` always returns values in [5, 10)
- `rngInt(rng, 4)` returns integers in [0, 4)

---

### Step 2: Update `SketchContext` Type

**File:** `src/types/sketch.ts`

Add `rng` to `SketchContext`:
```typescript
import type p5 from "p5";
import type { Rng } from "../utils/seeded-random.js";

export interface SketchContext<TParams extends Record<string, unknown>> {
  p: p5;
  theme: Theme;
  params: TParams;
  rng: Rng;  // Deterministic PRNG seeded per sketch instance
}
```

---

### Step 3: Wire Seed Through the Application

#### 3a. Parse seed from URL / generate random

**File:** `src/utils/seed.ts` (new)

```typescript
const SEED_PARAM = "seed";

/** Get seed from URL ?seed=42, or generate a random one */
export function getSeedFromUrl(): number {
  const params = new URLSearchParams(window.location.search);
  const seedStr = params.get(SEED_PARAM);
  if (seedStr !== null && /^\d+$/.test(seedStr)) {
    return parseInt(seedStr, 10);
  }
  // Random seed (32-bit signed int)
  return (Math.random() * 2147483647) | 0;
}

/** Update URL with new seed (without reload) */
export function setSeedInUrl(seed: number): void {
  const url = new URL(window.location.href);
  url.searchParams.set(SEED_PARAM, String(seed));
  window.history.replaceState({}, "", url.toString());
}
```

#### 3b. Pass `rng` to sketch `create()` context

**File:** `src/routes/+page.svelte` (or wherever sketch is instantiated)

In the sketch instantiation logic, pass `rng` from `createRng(seed)`:
```typescript
import { createRng } from "../../utils/seeded-random.js";
import { getSeedFromUrl } from "../../utils/seed.js";

const seed = getSeedFromUrl();
const rng = createRng(seed);

// When creating sketch context:
sketch.create({ p, theme, params, rng });
```

---

### Step 4: Migrate Each Sketch

#### 4.1 `cellular-automata/sketch.ts`
**Change:** Replace `p.random()` in `randomBoard()`:
```typescript
// Before:
Array.from({ length: cols }, () => p.random() < params.seedProbability ? 1 : 0)

// After:
import { rngRandom } from "../../utils/seeded-random.js";
// In create({ p, theme, params, rng }):
Array.from({ length: cols }, () => rngRandom(rng, 0, 1) < params.seedProbability ? 1 : 0)
```
**Note:** `reseedFrames` triggers `randomBoard()` periodically — this remains deterministic because `rng` state continues sequentially.

#### 4.2 `mona-lisa-circles/sketch.ts`
**Change:** Replace 3 `p.random()` calls in `drawCircles()`:
```typescript
// Before:
const x = p.random(canvasWidth);
const y = p.random(canvasHeight);
const radius = p.random(params.radiusMin, params.radiusMax);

// After (with rng in context):
const x = rngRandom(rng, 0, canvasWidth);
const y = rngRandom(rng, 0, canvasHeight);
const radius = rngRandom(rng, params.radiusMin, params.radiusMax);
```

#### 4.3 `grid-variations/sketch.ts`
**Change:** Replace 5 `p.random()` calls in `p.draw`:
```typescript
// Before:
p.rotate(Math.floor(p.random(4)) * 90);
p.stroke(p.random(palette));
const mode = Math.floor(p.random(4));
p.square(0, 0, cellSize * p.random(0.2, 0.8));
p.circle(0, 0, cellSize * p.random(0.18, 0.7));

// After:
import { rngInt, rngChoice, rngRandom } from "../../utils/seeded-random.js";
p.rotate(rngInt(rng, 4) * 90);
p.stroke(rngChoice(rng, palette));
const mode = rngInt(rng, 4);
p.square(0, 0, cellSize * rngRandom(rng, 0.2, 0.8));
p.circle(0, 0, cellSize * rngRandom(rng, 0.18, 0.7));
```

#### 4.4 `changing-circle-line/sketch.ts`
**Change:** Replace `p.random()` for control points + `Math.random()` for reversal:
```typescript
// Before:
x: p.random(margin, p.width - margin),
y: p.random(margin, p.height - margin),
// ...
if (Math.random() * 100 < params.reverseProbability) {

// After:
x: rngRandom(rng, margin, p.width - margin),
y: rngRandom(rng, margin, p.height - margin),
// ...
if (rngRandom(rng, 0, 100) < params.reverseProbability) {
```

#### 4.5 `flow-field-particles/sketch.ts`
**Change:** Replace `p.random()` in `spawnParticle()`:
```typescript
// Before:
return {
  x: p.random(p.width),
  y: p.random(p.height),
  age: 0,
  ttl: p.random(ttlMin, ttlMax),
};

// After:
return {
  x: rngRandom(rng, 0, p.width),
  y: rngRandom(rng, 0, p.height),
  age: 0,
  ttl: rngRandom(rng, ttlMin, ttlMax),
};
```
**Note:** `p.noise()` is deterministic per (x, y, z) input. Since particle positions are now seeded, the entire animation becomes deterministic for a given seed.

#### 4.6 `fractal-tree/sketch.ts`
**Change:** Replace `p.random()` in `branch()`:
```typescript
// Before:
length * p.random(minShrink, maxShrink),

// After:
length * rngRandom(rng, minShrink, maxShrink),
```

#### 4.7 `stereogram/sketch.ts` — No changes needed
Already deterministic via `hashUint(seed, row, column)`.

#### 4.8 `l-system-plant/sketch.ts` — No changes needed
Pure deterministic L-system; no randomness.

---

### Step 5: Verification

After migration, verify determinism:

1. **Manual test:** Open `?seed=42` twice, confirm identical output for each sketch
2. **Different seeds:** `?seed=42` vs `?seed=99` should produce different outputs
3. **No seed:** Random seed should still work (different each load)
4. **Run `pnpm tsc --noEmit`** — no type errors
5. **Run `pnpm biome check`** — formatting/linting passes
6. **Run `pnpm dev`** — all sketches still render correctly

---

### Phase 2 Success Criteria

- [ ] `src/utils/seeded-random.ts` created with `createRng()`, `rngRandom()`, `rngInt()`, `rngChoice()`
- [ ] `SketchContext` type updated with `rng: Rng` field
- [ ] Seed parsing from URL `?seed=N` implemented in `src/utils/seed.ts`
- [ ] All 6 non-deterministic sketches migrated to use `rng` instead of `p.random()` / `Math.random()`
- [ ] 2 deterministic sketches (stereogram, l-system-plant) confirmed unchanged
- [ ] Manual verification: `?seed=42` produces identical output across reloads
- [ ] `pnpm tsc --noEmit` passes
- [ ] `pnpm biome check --write` passes
- [ ] `pnpm dev` and `pnpm build` still work

---

### Effort Estimate (Revised)

| Task | Effort |
|------|--------|
| Create `seeded-random.ts` + tests | 1 hr |
| Update types + wire seed through app | 1 hr |
| Migrate 6 sketches (avg 5 min each) | 0.5 hr |
| Verification + fixes | 0.5 hr |
| **Total** | **3 hrs** |

---

## Phase 3: Visual Regression Tests (Playwright)

**Install (Phase 3):**
- `@playwright/test` + `playwright` — visual regression tests

**Configure (Phase 3):**
- `playwright.config.ts` with fixed viewport (e.g., 800x600)

Once seeded randomness is in place.

**Test file:** `tests/visual/sketches.spec.ts`

```typescript
test(`sketch ${sketch.id} renders correctly`, async ({ page }) => {
  await page.goto(`/?sketch=${sketch.id}&seed=42`);
  await page.waitForSelector('canvas');
  await page.waitForTimeout(500); // Wait for render
  expect(await page.screenshot()).toMatchSnapshot(`${sketch.id}.png`);
});
```

**Challenges & Solutions:**

| Challenge | Solution |
|----------|----------|
| Detecting render completion | For `noLoop()` sketches, wait fixed time. For animated, capture frame 1. Optionally dispatch `sketch-rendered` event. |
| Canvas size variability | Fixed viewport in Playwright config |
| Image loading (mona-lisa) | Preload or mock image in test |

**Run in CI:** Add GitHub Action to run Playwright and compare snapshots.

---

## Phase 4: Component Tests (Optional)

Only if UI behavior regressions are a concern.

**Potential tests:**
- `ParameterControls` renders correct input types (range/checkbox/text)
- `SketchSelector` lists all sketches sorted correctly
- Theme toggle updates document class

Use `@testing-library/svelte` — focus on user behavior, not DOM structure.

---

## Resilience Principles

To avoid brittle tests:

1. **Contract tests** — Test `defineSketch()` and validation functions, not internal helpers
2. **Visual tests** — Snapshot the canvas only, not full page UI
3. **Avoid implementation details** — Don't test private state or internal function calls
4. **Seed everything** — Once seeded randomness is added, visual tests are stable

---

## Implementation Order

1. Set up Vitest + write `defineSketch()` contract tests (Phase 1)
2. Refactor `sketches/index.ts` + write auto-discovery contract tests (Phase 1)
3. Implement seeded randomness (Phase 2, TODO item, needed for Phase 3)
4. Set up Playwright + write visual regression tests for all sketches (Phase 3)
5. (Optional) Add component tests for critical UI (Phase 4)

---

## Effort Estimate

| Phase | Effort |
|-------|--------|
| Phase 1: Contract tests | 3-5 hrs |
| Phase 2: Seeded randomness | 3-4 hrs |
| Phase 3: Visual regression | 2-3 hrs |
| Phase 4: Component tests (optional) | 1-2 hrs |
| **Total** | **9-14 hrs** |
