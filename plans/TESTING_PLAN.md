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

**Prerequisite:** Phase 2 (Seeded Randomness) must be complete. All sketches must produce deterministic output given the same seed.

### Overview
Visual regression tests capture canvas output for each sketch at a fixed seed and compare against stored snapshots. This detects unintended rendering changes across refactoring.

---

### Step 1: Install Dependencies

```bash
pnpm add -D @playwright/test playwright
```

- `@playwright/test`: Test runner with built-in snapshot testing
- `playwright`: Browser binaries (Chromium for consistent rendering)

After install, initialize Playwright (optional, can skip if configuring manually):
```bash
pnpm exec playwright install chromium
```

---

### Step 2: Configure Playwright

**File:** `playwright.config.ts` in project root:

```typescript
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/visual',
  snapshotDir: './tests/visual/__snapshots__',
  timeout: 30_000,
  expect: {
    toMatchSnapshot: {
      // 1% pixel difference threshold — allows minor anti-aliasing variance
      maxDiffPixels: 1000,
      // Or use threshold ratio:
      // maxDiffPixels: 0.01,
    },
  },
  use: {
    // Fixed viewport ensures consistent canvas sizing
    viewport: { width: 800, height: 600 },
    // Disable animations that could cause flakiness
    actionTimeout: 10_000,
  },
  projects: [
    {
      name: 'chromium',
      use: {
        browserName: 'chromium',
        // Headless for CI; can override with `npx playwright test --headed`
        headless: true,
      },
    },
  ],
  // Only run on Chromium for consistent pixel output
  fullyParallel: true,
});
```

**Add test scripts to `package.json`:**
```json
{
  "scripts": {
    "test:visual": "playwright test",
    "test:visual:update": "playwright test --update-snapshots",
    "test:visual:ui": "playwright test --ui"
  }
}
```

---

### Step 3: Create Test Utilities

**File:** `tests/visual/utils.ts`

Helper functions to handle sketch-specific quirks:

```typescript
import type { Page } from '@playwright/test';

/**
 * Navigate to a sketch with a specific seed.
 * Ensures the page is loaded and canvas is available.
 */
export async function gotoSketch(
  page: Page,
  sketchId: string,
  seed = 42
): Promise<void> {
  await page.goto(`/?sketch=${sketchId}&seed=${seed}`, {
    waitUntil: 'load',
  });
  // Wait for canvas element to exist (SPA may render after load)
  await page.waitForSelector('canvas', { state: 'visible' });
}

/**
 * Wait for sketch rendering to complete.
 * Handles both static (noLoop) and animated sketches.
 * Relies on sketches dispatching a 'sketch-rendered' event after first frame.
 */
export async function waitForRender(
  page: Page,
  sketchId: string
): Promise<void> {
  const animatedSketches = ['flow-field-particles', 'changing-circle-line', 'cellular-automata'];
  const imageSketches = ['mona-lisa-circles']; // Needs image load

  // Primary approach: wait for custom event (sketches must dispatch this)
  // Fallback: timeout after 2 seconds if event never fires
  const renderPromise = page.waitForEvent('sketch-rendered' as any).catch(() => {});
  const timeoutPromise = page.waitForTimeout(2000);

  if (animatedSketches.includes(sketchId)) {
    // Animated sketches: wait for first frame event or timeout
    await Promise.race([renderPromise, timeoutPromise]);
  } else if (imageSketches.includes(sketchId)) {
    // Wait for Mona Lisa image to load (with route mocking in beforeEach)
    await page.waitForFunction(() => {
      const img = document.querySelector('img[data-mona-lisa]') as HTMLImageElement;
      return img && img.complete;
    }).catch(() => {});
    // Also wait for first render event
    await Promise.race([renderPromise, timeoutPromise]);
  } else {
    // Static sketches (noLoop): wait for first render event or brief timeout
    await Promise.race([renderPromise, page.waitForTimeout(500)]);
  }
}

/**
 * Capture canvas snapshot, excluding UI elements.
 * Returns buffer of PNG screenshot.
 */
export async function captureCanvas(
  page: Page
): Promise<Buffer> {
  // Option A: Screenshot just the canvas element
  const canvas = page.locator('canvas').first();
  const screenshot = await canvas.screenshot({ type: 'png' });
  return screenshot;

  // Option B: Full page but mask UI elements (alternative)
  // const screenshot = await page.screenshot({
  //   type: 'png',
  //   mask: [page.locator('.controls'), page.locator('.sketch-selector')],
  // });
  // return screenshot;
}

/**
 * Get all sketch IDs from the application by parsing the sketch selector on the page.
 * This matches the auto-discovery in src/sketches/index.ts and automatically
 * picks up new sketches without manual updates.
 */
export async function getAllSketchIds(page: Page): Promise<string[]> {
  // Navigate to home page and extract sketch IDs from the selector
  await page.goto('/', { waitUntil: 'load' });
  await page.waitForSelector('[data-sketch-selector]', { state: 'visible' });

  // Extract all sketch IDs from option values or data attributes
  const sketchIds = await page.$$eval('[data-sketch-selector] option, [data-sketch-option]', (elements) => {
    return elements
      .map((el) => el.getAttribute('value') || el.getAttribute('data-sketch-id'))
      .filter((id): id is string => id !== null && id !== '');
  });

  if (sketchIds.length === 0) {
    throw new Error('No sketch IDs found on page. Check sketch selector selector.');
  }

  return sketchIds;
}
```

