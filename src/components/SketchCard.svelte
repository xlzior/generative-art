<script>
import SketchThumbnail from "./SketchThumbnail.svelte";

let { sketch, currentTheme: theme, onclick } = $props();
</script>

<div class="sketch-card" role="button" tabindex="0" onclick={() => onclick(sketch.id)} onkeydown={(e) => { if (e.key === "Enter" || e.key === " ") onclick(sketch.id); }}>
	<SketchThumbnail {sketch} {theme} />
	<div class="card-info">
		<p class="card-date">{sketch.date}</p>
		<h3 class="card-title">{sketch.title}</h3>
		<p class="card-desc">{sketch.description}</p>
	</div>
</div>

<style>
	.sketch-card {
		border: 1px solid var(--stroke);
		border-radius: 14px;
		background: var(--panel);
		backdrop-filter: blur(6px);
		cursor: pointer;
		overflow: hidden;
		transition: transform 150ms ease, border-color 150ms ease;
	}

	.sketch-card:hover {
		transform: translateY(-3px);
		border-color: var(--accent);
	}

	.card-info {
		padding: 0.65rem 0.8rem 0.8rem;
	}

	.card-date {
		margin: 0;
		font-size: 0.7rem;
		letter-spacing: 0.2em;
		text-transform: uppercase;
		color: var(--eyebrow-ink);
	}

	.card-title {
		margin: 0.25rem 0 0;
		font-size: 1rem;
		font-weight: 600;
	}

	.card-desc {
		margin: 0.25rem 0 0;
		font-size: 0.8rem;
		color: var(--muted-ink);
		overflow: hidden;
		text-overflow: ellipsis;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
		line-clamp: 2;
	}
</style>
