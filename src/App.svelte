<script>
  import { onMount } from 'svelte';
  import { createIcons, Download, Moon, RefreshCw, RotateCcw, Save } from 'lucide';
  import p5 from 'p5';
  import { sketches } from './sketches/index.js';
  import SketchSelector from './components/SketchSelector.svelte';
  import ParameterControls from './components/ParameterControls.svelte';
  import ThemeToggle from './components/ThemeToggle.svelte';

  let currentSketch = $state(sketches[0].id);
  let currentTheme = $state('light');
  let currentP5 = $state(null);
  let paramsBySketch = $state(new Map());
  let currentParams = $state(null);
  let currentSketchModule = $state(null);

  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');

  function getSketchById(sketchId) {
    return sketches.find((entry) => entry.id === sketchId);
  }

  function resolveInitialSketch() {
    const params = new URLSearchParams(window.location.search);
    const sketchFromUrl = params.get('sketch');
    if (sketchFromUrl && getSketchById(sketchFromUrl)) {
      return sketchFromUrl;
    }
    return sketches[0].id;
  }

  function writeSketchToUrl(sketchId) {
    const url = new URL(window.location.href);
    url.searchParams.set('sketch', sketchId);
    window.history.replaceState({}, '', url);
  }

  function cloneDefaults(sketch) {
    return { ...sketch.defaults };
  }

  function getParamsForSketch(sketch) {
    if (!paramsBySketch.has(sketch.id)) {
      paramsBySketch.set(sketch.id, cloneDefaults(sketch));
      paramsBySketch = new Map(paramsBySketch);
    }
    return paramsBySketch.get(sketch.id);
  }

  function resolveInitialTheme() {
    const stored = window.localStorage.getItem('theme');
    if (stored === 'light' || stored === 'dark') {
      return stored;
    }
    return prefersDark.matches ? 'dark' : 'light';
  }

  function applyTheme(theme) {
    currentTheme = theme;
    document.documentElement.setAttribute('data-theme', theme);
  }

  function mountSketch(sketchId, options = {}) {
    const { redrawControls = true, updateUrl = true } = options;
    const sketch = getSketchById(sketchId);
    if (!sketch) return;

    const params = getParamsForSketch(sketch);

    if (currentP5) {
      currentP5.remove();
      currentP5 = null;
    }

    currentSketch = sketch.id;
    currentSketchModule = sketch;
    currentParams = params;

    if (updateUrl) {
      writeSketchToUrl(currentSketch);
    }

    const container = document.getElementById('canvas-container');
    if (!container) return;

    currentP5 = new p5(
      (p) => sketch.create({ p, theme: currentTheme, params }),
      container,
    );
    document.title = sketch.title;

    if (redrawControls && currentSketchModule && currentParams) {
      // Trigger re-render of parameter controls
      currentParams = { ...currentParams };
    }
  }

  function handleRegenerate() {
    mountSketch(currentSketch, { updateUrl: false });
  }

  function handleResetParams() {
    const sketch = getSketchById(currentSketch);
    if (!sketch) return;
    paramsBySketch.set(sketch.id, cloneDefaults(sketch));
    paramsBySketch = new Map(paramsBySketch);
    mountSketch(currentSketch, { updateUrl: false });
  }

  async function handleSaveDefaults() {
    const sketch = sketches.find((entry) => entry.id === currentSketch);
    if (!sketch) return;

    const params = getParamsForSketch(sketch);
    const payload = {
      defaultsFile: sketch.defaultsFile,
      defaults: params,
    };

    try {
      const response = await fetch('/__sketch-defaults', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        let message = 'Failed to persist defaults';
        const contentType = response.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          const data = await response.json();
          message = data.message || message;
        }
        throw new Error(message);
      }

      sketch.defaults = { ...params };
    } catch (error) {
      console.error('Failed to save defaults:', error);
    }
  }

  function handleSavePNG() {
    if (currentP5) {
      const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
      currentP5.saveCanvas(`sketch-${currentSketch}-${stamp}`, 'png');
    }
  }

  function handleSketchChange(sketchId) {
    mountSketch(sketchId);
  }

  function handleThemeToggle() {
    const nextTheme = currentTheme === 'dark' ? 'light' : 'dark';
    applyTheme(nextTheme);
    window.localStorage.setItem('theme', nextTheme);
    mountSketch(currentSketch, { updateUrl: false, redrawControls: false });
  }

  function handleParamChange(key, value) {
    const sketch = getSketchById(currentSketch);
    if (!sketch) return;
    const params = getParamsForSketch(sketch);
    params[key] = value;
    paramsBySketch.set(sketch.id, { ...params });
    paramsBySketch = new Map(paramsBySketch);
    mountSketch(currentSketch, { updateUrl: false, redrawControls: false });
  }

  onMount(() => {
    applyTheme(resolveInitialTheme());
    createIcons({ icons: { Download, Moon, RefreshCw, RotateCcw, Save } });
    currentSketch = resolveInitialSketch();
    mountSketch(currentSketch);

    const handleKeyDown = (event) => {
      if (event.key.toLowerCase() === 'r' || event.code === 'Space') {
        event.preventDefault();
        mountSketch(currentSketch, { updateUrl: false });
      }
    };
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      if (currentP5) {
        currentP5.remove();
      }
    };
  });
