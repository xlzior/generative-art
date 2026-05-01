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

**Install (Phase 1):**
- `vitest` + `@sveltejs/vite-plugin-svelte` — unit tests with Svelte 5 support

**Configure (Phase 1):**
- `vitest.config.ts` with Svelte plugin

Test the sketch system's public contract. No seeded randomness needed.

### 2.1 `defineSketch()` Validation (`src/utils/__tests__/defineSketch.test.ts`)
- Valid sketch passes
- Missing required fields (`id`, `title`, `description`, `date`, `parameters`, `create`) throws
- Invalid parameter types throw
- Duplicate parameter keys throw
- Number parameter validation (`min < max`, `step > 0`)

### 2.2 Sketch Auto-Discovery (`src/sketches/__tests__/validation.test.ts`)

**Refactoring needed:** Extract from `sketches/index.ts` into testable pure functions:
```typescript
// New: src/sketches/validation.ts
export function validateSketchModule(sketch, defaults) { ... }
export function sortSketches(sketches) { ... }
export function checkDuplicateIds(sketches) { ... }
```

Tests:
- `validateSketchModule()` — valid/invalid inputs
- `sortSketches()` — sorts by date descending, then title ascending
- `checkDuplicateIds()` — detects duplicates
- Defaults validation — keys match parameters, values are correct types

### 2.3 Vite Endpoint Logic (`vite.config.ts`)
Extract `readJsonBody` and `isWithinSketchesRoot` into testable functions. Test:
- `readJsonBody()` — correct body parsing
- `isWithinSketchesRoot()` — path traversal prevention

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
