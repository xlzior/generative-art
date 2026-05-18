<script lang="ts">
import type { DimensionsValue } from "../../types/sketch.js";

let {
	width,
	height,
	oninput,
}: {
	width: DimensionsValue["width"];
	height: DimensionsValue["height"];
	oninput: (dimension: "width" | "height", event: Event) => void;
} = $props();
</script>

<div class="dimensions-input">
	<input
		type="text"
		inputmode="numeric"
		value={width ?? ""}
		oninput={(e) => oninput("width", e)}
		placeholder="W"
	/>
	<span class="dimensions-separator">×</span>
	<input
		type="text"
		inputmode="numeric"
		value={height ?? ""}
		oninput={(e) => oninput("height", e)}
		placeholder="H"
	/>
</div>

<style>
	.dimensions-input {
		display: flex;
		flex-direction: row;
		align-items: center;
		gap: 0.35rem;
		font-family: "IBM Plex Mono", monospace;
		font-size: 0.86rem;
	}

	.dimensions-input input[type="text"] {
		width: 3.8rem;
		font-family: inherit;
		font-size: inherit;
		padding: 0.15rem 0.3rem;
	}

	.dimensions-separator {
		color: var(--eyebrow-ink);
	}
</style>
