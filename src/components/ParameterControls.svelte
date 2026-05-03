<script>
// biome-ignore-all lint/correctness/noUnusedVariables: false positives - vars used in Svelte template
let { sketch, params, onchange } = $props();

function formatParamValue(parameter, value) {
	if (parameter.type === "string") {
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
        <span class="param-value">{formatParamValue(parameter, params[parameter.key])}</span>
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
      {/if}
    </div>
  {/each}
</div>

<style>
  #params-list {
    display: grid;
    gap: 0.65rem;
  }

  .param-control {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 0.35rem 0.5rem;
    align-items: center;
  }

  .param-control label {
    font-size: 0.86rem;
    font-weight: 500;
  }

  .param-value {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 0.78rem;
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
    width: 40px;
    height: 22px;
    background: var(--stroke);
    border-radius: 11px;
    transition: background 120ms ease;
  }

  .toggle input:checked + .toggle-track {
    background: var(--accent);
  }

  .toggle-thumb {
    position: absolute;
    top: 2px;
    left: 2px;
    width: 18px;
    height: 18px;
    background: white;
    border-radius: 50%;
    transition: transform 120ms ease;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.15);
  }

  .toggle input:checked + .toggle-track .toggle-thumb {
    transform: translateX(18px);
  }

  .toggle:hover .toggle-track {
    background: color-mix(in srgb, var(--stroke), var(--accent) 30%);
  }

  .toggle input:checked:hover + .toggle-track {
    background: color-mix(in srgb, var(--accent), transparent 15%);
  }
</style>
