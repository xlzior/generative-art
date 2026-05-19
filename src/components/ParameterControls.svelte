<script lang="ts">
import type { SketchModuleWithDefaults, Theme } from "../types/sketch.js";
import { controlMap } from "./parameters/control-map.js";

let {
	sketch,
	params,
	onchange,
	theme = "light",
}: {
	sketch: SketchModuleWithDefaults<Record<string, unknown>>;
	params: Record<string, unknown>;
	onchange: (key: string, value: unknown) => void;
	theme: Theme;
} = $props();
</script>

<div id="params-list">
	{#each sketch.parameters as parameter (parameter.key)}
		{@const Cmp = controlMap[parameter.type as keyof typeof controlMap] as any}
		<div class="param-control">
			<Cmp
				{parameter}
				value={params[parameter.key]}
				onchange={(v: unknown) => onchange(parameter.key, v)}
				{theme}
			/>
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
</style>