---

### Step 4: Write Visual Regression Tests

**File:** `tests/visual/sketches.spec.ts`

```typescript
import { test, expect } from '@playwright/test';
import { gotoSketch, waitForRender, captureCanvas, getAllSketchIds } from './utils';

// Global seed for all visual tests — ensures consistency
const VISUAL_TEST_SEED = 42;

test.describe('Sketch Visual Regression', () => {
  let sketchIds: string[];

  test.beforeAll(async ({ browser }) => {
    // Dynamically discover all sketch IDs from the running app
    const page = await browser.newPage();
    sketchIds = await getAllSketchIds(page);
    await page.close();
  });

  // Run a test for each sketch
  for (const sketchId of sketchIds) {
    test(`sketch "${sketchId}" renders correctly`, async ({ page }) => {
      // Navigate to the sketch with fixed seed
      await gotoSketch(page, sketchId, VISUAL_TEST_SEED);

      // Wait for rendering to complete (handles animated vs static)
      await waitForRender(page, sketchId);

      // Capture canvas screenshot
      const screenshot = await captureCanvas(page);

      // Compare against stored snapshot
      // Snapshot will be stored at: tests/visual/__snapshots__/sketch-id-render.png
      expect(screenshot).toMatchSnapshot(`${sketchId}-render.png`);
    });
  }

  // Optional: Test with different seed produces different output
  test('different seeds produce different output', async ({ page }) => {
    await gotoSketch(page, 'grid-variations', 42);
    await waitForRender(page, 'grid-variations');
    const screenshot42 = await captureCanvas(page);

    await gotoSketch(page, 'grid-variations', 99);
    await waitForRender(page, 'grid-variations');
    const screenshot99 = await captureCanvas(page);

    // Should be different (unless extremely unlucky with hash collision)
    expect(screenshot42.equals(screenshot99)).toBe(false);
  });

  // Optional: Test theme switching doesn't break rendering
  test('sketch renders correctly in dark mode', async ({ page }) => {
    await gotoSketch(page, 'grid-variations', VISUAL_TEST_SEED);
    // Toggle dark mode via UI or verify theme param support
    await page.waitForSelector('[data-theme-toggle]').then(
      (el) => el.click(),
      () => page.goto(`/?sketch=grid-variations&seed=${VISUAL_TEST_SEED}&theme=dark`)
    );
    await waitForRender(page, 'grid-variations');

    const screenshot = await captureCanvas(page);
    expect(screenshot).toMatchSnapshot(`grid-variations-dark-render.png`);
  });
});
```

---

### Step 5: Handle Special Cases

#### 5.1 Animated Sketches (flow-field-particles, changing-circle-line, cellular-automata)

These sketches redraw continuously. For visual tests, we capture after the first frame.

**Required:** Modify each animated sketch's `create()` function to dispatch a `sketch-rendered` event after the first frame:

```typescript
// In each animated sketch's create() function:
const sketch = (p: p5) => {
  p.setup = () => { /* ... */ };
  p.draw = () => {
    // ... existing draw logic

    // After first frame, signal that rendering is complete
    if (p.frameCount === 1) {
      window.dispatchEvent(new CustomEvent('sketch-rendered'));
    }
  };
};
```

The `waitForRender()` utility already waits for this event (with a 2-second timeout fallback).

#### 5.2 Image-Dependent Sketches (mona-lisa-circles)

The `mona-lisa-circles` sketch loads an external image. Mock the image in Playwright to avoid network flakiness.

