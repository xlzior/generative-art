<script lang="ts">
import type { SketchParameter, Theme } from "../../types/sketch.js";
import { themeAccent } from "../../utils/colour.js";

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

<div class="colour-control">
	<label for="param-{parameter.key}">{parameter.label}</label>
	<input
		type="color"
		id="param-{parameter.key}"
		value={themeAccent(value ?? "#000000", theme)}
		oninput={(e) =>
			onchange(themeAccent((e.target as HTMLInputElement).value, theme))}
	/>
</div>

<style>
	.colour-control {
		display: grid;
		grid-template-columns: 1fr auto;
		gap: 0.3rem 0.4rem;
		align-items: center;
	}

	.colour-control label {
		font-size: 0.8rem;
		font-weight: 500;
	}
</style>
