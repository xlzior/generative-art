# Plan: Sketch Gallery Home Page

## Overview

Add a gallery home page to the app using the existing query parameter method for sketch navigation. The gallery uses live p5 thumbnails with a fixed seed.

**URL Behavior:**
- `http://localhost:5174/` → Gallery view (no URL change)
- `http://localhost:5174/?sketch=mona-lisa-circles` → Full sketch view (existing query param method)

---

## New Files

### 1. `src/components/SketchThumbnail.svelte`

Renders a ~300×300 p5 canvas for a sketch using a fixed seed (`42`) and a no-op animation controller. Calls `p.noLoop()` so it renders once. Cleans up the p5 instance on destroy.

**Props:**
- `sketch` — the sketch module object
- `theme` — current theme ('light' | 'dark')

**Behavior:**
- Creates a `new p5((p) => { ... }, container)`
- Passes a mock `animation` controller: `{ onFrame: () => {}, stop: () => {} }`
- Uses `createRng(42)` for deterministic rendering
- After calling `sketch.create()`, calls `p.noLoop()` to prevent any draw loop
- P5 instance is removed on component destroy via `onMount` return

### 2. `src/components/SketchCard.svelte`

A clickable card wrapping a `SketchThumbnail` plus metadata (title, date, description). Emits `onclick` with the sketch ID.

**Props:**
- `sketch` — the sketch module object
- `theme` — current theme
- `onclick` — callback with sketch id

**Structure:**
```svelte
<div class="sketch-card" onclick={() => onclick(sketch.id)}>
  <div class="thumbnail-container">
    <SketchThumbnail {sketch} {theme} />
  </div>
  <div class="card-info">
    <p class="card-date">{sketch.date}</p>
    <h3 class="card-title">{sketch.title}</h3>
    <p class="card-desc">{sketch.description}</p>
  </div>
</div>
```

### 3. `src/components/SketchGallery.svelte`

Full-page gallery layout: header ("Sketchbook" / "Generative Art Playground") with theme toggle, then a responsive CSS grid of `SketchCard` components.

**Props:**
- `sketches` — array of sketch modules
- `currentTheme` — current theme
- `onnavigate` — callback with sketch id
- `onthemechange` — callback to toggle theme

**Structure:**
```svelte
<div class="gallery-shell">
  <header>
    <p class="eyebrow">Sketchbook</p>
    <h1>Generative Art Playground</h1>
    <p class="subtitle">Study pattern, noise, recursion, and emergence through small focused sketches.</p>
  </header>
  <div class="gallery-actions">
    <ThemeToggle {currentTheme} ontoggle={onthemechange} />
  </div>
  <div class="gallery-grid">
    {#each sketches as sketch (sketch.id)}
      <SketchCard {sketch} {currentTheme} onclick={onnavigate} />
    {/each}
  </div>
</div>
```

### 4. `src/components/SketchView.svelte`

Extracted from current `App.svelte` — owns all sketch-rendering state (`currentSketch`, `paramsBySketch`, `currentP5`, `currentController`, etc.), the controls sidebar, the canvas, and the back button.

**Props:**
- `sketchId` — the current sketch id
- `currentTheme` — current theme
- `onback` — callback to navigate back to gallery
- `onthemechange` — callback to toggle theme

**State (moved from App.svelte):**
- `currentP5`, `currentController`, `paramsBySketch`, `currentParams`, `currentSketchModule`, `currentRng`

**Functions (moved from App.svelte):**
- `getSketchById()`, `cloneDefaults()`, `getParamsForSketch()`, `mountSketch()`, `unmountSketch()`
- `handleRegenerate()`, `handleResetParams()`, `handleSaveDefaults()`, `handleSavePNG()`
- `handleParamChange()`

**Template:**
- Back button at top: `<button onclick={onback}>← Back to Gallery</button>`
- Controls sidebar (same as current App.svelte)
- Canvas container (same as current App.svelte)

---

## Modified Files

### 5. `src/App.svelte`

**Remove:**
- All sketch-rendering logic (moved to `SketchView.svelte`)
- `currentP5`, `currentController`, `paramsBySketch`, `currentParams`, `currentSketchModule` state
- `mountSketch()`, `unmountSketch()`, `handleRegenerate()`, etc.

**Add:**
- Route state based on query params (not hash):
  ```js
  let currentSketchId = $state(null);

  function resolveSketchFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const sketchFromUrl = params.get("sketch");
    if (sketchFromUrl && getSketchById(sketchFromUrl)) {
      return sketchFromUrl;
    }
    return null; // null means gallery view
  }
  ```

