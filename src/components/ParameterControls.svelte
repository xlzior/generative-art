<script>
// biome-ignore-all lint/correctness/noUnusedVariables: false positives - vars used in Svelte template
import { themeAccent } from "../utils/colour.js";

let { sketch, params, onchange, theme = "light" } = $props();

function formatParamValue(parameter, value) {
	if (parameter.type === "colour" || parameter.type === "string") {
		return String(value);
	}
	const num = value;
	if (Number.isInteger(num)) {
		return String(num);
	}
	return num
		.toFixed(3)
		.replace(/\.0+$/, "")
		.replace(/(\.\d*?)0+$/, "$1");
}

function handleNumberChange(parameter, event) {
	const value = Number(event.target.value);
	onchange(parameter.key, value);
}

function handleStringChange(parameter, event) {
	onchange(parameter.key, event.target.value);
}

function handleDimensionsChange(parameter, event) {
	const raw = event.target.value.trim();
	const value = raw === "" ? null : Number.parseInt(raw, 10);
	const dimension = event.target.dataset.dimension;
	const current = params[parameter.key] ?? { width: null, height: null };
	const updated = {
		width:
			dimension === "width"
				? Number.isFinite(value)
					? value
					: null
				: current.width,
		height:
			dimension === "height"
				? Number.isFinite(value)
					? value
					: null
				: current.height,
	};
	onchange(parameter.key, updated);
}
</script>

<div id="params-list">
  {#each sketch.parameters as parameter (parameter.key)}
    <div class="param-control">
      {#if parameter.type === 'number'}
        <label for="param-{sketch.id}-{parameter.key}">{parameter.label}</label>
        <span class="param-value">{formatParamValue(parameter, params[parameter.key])}</span>
        <input
          type="range"
          id="param-{sketch.id}-{parameter.key}"
          min={parameter.min}
          max={parameter.max}
          step={parameter.step ?? 1}
          value={params[parameter.key]}
          oninput={(e) => handleNumberChange(parameter, e)}
        />
      {:else if parameter.type === 'string'}
        <label for="param-{sketch.id}-{parameter.key}">{parameter.label}</label>
        <input
          type="text"
          id="param-{sketch.id}-{parameter.key}"
          value={params[parameter.key] ?? ''}
          oninput={(e) => handleStringChange(parameter, e)}
        />
      {:else if parameter.type === 'boolean'}
        <label for="param-{sketch.id}-{parameter.key}">{parameter.label}</label>
        <label class="toggle">
          <input
            type="checkbox"
            role="switch"
            id="param-{sketch.id}-{parameter.key}"
            checked={Boolean(params[parameter.key])}
            aria-checked={Boolean(params[parameter.key])}
            onchange={(e) => onchange(parameter.key, e.target.checked)}
          />
          <span class="toggle-track">
            <span class="toggle-thumb"></span>
          </span>
        </label>
      {:else if parameter.type === 'colour'}
        <label for="param-{sketch.id}-{parameter.key}">{parameter.label}</label>
        <input
          type="color"
          id="param-{sketch.id}-{parameter.key}"
          value={themeAccent(params[parameter.key] ?? '#000000', theme)}
          oninput={(e) => onchange(parameter.key, themeAccent(e.target.value, theme))}
        />
      {:else if parameter.type === 'dimensions'}
        <label for="param-{sketch.id}-{parameter.key}">{parameter.label}</label>
        <div class="dimensions-input">
          <input
            type="text"
            inputmode="numeric"
            id="param-{sketch.id}-{parameter.key}-width"
            value={params[parameter.key]?.width ?? ''}
            data-dimension="width"
            oninput={(e) => handleDimensionsChange(parameter, e)}
            placeholder="W"
          />
          <span class="dimensions-separator">×</span>
          <input
            type="text"
            inputmode="numeric"
            id="param-{sketch.id}-{parameter.key}-height"
            value={params[parameter.key]?.height ?? ''}
            data-dimension="height"
            oninput={(e) => handleDimensionsChange(parameter, e)}
            placeholder="H"
          />
        </div>
      {/if}
    </div>
  {/each}
</div>

<style>
  #params-list {
    display: grid;
    gap: 0.5rem;
  }

  .param-control {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 0.3rem 0.4rem;
    align-items: center;
  }

  .param-control label {
    font-size: 0.8rem;
    font-weight: 500;
  }

  .param-value {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 0.74rem;
    color: var(--eyebrow-ink);
  }

  .param-control input[type='range'] {
    grid-column: 1 / span 2;
    width: 100%;
    accent-color: var(--accent);
  }

  input[type='text'] {
    font: inherit;
  }

  .toggle {
    display: inline-flex;
    cursor: pointer;
  }

  .toggle input {
    position: absolute;
    opacity: 0;
    width: 0;
    height: 0;
  }

	.toggle-track {
		position: relative;
		display: inline-block;
		width: 34px;
		height: 18px;
		background: var(--stroke);
		border-radius: 9px;
		transition: background 120ms ease;
	}

	.toggle input:checked + .toggle-track {
		background: var(--accent);
	}

	.toggle-thumb {
		position: absolute;
		top: 2px;
		left: 2px;
		width: 14px;
		height: 14px;
		background: white;
		border-radius: 50%;
		transition: transform 120ms ease;
		box-shadow: 0 1px 2px rgba(0, 0, 0, 0.15);
	}

	.toggle input:checked + .toggle-track .toggle-thumb {
		transform: translateX(16px);
	}

  .toggle:hover .toggle-track {
    background: color-mix(in srgb, var(--stroke), var(--accent) 30%);
  }

  .toggle input:checked:hover + .toggle-track {
    background: color-mix(in srgb, var(--accent), transparent 15%);
  }

  .dimensions-input {
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 0.35rem;
    font-family: 'IBM Plex Mono', monospace;
    font-size: 0.86rem;
  }

  .dimensions-input input[type='text'] {
    width: 3.8rem;
    font-family: inherit;
    font-size: inherit;
    padding: 0.15rem 0.3rem;
  }

  .dimensions-separator {
    color: var(--eyebrow-ink);
  }
</style>
