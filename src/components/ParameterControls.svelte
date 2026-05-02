<script>
let { sketch, params, onchange } = $props();

function formatParamValue(parameter, value) {
	if (parameter.type === "boolean") {
		return value ? "On" : "Off";
	}
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

function handleBooleanChange(parameter, event) {
	onchange(parameter.key, event.target.checked);
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
        <span class="param-value">{formatParamValue(parameter, params[parameter.key])}</span>
        <input
          type="checkbox"
          id="param-{sketch.id}-{parameter.key}"
          checked={Boolean(params[parameter.key])}
          onchange={(e) => handleBooleanChange(parameter, e)}
        />
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

  label {
    font-weight: 500;
  }

  input[type='text'],
  input[type='checkbox'] {
    font: inherit;
  }
</style>
