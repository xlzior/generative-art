<script>
import SketchCard from "./SketchCard.svelte";
import ThemeToggle from "./ThemeToggle.svelte";

let { sketches, currentTheme, onnavigate, onthemechange } = $props();
</script>

<div class="gallery-shell">
	<header>
		<p class="eyebrow">Sketchbook</p>
		<h1>Generative Art Playground</h1>
		<p class="subtitle">
			Study pattern, noise, recursion, and emergence through small focused
			sketches.
		</p>
	</header>
	<div class="gallery-actions">
		<ThemeToggle {currentTheme} ontoggle={onthemechange} />
	</div>
	<div class="gallery-grid">
		{#each sketches as sketch (sketch.id)}
			<SketchCard {sketch} {currentTheme} onclick={onnavigate} />
		{/each}
	</div>
</div>

<style>
	.gallery-shell {
		min-height: 100vh;
		padding: var(--shell-pad);
		display: grid;
		gap: 1rem;
	}

	header {
		padding: 0.2rem 0;
	}

	.eyebrow {
		margin: 0;
		letter-spacing: 0.2em;
		text-transform: uppercase;
		font-size: 0.74rem;
		color: var(--eyebrow-ink);
	}

	h1 {
		margin: 0.3rem 0 0;
		font-size: clamp(1.8rem, 4vw, 2.7rem);
	}

	.subtitle {
		max-width: 60ch;
		margin: 0.5rem 0 0;
		color: var(--muted-ink);
	}

	.gallery-actions {
		display: flex;
		justify-content: flex-end;
		gap: 0.5rem;
	}

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
