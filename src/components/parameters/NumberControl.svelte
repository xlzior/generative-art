<script lang="ts">
import type { SketchParameter, Theme } from "../../types/sketch.js";
import { formatParamValue } from "./format-param-value.js";

let {
	parameter,
	value,
	onchange,
	theme,
}: {
	parameter: SketchParameter & {
		type: "number";
		min: number;
		max: number;
		step?: number;
	};
	value: number;
	onchange: (value: number) => void;
	theme: Theme;
} = $props();
</script>

<div class="number-control" data-theme={theme}>
	<label for="param-{parameter.key}">{parameter.label}</label>
	<span class="param-value">{formatParamValue(parameter, value)}</span>
	<input
		type="range"
		id="param-{parameter.key}"
		min={parameter.min}
		max={parameter.max}
		step={parameter.step ?? 1}
		value={value}
		oninput={(e) => onchange(Number((e.target as HTMLInputElement).value))}
	/>
</div>

<style>
	.number-control {
		display: contents;
	}

	.number-control label {
		font-size: 0.8rem;
		font-weight: 500;
	}

	.param-value {
		font-family: "IBM Plex Mono", monospace;
		font-size: 0.74rem;
		color: var(--eyebrow-ink);
	}

	.number-control input[type="range"] {
		grid-column: 1 / span 2;
		width: 100%;
		accent-color: var(--accent);
	}
</style>
