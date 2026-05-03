<script>
import SketchCard from "./SketchCard.svelte";

let { sketches, currentTheme, onnavigate } = $props();
</script>

<div class="gallery-grid">
	{#each sketches as sketch (sketch.id)}
		<SketchCard {sketch} {currentTheme} onclick={onnavigate} />
	{/each}
</div>

<style>
	.gallery-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
		gap: 1.5rem;
		padding: 1rem 0;
	}

	@media (max-width: 740px) {
		.gallery-grid {
			grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
			gap: 1rem;
		}
	}
</style>