</script>

<div class="app-shell">
  <header>
    <p class="eyebrow">Sketchbook</p>
    <h1>Generative Art Playground</h1>
    <p class="subtitle">
      Study pattern, noise, recursion, and emergence through small focused
      sketches.
    </p>
  </header>

  <section class="controls" aria-label="Sketch controls">
    <label for="sketch-select">Sketch</label>
    <SketchSelector
      {sketches}
      {currentSketch}
      onchange={handleSketchChange}
    />

    <button id="regenerate" type="button" onclick={handleRegenerate}>
      <span class="button-content">
        <i class="button-icon" data-lucide="refresh-cw" aria-hidden="true"></i>
        <span>Regenerate</span>
      </span>
    </button>

    <button id="save-frame" type="button" onclick={handleSavePNG}>
      <span class="button-content">
        <i class="button-icon" data-lucide="download" aria-hidden="true"></i>
        <span>Save PNG</span>
      </span>
    </button>

    <ThemeToggle {currentTheme} ontoggle={handleThemeToggle} />

    <section class="params-panel" aria-label="Sketch parameters">
      <p class="params-heading">Parameters</p>
      {#if currentSketchModule && currentParams}
        <ParameterControls
          sketch={currentSketchModule}
          params={currentParams}
          onchange={handleParamChange}
        />
      {/if}

      <div class="params-actions">
        <button id="reset-params" type="button" onclick={handleResetParams}>
          <span class="button-content">
            <i class="button-icon" data-lucide="rotate-ccw" aria-hidden="true"></i>
            <span>Reset To Defaults</span>
          </span>
        </button>
        <button id="save-defaults" type="button" onclick={handleSaveDefaults}>
          <span class="button-content">
            <i class="button-icon" data-lucide="save" aria-hidden="true"></i>
            <span id="save-defaults-label">Save As Default</span>
          </span>
        </button>
      </div>
      <p id="save-status" aria-live="polite"></p>
    </section>
  </section>

  <main>
    <div id="canvas-container" aria-live="polite"></div>
  </main>
</div>

<style>
  .app-shell {
    height: 100vh;
    display: grid;
    grid-template-columns: var(--sidebar-width) minmax(0, 1fr);
    grid-template-rows: auto 1fr;
    gap: 0.8rem;
    padding: var(--shell-pad);
  }

  header {
    grid-column: 1;
    grid-row: 1;
    padding: 0.2rem 0;
  }

  .eyebrow {
    margin: 0;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    font-size: 0.74rem;
    color: var(--eyebrow-ink);
  }

  h1 {
    margin: 0.3rem 0 0;
    font-size: clamp(1.8rem, 4vw, 2.7rem);
  }

  .subtitle {
    max-width: 60ch;
    margin: 0.5rem 0 0;
    color: var(--muted-ink);
  }

  .controls {
    grid-column: 1;
    grid-row: 2;
    align-content: start;
    display: grid;
    grid-template-columns: 1fr;
    gap: 0.55rem;
    padding: 0.8rem;
    min-height: 0;
    overflow: auto;
    border: 1px solid var(--stroke);
    border-radius: 14px;
    background: var(--panel);
    backdrop-filter: blur(6px);
  }

  .params-panel {
    margin-top: 0.55rem;
    padding-top: 0.55rem;
    border-top: 1px solid var(--stroke);
    display: grid;
    gap: 0.6rem;
  }

  .params-heading {
    margin: 0;
    font-size: 0.88rem;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    color: var(--eyebrow-ink);
  }

  .params-actions {
    display: grid;
    gap: 0.45rem;
  }

  #save-status {
    margin: 0;
    min-height: 1.1rem;
    font-size: 0.78rem;
    color: var(--eyebrow-ink);
  }

  main {
    grid-column: 2;
    grid-row: 1 / span 2;
    width: min(80vw, 100%);
    justify-self: end;
    align-self: stretch;
    min-height: 0;
  }

  #canvas-container {
    width: 100%;
    height: 100%;
    border-radius: 16px;
    overflow: hidden;
    border: 1px solid var(--stroke);
    background: rgba(255, 255, 255, 0.65);
    min-height: 0;
  }

  @media (max-width: 740px) {
    .app-shell {
      height: auto;
      min-height: 100vh;
      grid-template-columns: 1fr;
      grid-template-rows: auto auto minmax(65vh, 1fr);
    }

    header,
    .controls {
      grid-column: 1;
    }

    header {
      grid-row: 1;
    }

    .controls {
      grid-row: 2;
    }

    main {
      grid-column: 1;
      grid-row: 3;
      width: 100%;
      height: min(72vh, 720px);
    }
  }
</style>