- `popstate` listener for browser back/forward:
  ```js
  onMount(() => {
    applyTheme(resolveInitialTheme());
    currentSketchId = resolveSketchFromUrl();
    window.addEventListener('popstate', () => {
      currentSketchId = resolveSketchFromUrl();
    });
    return () => window.removeEventListener('popstate', ...);
  });
  ```

- `handleNavigate(sketchId)` — uses `history.pushState` to set `?sketch=id`:
  ```js
  function handleNavigate(sketchId) {
    const url = new URL(window.location.href);
    url.searchParams.set("sketch", sketchId);
    window.history.pushState({}, "", url);
    currentSketchId = sketchId;
  }
  ```

- `handleBack()` — removes the sketch query param:
  ```js
  function handleBack() {
    const url = new URL(window.location.href);
    url.searchParams.delete("sketch");
    window.history.pushState({}, "", url);
    currentSketchId = null;
  }
  ```

**Template:**
```svelte
<div class="app-shell">
  {#if currentSketchId === null}
    <SketchGallery
      {sketches}
      {currentTheme}
      onnavigate={handleNavigate}
      onthemechange={handleThemeToggle}
    />
  {:else}
    <SketchView
      sketchId={currentSketchId}
      {currentTheme}
      onback={handleBack}
      onthemechange={handleThemeToggle}
    />
  {/if}
</div>
```

### 6. `src/styles.css`

Add styles for:

```css
/* Gallery shell - full width when in gallery mode */
.gallery-shell {
  min-height: 100vh;
  padding: var(--shell-pad);
  display: grid;
  gap: 1rem;
}

/* Gallery grid */
.gallery-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1.5rem;
  padding: 1rem 0;
}

/* Sketch card */
.sketch-card {
  border: 1px solid var(--stroke);
  border-radius: 14px;
  background: var(--panel);
  backdrop-filter: blur(6px);
  cursor: pointer;
  overflow: hidden;
  transition: transform 150ms ease, border-color 150ms ease;
}

.sketch-card:hover {
  transform: translateY(-3px);
  border-color: var(--accent);
}

/* Thumbnail container */
.thumbnail-container {
  aspect-ratio: 1;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.65);
}

.thumbnail-container canvas {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

/* Card info */
.card-info {
  padding: 0.8rem 1rem 1rem;
}

.card-date {
  margin: 0;
  font-size: 0.74rem;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--eyebrow-ink);
}

.card-title {
  margin: 0.3rem 0 0;
  font-size: 1.1rem;
  font-weight: 600;
}

.card-desc {
  margin: 0.3rem 0 0;
  font-size: 0.86rem;
  color: var(--muted-ink);
}

/* Gallery actions bar */
.gallery-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}

/* Responsive adjustments */
@media (max-width: 740px) {
  .gallery-grid {
    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
    gap: 1rem;
  }
}
```

Also update `.app-shell` to handle both gallery and sketch views:
```css
.app-shell {
  min-height: 100vh;
}

/* When in gallery mode, allow scrolling */
.app-shell:has(.gallery-shell) {
  height: auto;
}
```

---

## URL Routing Details

```
http://localhost:5174/                    → Gallery (default landing page, URL unchanged)
http://localhost:5174/?sketch=mona-lisa-circles  → Full sketch view
```

`App.svelte` listens to `popstate` for browser back/forward, and uses `history.pushState()`/`history.replaceState()` to update the URL without reloading. The gallery view at `/` has no query params, so the URL stays clean.

---

## Thumbnail Details

`SketchThumbnail.svelte` implementation notes:

- Creates a container div, mounts p5 into it
- The create callback receives:
  - `p` — p5 instance
  - `theme` — current theme
  - `params` — sketch defaults
  - `rng` — `createRng(42)`
  - `animation` — `{ onFrame: () => {}, stop: () => {} }`
- After `sketch.create()` completes, call `p.noLoop()` if p5 is in draw mode
- Cleanup: `p.remove()` on component destroy
- Fixed canvas size: 300x300 (set via `p.createCanvas(300, 300)` inside the wrapper)

---

## Implementation Order

1. `src/components/SketchThumbnail.svelte` — no deps on other new files
2. `src/components/SketchCard.svelte` — depends on SketchThumbnail
3. `src/components/SketchGallery.svelte` — depends on SketchCard + ThemeToggle
4. `src/components/SketchView.svelte` — extract from App.svelte
5. Update `src/App.svelte` — add query param routing, wire components
6. Update `src/styles.css` — add gallery styles
7. Run `pnpm biome check --write` and `pnpm tsc --noEmit` to verify

---

## Testing

- `pnpm test:run` — run unit tests
- `pnpm dev` — manual testing of gallery and sketch views
- Verify query param routing works (back/forward buttons)
- Verify thumbnails render correctly for all sketches
- Verify theme toggle works in both gallery and sketch views
- Verify gallery URL stays as `/` (no query params)
