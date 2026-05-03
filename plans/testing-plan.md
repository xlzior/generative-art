# Testing Plan

## Context

The project currently has partial test coverage:
- `src/utils/__tests__/defineSketch.test.ts` — validates sketch contract
- `src/sketches/__tests__/validation.test.ts` — tests validation helpers
- `src/components/__tests__/ParameterControls.test.ts` — component tests with @testing-library/svelte
- `src/components/__tests__/ThemeToggle.test.ts` — component test
- `src/components/__tests__/SketchSelector.test.ts` — component test
- `src/vite/__tests__/endpoint.test.ts` — Vite plugin endpoint test
- `tests/visual/sketches.spec.ts` — Playwright visual regression tests

**Tooling**: Vitest (node + jsdom environments), @testing-library/svelte, Playwright

**Config**: `vitest.config.ts` — `src/components/**/__tests__/**` uses jsdom; `src/**/__tests__/**` uses node by default.

---

## 1. Test `src/sketches/index.ts` — Auto-Discovery

**File**: `src/sketches/__tests__/index.test.ts`
**Environment**: Node

The module uses `import.meta.glob` with `{ eager: true }`, which is hard to mock directly. Test the composite behavior by testing the helper functions it imports, plus add integration tests that temporarily manipulate the filesystem or mock `import.meta.glob`.

### Test Cases

**Glob discovery & defaults merging:**
- `validateSketchModule()` already tested in `validation.test.ts` — index.ts wiring just calls it
- Test that `defaultsByFolder` correctly maps folder names to defaults JSON

**Duplicate detection integration:**
- `checkDuplicateIds()` already tested in `validation.test.ts`
- Add test: create a mock module array with duplicates and verify index.ts throws at module level

**Sort behavior:**
- `sortSketches()` already tested in `validation.test.ts`
- Verify index.ts exports sketches in correct order (newest first, then title)

**Missing defaults.json:**
- Test that a sketch folder without `defaults.json` throws a TypeError

**Invalid sketch module shape:**
- Test that a module not exporting a default object throws

### Approach

Since `import.meta.glob` is difficult to mock, the pragmatic approach is:
1. Test the pure helper functions it delegates to (already done in `validation.test.ts`)
2. Add an integration test that creates temporary sketch folders in a test fixture directory and dynamically imports them (complex, may not be worth the effort)
3. Alternatively, directly test `sketchModules` array construction logic by extracting it into a testable function

**Recommendation**: The helpers are already well-tested. Add a smoke test that imports `sketches` from `src/sketches/index.ts` and asserts:
- It is an array
- All items have `id`, `title`, `defaults`, `defaultsFile` fields
- No duplicate IDs (the module would have thrown otherwise)
- Sorted by date descending

---

## 2. Test `src/utils/seeded-random.ts`

**File**: `src/utils/__tests__/seeded-random.test.ts`
**Environment**: Node

### Test Cases

**`createRng(seed)` — determinism:**
- Same seed produces identical sequences: create two RNGs with same seed, call each 100 times, assert sequences match
- Different seeds produce different sequences: verify two RNGs with different seeds produce different first values
- Known seed output: for seed=42, first call returns expected value (calculate manually or snapshot)

**`rngRandom(rng, min, max)` — range:**
- `rngRandom(rng, 10)` returns value in [0, 10)
- `rngRandom(rng, 5, 10)` returns value in [5, 10)
- Call many times, assert all values within range
- Verify: `rngRandom(rng, 0, 1) < 1` always true

**`rngInt(rng, bound)` — bounds:**
- `rngInt(rng, 10)` returns integer in [0, 10)
- Result is always an integer (Math.floor was used)
- Result is always < bound
- Result is always >= 0
- Edge case: `rngInt(rng, 1)` always returns 0

**`rngChoice(rng, arr)` — distribution:**
- Throws or returns undefined for empty array (check current behavior)
- Correctly picks from array indices
- For array of length 1, always returns that element
- Statistical test: call many times with known seed, verify distribution is roughly uniform (e.g., within 5% of expected for 1000 calls)

### Example Structure

