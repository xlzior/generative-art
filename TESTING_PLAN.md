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

**Why:** Visual regression requires deterministic output. Currently sketches using `Math.random()` are non-deterministic.

**Implementation:**
1. Create `src/utils/seeded-random.ts` — export `createRng(seed): () => number` (mulberry32)
2. Add `rng` to `SketchContext` type
3. Update all 8 sketches to use `rng()` instead of `Math.random()`
4. Pass seed via URL param `?seed=42` (fall back to random)

**Note:** This is a TODO item but necessary before visual tests. Recommend doing it early.

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
