<script lang="ts">
import type { SketchParameter, Theme } from "../../types/sketch.js";

let {
	parameter,
	value,
	onchange,
	theme,
}: {
	parameter: SketchParameter;
	value: string;
	onchange: (value: string) => void;
	theme: Theme;
} = $props();
</script>

<div class="string-control" data-theme={theme}>
	<label for="param-{parameter.key}">{parameter.label}</label>
	<input
		type="text"
		id="param-{parameter.key}"
		value={value ?? ""}
		oninput={(e) => onchange((e.target as HTMLInputElement).value)}
	/>
</div>

<style>
	.string-control label {
		font-size: 0.8rem;
		font-weight: 500;
	}

	input[type="text"] {
		font: inherit;
	}
</style>
