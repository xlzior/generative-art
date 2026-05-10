<script>
import { Moon, Sun } from "lucide-svelte";

let { currentTheme, ontoggle } = $props();
</script>

<div class="theme-toggle" role="radiogroup" aria-label="Color mode">
	<button
		type="button"
		role="radio"
		aria-checked={currentTheme === "light"}
		class:active={currentTheme === "light"}
		onclick={ontoggle}
	>
		<Sun size={16} aria-hidden="true" />
		<span>Light</span>
	</button>
	<button
		type="button"
		role="radio"
		aria-checked={currentTheme === "dark"}
		class:active={currentTheme === "dark"}
		onclick={ontoggle}
	>
		<Moon size={16} aria-hidden="true" />
		<span>Dark</span>
	</button>
</div>

<style>
	.theme-toggle {
		display: flex;
		border: 1px solid var(--stroke);
		border-radius: 10px;
		overflow: hidden;
		width: 100%;
		margin-top: 0.3rem;
	}

	button {
		flex: 1;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 0.35rem;
		padding: 0.55rem 0.6rem;
		font: inherit;
		font-size: 0.88rem;
		color: var(--muted-ink);
		background: transparent;
		border: none;
		cursor: pointer;
		transition: background 150ms ease, color 150ms ease;
	}

	button.active {
		color: var(--ink);
		background: color-mix(in srgb, var(--accent), transparent 82%);
	}

	button:hover:not(.active) {
		background: color-mix(in srgb, var(--accent), transparent 90%);
	}

</style>
