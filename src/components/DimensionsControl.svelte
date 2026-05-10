<script>
let { dimensions, onchange } = $props();

function handleInput(dimension, event) {
	const raw = event.target.value.trim();
	const value = raw === "" ? null : Number.parseInt(raw, 10);
	const updated = {
		width:
			dimension === "width"
				? Number.isFinite(value)
					? value
					: null
				: dimensions.width,
		height:
			dimension === "height"
				? Number.isFinite(value)
					? value
					: null
				: dimensions.height,
	};
	onchange(updated);
}
</script>

<div class="dimensions-control">
	<label for="global-dimensions-width">Canvas Size</label>
	<div class="dimensions-input">
		<input
			type="text"
			inputmode="numeric"
			id="global-dimensions-width"
			value={dimensions?.width ?? ""}
			oninput={(e) => handleInput("width", e)}
			placeholder="W"
		/>
		<span class="dimensions-separator">×</span>
		<input
			type="text"
			inputmode="numeric"
			id="global-dimensions-height"
			value={dimensions?.height ?? ""}
			oninput={(e) => handleInput("height", e)}
			placeholder="H"
		/>
	</div>
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
		font: inherit;
		border-radius: 8px;
		border: 1px solid var(--stroke);
		color: var(--ink);
		background: var(--ui-surface);
	}

	.dimensions-separator {
		color: var(--eyebrow-ink);
	}
</style>
