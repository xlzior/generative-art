<script lang="ts">
import type { SketchParameter, Theme } from "../../types/sketch.js";

let {
	parameter: p,
	value,
	onchange,
	theme,
}: {
	parameter: SketchParameter & {
		type: "select";
		options: ReadonlyArray<{ label: string; value: string }>;
	};
	value: string;
	onchange: (value: string) => void;
	theme: Theme;
} = $props();
</script>

<div class="select-control" data-theme={theme}>
	<label for="param-{p.key}">{p.label}</label>
	<select
		id="param-{p.key}"
		onchange={(e) => onchange((e.target as HTMLSelectElement).value)}
	>
		{#each p.options as option}
			<option
				value={option.value}
				selected={value === option.value}
			>
				{option.label}
			</option>
		{/each}
	</select>
</div>

<style>
	.select-control label {
		font-size: 0.8rem;
		font-weight: 500;
	}

	select {
		grid-column: 1 / span 2;
		width: 100%;
		font: inherit;
		padding: 0.15rem 0.3rem;
		border: 1px solid var(--stroke);
		border-radius: 4px;
		background: var(--surface);
		color: var(--ink);
	}
</style>