**Add to `tests/visual/sketches.spec.ts`:**
```typescript
// Generate a simple test image buffer (100x100 colored rectangle)
function generateTestImageBuffer(): Buffer {
  // Use a minimal valid JPEG or PNG buffer
  // Option: import a pre-made 100x100 test image from test fixtures
  const { createCanvas } = require('canvas');
  const canvas = createCanvas(100, 100);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#cccccc';
  ctx.fillRect(0, 0, 100, 100);
  return canvas.toBuffer('image/jpeg');
}

test.beforeEach(async ({ page }) => {
  // Intercept the Mona Lisa image request and return a mock
  await page.route('**/mona-lisa.jpg', async (route) => {
    const buffer = generateTestImageBuffer();
    await route.fulfill({
      contentType: 'image/jpeg',
      body: buffer,
    });
  });
});
```

**Alternative (simpler):** Place a test image at `tests/visual/fixtures/mona-lisa.jpg` and serve it:
```typescript
test.beforeEach(async ({ page }) => {
  await page.route('**/mona-lisa.jpg', async (route) => {
    await route.fulfill({
      path: 'tests/visual/fixtures/mona-lisa.jpg',
    });
  });
});
```

#### 5.3 Canvas Size Consistency

The canvas size must be consistent across test runs. Playwright's fixed viewport (800x600) helps, but the sketch might resize the canvas.

**Add a verification test:**
```typescript
test('canvas has consistent dimensions', async ({ page }) => {
  await gotoSketch(page, 'grid-variations', 42);
  await waitForRender(page, 'grid-variations');

  const canvasSize = await page.evaluate(() => {
    const canvas = document.querySelector('canvas')!;
    return { width: canvas.width, height: canvas.height };
  });

  // Assert expected size (adjust per your layout)
  expect(canvasSize).toEqual({ width: 800, height: 600 });
});
```

---

### Step 6: Update Snapshots (First Run)

On the first run, there will be no snapshots to compare against. Generate them:

```bash
# Generate initial snapshots for all sketches
pnpm test:visual:update

# Or update specific test snapshots
pnpm test:visual:update -- sketches.spec.ts
```

Snapshots will be stored in `tests/visual/__snapshots__/` (configured via `snapshotDir` in `playwright.config.ts`).

**Review snapshots:** Before committing, manually verify the generated snapshots look correct. Delete any that look wrong and re-run with `--update-snapshots`.

---

### Phase 3 Success Criteria

- [ ] `@playwright/test` and `playwright` installed
- [ ] `playwright.config.ts` configured with fixed viewport, Chromium only, and `snapshotDir`
- [ ] `tests/visual/utils.ts` created with helper functions (dynamic `getAllSketchIds`, event-based `waitForRender`)
- [ ] Animated sketches dispatch `sketch-rendered` event after first frame
- [ ] `tests/visual/sketches.spec.ts` dynamically discovers and covers all sketches
- [ ] Image mocking configured for `mona-lisa-circles` in `beforeEach`
- [ ] Initial snapshots generated and committed to repo
- [ ] `pnpm test:visual` passes locally
- [ ] Special cases handled (animated sketches via events, image mocking, canvas size verification)
- [ ] Snapshot diff threshold set appropriately (e.g., 1% pixel difference)

---

### Effort Estimate (Phase 3)

| Task | Effort |
|------|--------|
| Install Playwright + configure | 0.5 hr |
| Create test utilities | 1 hr |
| Write visual regression tests | 0.5 hr |
| Handle special cases (animated, images) | 1 hr |
| Generate and verify initial snapshots | 0.5 hr |
| **Total** | **3-4 hrs** |

---

## Phase 4: Component Tests (Optional)

Only if UI behavior regressions are a concern.

**Goal:** Catch regressions in UI component behavior when refactoring. Tests focus on user-visible behavior (input rendering, event handling, label correctness), not DOM structure.

**Setup:** Reuses Phase 1's `vitest.config.ts` — no separate config needed. Component tests live in `src/**/__tests__/*.test.ts` (matches the `include` pattern). Add `import '@testing-library/jest-dom'` to your `vitest.setup.ts` (or to each test file) to enable DOM matchers.

**Resilience strategy:**
- Use `@testing-library/svelte` with queries by role, label, or `data-testid` (not classes or DOM structure)
- Test behavior contracts: "what does the user see and interact with"
- Avoid testing implementation details (internal state, private functions)
- Use `testid` attributes sparingly and only on stable, meaningful elements

