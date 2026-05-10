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
		grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
		gap: 1.2rem;
		padding: 0.8rem 0;
	}

	@media (max-width: 740px) {
		.gallery-grid {
			grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
			gap: 0.8rem;
		}
	}
</style>