```typescript
describe("createRng()", () => {
  it("produces deterministic output for same seed", () => {
    const a = createRng(12345);
    const b = createRng(12345);
    for (let i = 0; i < 100; i++) {
      expect(a()).toBe(b());
    }
  });
});

describe("rngRandom()", () => {
  it("returns value in [0, max) when only max provided", () => {
    const rng = createRng(42);
    for (let i = 0; i < 100; i++) {
      const v = rngRandom(rng, 10);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(10);
    }
  });
});
```

---

## 3. Test `src/utils/seed.ts`

**File**: `src/utils/__tests__/seed.test.ts`
**Environment**: jsdom (uses `window.location` and `window.history`)

### Test Cases

**`getSeedFromUrl()` — reading seed:**
- No query param → returns random number (should be finite integer)
- `?seed=42` → returns 42
- `?seed=0` → returns 0
- `?seed=abc` → falls back to random (non-numeric rejected)
- `?seed=3.14` → falls back to random (decimal rejected by `^\d+$` regex)
- `?seed=-1` → falls back to random (negative rejected)
- `?other=42&seed=99` → returns 99 (picks correct param)
- Multiple `?seed=1&seed=2` → returns first (URLSearchParams behavior)

**`setSeedInUrl(seed)` — writing seed:**
- Updates URL search param without reload
- `setSeedInUrl(42)` → `window.location.href` includes `?seed=42`
- Overwrites existing seed
- Uses `replaceState` (not pushState) so back button isn't affected

### Setup

```typescript
import { beforeEach, describe, expect, it } from "vitest";

describe("seed.ts", () => {
  beforeEach(() => {
    // Reset URL before each test
    window.history.replaceState({}, "", "/");
  });

  it("getSeedFromUrl() returns seed from URL", () => {
    window.history.replaceState({}, "", "/?seed=42");
    expect(getSeedFromUrl()).toBe(42);
  });
});
```

---

## 4. Test `src/utils/animation-controller.ts`

**File**: `src/utils/__tests__/animation-controller.test.ts`
**Environment**: Node (uses `requestAnimationFrame` — mock it)

### Test Cases

**`onFrame()` — starting animation:**
- Calling `onFrame(cb)` starts the animation loop
- The callback receives incrementing frameCount starting at 0
- `requestAnimationFrame` is called (mock and verify)

**`stop()` — stopping animation:**
- After `stop()`, callback is no longer called
- `cancelAnimationFrame` is called

**`destroy()` — cleanup:**
- After `destroy()`, callback is nulled and animation stops
- Safe to call multiple times

**`attachToP5(p)` — p5 integration:**
- Calls `p.noLoop()` to prevent p5's default draw loop
- Should be called before sketch `create()` to work correctly

**Frame count behavior:**
- First frameCount is 0 (line 13: `let frameCount = -1`)
- Each `loop()` iteration increments by 1

### Mocking `requestAnimationFrame`

```typescript
describe("animation-controller", () => {
  let rafCallbacks: FrameRequestCallback[] = [];
  let rafId = 0;

  beforeEach(() => {
    rafCallbacks = [];
    rafId = 0;
    global.requestAnimationFrame = vi.fn((cb) => {
      rafCallbacks.push(cb);
      return ++rafId;
    });
    global.cancelAnimationFrame = vi.fn();
  });
});
```

---

## 5. Test `src/utils/canvas-size.ts`

**File**: `src/utils/__tests__/canvas-size.test.ts`
**Environment**: jsdom

### Test Cases

**`getCanvasSize(containerId, minSize)`:**

- Container exists with specific dimensions → returns container's `clientWidth`/`clientHeight`
- Container not found → falls back to `window.innerWidth`/`window.innerHeight`
- Result respects `minSize` constraint: if container is smaller than minSize, returns minSize
- Default `containerId` is `"canvas-container"`
- Default `minSize` is 320
- Returns integer values (uses `Math.floor`)

### Setup

```typescript
describe("getCanvasSize()", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("uses container client dimensions when available", () => {
    const container = document.createElement("div");
    container.id = "canvas-container";
    Object.defineProperty(container, "clientWidth", { value: 800 });
    Object.defineProperty(container, "clientHeight", { value: 600 });
    document.body.appendChild(container);

    const size = getCanvasSize();
    expect(size).toEqual({ width: 800, height: 600 });
  });

  it("enforces minSize", () => {
    const container = document.createElement("div");
    container.id = "canvas-container";
    Object.defineProperty(container, "clientWidth", { value: 100 });
    Object.defineProperty(container, "clientHeight", { value: 100 });
    document.body.appendChild(container);

    const size = getCanvasSize("canvas-container", 320);
    expect(size).toEqual({ width: 320, height: 320 });
  });
});
```