---

### Install Dependencies

```bash
# Pin to ^5 for Svelte 5 runes compatibility (v4 is incompatible with Svelte 5)
pnpm add -D @testing-library/svelte@^5 @testing-library/jest-dom
```

- `@testing-library/svelte@^5`: Svelte 5-compatible component testing with behavior-focused queries
- `@testing-library/jest-dom`: Readable DOM assertion matchers (`.toBeInTheDocument()`, `.toHaveValue()`, etc.)
- **Setup note**: Enable matchers by adding `import '@testing-library/jest-dom'` to test files, or create a Vitest setup file (e.g., `vitest.setup.ts`) with the import and add `test.setupFiles: ['./vitest.setup.ts']` to `vitest.config.ts`.

---

### Component Test Candidates

#### 4.1 `ParameterControls.svelte` ⭐ Primary candidate

**Why:** Most complex UI component with three distinct input types. Regressions here break user ability to adjust sketch parameters. The parameter contract (number/string/boolean types) is stable.

**Behavior contract:**
1. Renders the correct input element for each parameter type
2. Displays parameter label and formatted value
3. Calls `onchange` callback with correct key/value when user interacts
4. Input constraints (min/max/step) are passed through for number inputs

**Test file:** `src/components/__tests__/ParameterControls.test.ts`

```typescript
import { render, screen, fireEvent } from '@testing-library/svelte';
import ParameterControls from '../ParameterControls.svelte';
import type { SketchModuleWithDefaults } from '../../types/sketch';

// Mock sketch module with one parameter of each type
function createMockSketch(parameters: SketchParameter[]) {
  return {
    id: 'test-sketch',
    title: 'Test',
    date: '2026-01-01',
    description: 'Test',
    parameters,
    defaults: Object.fromEntries(parameters.map(p => [p.id, p.default])),
  } as SketchModuleWithDefaults;
}

const numberParam = {
  id: 'size',
  label: 'Size',
  type: 'number' as const,
  min: 0,
  max: 100,
  step: 1,
  default: 50,
};

const booleanParam = {
  id: 'enabled',
  label: 'Enabled',
  type: 'boolean' as const,
  default: true,
};

const stringParam = {
  id: 'label',
  label: 'Label',
  type: 'string' as const,
  default: 'hello',
};

describe('ParameterControls', () => {
  // Track onchange calls
  let onChangeCalls: [string, unknown][] = [];
  function handleChange(key: string, value: unknown) {
    onChangeCalls.push([key, value]);
  }

  beforeEach(() => {
    onChangeCalls = [];
  });

  // --- Input type rendering ---
  test('renders range input for number parameters', () => {
    const sketch = createMockSketch([numberParam]);
    render(ParameterControls, {
      props: { sketch, params: { size: 50 }, onchange: handleChange },
    });

    const input = screen.getByRole('slider', { name: /size/i });
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute('min', '0');
    expect(input).toHaveAttribute('max', '100');
    expect(input).toHaveValue(50);
  });

  test('renders checkbox for boolean parameters', () => {
    const sketch = createMockSketch([booleanParam]);
    render(ParameterControls, {
      props: { sketch, params: { enabled: true }, onchange: handleChange },
    });

    const input = screen.getByRole('checkbox', { name: /enabled/i });
    expect(input).toBeInTheDocument();
    expect(input).toBeChecked();
  });

  test('renders text input for string parameters', () => {
    const sketch = createMockSketch([stringParam]);
    render(ParameterControls, {
      props: { sketch, params: { label: 'hello' }, onchange: handleChange },
    });

    const input = screen.getByRole('textbox', { name: /label/i });
    expect(input).toBeInTheDocument();
    expect(input).toHaveValue('hello');
  });

  // --- Label and value display ---
  test('displays parameter label for each control', () => {
    const sketch = createMockSketch([numberParam, booleanParam]);
    render(ParameterControls, {
      props: { sketch, params: { size: 50, enabled: true }, onchange: handleChange },
    });

    expect(screen.getByText('Size')).toBeInTheDocument();
    expect(screen.getByText('Enabled')).toBeInTheDocument();
  });

  test('displays formatted numeric values (3 decimal places, trimmed)', () => {
    const param = { ...numberParam, default: 50.1234 };
    const sketch = createMockSketch([param]);
    render(ParameterControls, {
      props: { sketch, params: { size: 50.1234 }, onchange: handleChange },
    });

    // Should show trimmed decimal: "50.123"
    expect(screen.getByText('50.123')).toBeInTheDocument();
  });

  test('displays "On"/"Off" for boolean values', () => {
    const sketch = createMockSketch([booleanParam]);
    const { rerender } = render(ParameterControls, {
      props: { sketch, params: { enabled: true }, onchange: handleChange },
    });

    expect(screen.getByText('On')).toBeInTheDocument();

    rerender({ sketch, params: { enabled: false }, onchange: handleChange });
    expect(screen.getByText('Off')).toBeInTheDocument();
  });

  // --- Event handling ---
  test('calls onchange with correct key/value when slider changes', async () => {
    const sketch = createMockSketch([numberParam]);
    render(ParameterControls, {
      props: { sketch, params: { size: 50 }, onchange: handleChange },
    });

    const input = screen.getByRole('slider', { name: /size/i });
    await fireEvent.input(input, { target: { value: '75' } });

    expect(onChangeCalls).toHaveLength(1);
    expect(onChangeCalls[0]).toEqual(['size', 75]);
  });

  test('calls onchange with correct key/value when checkbox toggles', async () => {
    const sketch = createMockSketch([booleanParam]);
    render(ParameterControls, {
      props: { sketch, params: { enabled: true }, onchange: handleChange },
    });

    const input = screen.getByRole('checkbox', { name: /enabled/i });
    await fireEvent.click(input);

    expect(onChangeCalls).toHaveLength(1);
    expect(onChangeCalls[0]).toEqual(['enabled', false]);
  });

  test('calls onchange with correct key/value when text input changes', async () => {
    const sketch = createMockSketch([stringParam]);
    render(ParameterControls, {
      props: { sketch, params: { label: 'hello' }, onchange: handleChange },
    });

    const input = screen.getByRole('textbox', { name: /label/i });
    await fireEvent.input(input, { target: { value: 'world' } });

    expect(onChangeCalls).toHaveLength(1);
    expect(onChangeCalls[0]).toEqual(['label', 'world']);
  });

  // --- Multiple parameters ---
  test('renders all parameters in order', () => {
    const sketch = createMockSketch([numberParam, booleanParam, stringParam]);
    render(ParameterControls, {
      props: {
        sketch,
        params: { size: 50, enabled: true, label: 'hello' },
        onchange: handleChange,
      },
    });

    const labels = screen.getAllByText(/Size|Enabled|Label/i);
    expect(labels).toHaveLength(3);
  });
});
```

