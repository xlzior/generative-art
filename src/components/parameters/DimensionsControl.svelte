<script lang="ts">
import type {
	DimensionsValue,
	SketchParameter,
	Theme,
} from "../../types/sketch.js";
import DimensionsInput from "./DimensionsInput.svelte";

let {
	parameter,
	value = { width: null, height: null },
	onchange,
	theme,
}: {
	parameter: SketchParameter;
	value: DimensionsValue;
	onchange: (value: DimensionsValue) => void;
	theme: Theme;
} = $props();
</script>

<div class="dimensions-control" data-theme={theme}>
	<label>
		{parameter.label}
		<DimensionsInput
			width={value.width}
			height={value.height}
			oninput={(dimension, event) => {
				const raw = (event.target as HTMLInputElement).value.trim();
				const parsed = raw === "" ? null : Number.parseInt(raw, 10);
				const v = Number.isFinite(parsed) ? parsed : null;
				onchange({ ...value, [dimension]: v });
			}}
		/>
	</label>
</div>

<style>
	.dimensions-control {
		display: grid;
		grid-template-columns: 1fr auto;
		gap: 0.3rem 0.4rem;
		align-items: center;
	}

	.dimensions-control label {
		font-size: 0.8rem;
		font-weight: 500;
	}
</style>