---

## 6. Test `src/utils/responsive-canvas.ts`

**File**: `src/utils/__tests__/responsive-canvas.test.ts`
**Environment**: Node (mock p5 instance)

### Test Cases

**`attachResponsiveCanvas(p, options)`:

- Sets `p.setup` to a function that calls `p.createCanvas(width, height)`
- Sets `p.windowResized` to a function that calls `p.resizeCanvas(width, height)`
- Calls `onSetup` callback after canvas creation in `p.setup`
- Calls `onResize` callback after resize in `p.windowResized`
- Uses custom `containerId` and `minSize` when provided

### Mocking p5

```typescript
describe("attachResponsiveCanvas()", () => {
  it("sets up p.setup and p.windowResized", () => {
    const p = {
      setup: null as unknown as () => void,
      windowResized: null as unknown as () => void,
      createCanvas: vi.fn(),
      resizeCanvas: vi.fn(),
    };

    attachResponsiveCanvas(p as unknown as p5);

    expect(typeof p.setup).toBe("function");
    expect(typeof p.windowResized).toBe("function");

    // Trigger setup
    p.setup();
    expect(p.createCanvas).toHaveBeenCalled();

    // Trigger resize
    p.windowResized();
    expect(p.resizeCanvas).toHaveBeenCalled();
  });
});
```

**Note**: This test currently has a limitation — `getCanvasSize` is called inside `p.setup`, which requires DOM. Either:
1. Mock `getCanvasSize` (vi.mock)
2. Use jsdom environment
3. Refactor `attachResponsiveCanvas` to accept a `resolveSize` function (more testable)

---

## 7. Test `src/App.svelte`

**File**: `src/__tests__/App.test.ts`
**Environment**: jsdom (Svelte component)

### Test Cases

**Rendering:**
- Renders sketch selector with all available sketches
- Renders parameter controls when a sketch is selected
- Renders canvas container

**Sketch selection:**
- Selecting a sketch from SketchSelector updates the current sketch
- URL is updated with sketch ID (or relevant state)

**Parameter changes:**
- Changing parameters via ParameterControls triggers sketch re-creation
- `onchange` handler is called with correct key/value

**Save defaults UI (from TODO):**
- `#save-status` element exists but is not currently updated
- Test that save status shows success/error messages when implemented

**Seed handling:**
- `getSeedFromUrl()` is called on mount
- Seed is passed to sketch context

### Component Test Setup

```typescript
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/svelte";
import App from "../App.svelte";

describe("App.svelte", () => {
  it("renders sketch selector", () => {
    render(App);
    expect(screen.getByRole("combobox")).toBeInTheDocument();
  });

  it("renders canvas container", () => {
    render(App);
    expect(document.getElementById("canvas-container")).toBeInTheDocument();
  });
});
```

**Challenge**: `App.svelte` mounts p5 sketches which need a real canvas. May need to:
1. Mock p5 globally
2. Use `vi.mock` to replace sketch `create()` functions with no-ops
3. Test App in "non-animated" mode or with mocked sketches

---

## Implementation Order

1. **`seeded-random.test.ts`** — pure functions, easy to test, high value
2. **`seed.test.ts`** — jsdom tests, straightforward
3. **`canvas-size.test.ts`** — jsdom tests, straightforward
4. **`animation-controller.test.ts`** — requires RAF mocking but isolated
5. **`responsive-canvas.test.ts`** — requires p5 mock or refactor
6. **`index.test.ts`** — integration test, may require refactoring for full coverage
7. **`App.test.ts`** — most complex, requires component mocking

---

## Commands

```bash
# Run all unit tests
pnpm test:run

# Run specific test file
pnpm test:run src/utils/__tests__/seeded-random.test.ts

# Watch mode during development
pnpm test

# Run visual regression tests (requires dev server)
pnpm test:visual
```

---

## Notes

- Tests go in `__tests__/` folders adjacent to the source files
- Node environment is default for `src/**/__tests__/**` per vitest.config.ts
- Use `environmentMatchGlobs` to override to jsdom when needed
- Follow existing patterns: `describe`/`it` blocks, clear assertions, mock setup in `beforeEach`