---

#### 4.2 `ThemeToggle.svelte` — Secondary candidate

**Why:** Simple component, but testing ensures the label toggling logic and `aria-pressed` state are correct. A regression here would break theme switching UX.

**Behavior contract:**
1. Displays "Dark Mode" when current theme is light, "Light Mode" when dark
2. Has `aria-pressed="true"` when theme is dark
3. Calls `ontoggle` callback when clicked

**Test file:** `src/components/__tests__/ThemeToggle.test.ts`

```typescript
import { render, screen, fireEvent } from '@testing-library/svelte';
import ThemeToggle from '../ThemeToggle.svelte';

describe('ThemeToggle', () => {
  let toggleCalls = 0;
  function handleToggle() {
    toggleCalls++;
  }

  beforeEach(() => {
    toggleCalls = 0;
  });

  test('displays "Dark Mode" when current theme is light', () => {
    render(ThemeToggle, {
      props: { currentTheme: 'light', ontoggle: handleToggle },
    });

    expect(screen.getByText('Dark Mode')).toBeInTheDocument();
  });

  test('displays "Light Mode" when current theme is dark', () => {
    render(ThemeToggle, {
      props: { currentTheme: 'dark', ontoggle: handleToggle },
    });

    expect(screen.getByText('Light Mode')).toBeInTheDocument();
  });

  test('sets aria-pressed based on current theme', () => {
    const { rerender } = render(ThemeToggle, {
      props: { currentTheme: 'light', ontoggle: handleToggle },
    });

    const button = screen.getByRole('button', { name: /dark mode/i });
    expect(button).toHaveAttribute('aria-pressed', 'false');

    rerender({ currentTheme: 'dark', ontoggle: handleToggle });
    expect(button).toHaveAttribute('aria-pressed', 'true');
  });

  test('calls ontoggle when clicked', async () => {
    render(ThemeToggle, {
      props: { currentTheme: 'light', ontoggle: handleToggle },
    });

    const button = screen.getByRole('button', { name: /dark mode/i });
    await fireEvent.click(button);

    expect(toggleCalls).toBe(1);
  });
});
```

---

#### 4.3 `SketchSelector.svelte` — Tertiary candidate

**Why:** Very simple component (just a `<select>`). The sorting logic is already tested in Phase 1 contract tests. Only add this test if you want to guard against changes to the option formatting (`date - title`).

**Behavior contract:**
1. Renders an `<option>` for each sketch
2. Displays `date - title` format for each option
3. Sets `value` attribute to sketch `id`
4. Calls `onchange` callback with selected sketch id when selection changes

**Test file:** `src/components/__tests__/SketchSelector.test.ts`

```typescript
import { render, screen, fireEvent } from '@testing-library/svelte';
import SketchSelector from '../SketchSelector.svelte';
import type { SketchModuleWithDefaults } from '../../types/sketch';

const mockSketches: SketchModuleWithDefaults[] = [
  { id: 'sketch-b', title: 'Beta Sketch', date: '2026-02-01' } as SketchModuleWithDefaults,
  { id: 'sketch-a', title: 'Alpha Sketch', date: '2026-01-01' } as SketchModuleWithDefaults,
];

describe('SketchSelector', () => {
  let selectedId: string | null = null;
  function handleChange(id: string) {
    selectedId = id;
  }

  beforeEach(() => {
    selectedId = null;
  });

  test('renders an option for each sketch', () => {
    render(SketchSelector, {
      props: { sketches: mockSketches, currentSketch: 'sketch-a', onchange: handleChange },
    });

    expect(screen.getByRole('option', { name: /beta sketch/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /alpha sketch/i })).toBeInTheDocument();
  });

  test('displays date and title in option text', () => {
    render(SketchSelector, {
      props: { sketches: mockSketches, currentSketch: 'sketch-a', onchange: handleChange },
    });

    // The format is "date - title"
    expect(screen.getByText('2026-02-01 - Beta Sketch')).toBeInTheDocument();
    expect(screen.getByText('2026-01-01 - Alpha Sketch')).toBeInTheDocument();
  });

  test('sets currentSketch as selected value', () => {
    render(SketchSelector, {
      props: { sketches: mockSketches, currentSketch: 'sketch-b', onchange: handleChange },
    });

    const select = screen.getByRole('combobox');
    expect(select).toHaveValue('sketch-b');
  });

  test('calls onchange with sketch id when selection changes', async () => {
    render(SketchSelector, {
      props: { sketches: mockSketches, currentSketch: 'sketch-a', onchange: handleChange },
    });

    const select = screen.getByRole('combobox');
    await fireEvent.change(select, { target: { value: 'sketch-b' } });

    expect(selectedId).toBe('sketch-b');
  });
});
```

---

### What NOT to Test (to avoid brittle tests)

1. **`App.svelte`** — Too many integration points (p5, canvas, sketches, animation controller). This is better covered by Phase 3 visual regression tests.

2. **CSS/styling details** — Don't test class names, inline styles, or layout. These change frequently during redesigns.

3. **DOM structure** — Don't test the exact nesting of `<div>` elements. Use role/label queries which are resilient to restructuring.

4. **Internal state** — Don't test Svelte `$state` variables directly. Only test publicly observable behavior.

---

### Phase 4 Success Criteria

- [x] `@testing-library/svelte@^5` and `@testing-library/jest-dom` installed
- [x] `ParameterControls.test.ts` passes — all input types, formatting, and events verified
- [x] `ThemeToggle.test.ts` passes — label toggling, aria-pressed, and click events verified
- [x] `SketchSelector.test.ts` passes — option rendering and change events verified
- [x] Tests use behavior-focused queries (role, label) not DOM structure
- [x] `pnpm test:run` passes with all component tests
- [x] `pnpm tsc --noEmit` passes
- [x] `pnpm biome check --write` passes

---

### Effort Estimate (Phase 4)

| Task | Effort |
|------|--------|
| Install @testing-library/svelte + jest-dom | 0.25 hr |
| Write ParameterControls tests | 1 hr |
| Write ThemeToggle tests | 0.5 hr |
| Write SketchSelector tests (optional) | 0.25 hr |
| **Total** | **1-2 hrs** |

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
| Phase 3: Visual regression | 3-4 hrs |
| Phase 4: Component tests (optional) | 1-2 hrs |
| **Total** | **10-15 hrs** |
