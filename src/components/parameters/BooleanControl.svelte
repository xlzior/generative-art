<script lang="ts">
import type { SketchParameter, Theme } from "../../types/sketch.js";

let {
	parameter,
	value,
	onchange,
	theme,
}: {
	parameter: SketchParameter;
	value: boolean;
	onchange: (value: boolean) => void;
	theme: Theme;
} = $props();
</script>

<div class="boolean-control" data-theme={theme}>
	<span class="boolean-label">{parameter.label}</span>
	<label class="toggle" aria-label={parameter.label}>
		<input
			type="checkbox"
			role="switch"
			checked={Boolean(value)}
			aria-checked={Boolean(value)}
			aria-label={parameter.label}
			onchange={(e) => onchange((e.target as HTMLInputElement).checked)}
		/>
		<span class="toggle-track">
			<span class="toggle-thumb"></span>
		</span>
	</label>
</div>

<style>
	.boolean-control {
		display: grid;
		grid-template-columns: 1fr auto;
		gap: 0.3rem 0.4rem;
		align-items: center;
	}

	.boolean-label {
		font-size: 0.8rem;
		font-weight: 500;
	}

	.toggle {
		display: inline-flex;
		cursor: pointer;
	}

	.toggle input {
		position: absolute;
		opacity: 0;
		width: 0;
		height: 0;
	}

	.toggle-track {
		position: relative;
		display: inline-block;
		width: 34px;
		height: 18px;
		background: var(--stroke);
		border-radius: 9px;
		transition: background 120ms ease;
	}

	.toggle input:checked + .toggle-track {
		background: var(--accent);
	}

	.toggle-thumb {
		position: absolute;
		top: 2px;
		left: 2px;
		width: 14px;
		height: 14px;
		background: white;
		border-radius: 50%;
		transition: transform 120ms ease;
		box-shadow: 0 1px 2px rgba(0, 0, 0, 0.15);
	}

	.toggle input:checked + .toggle-track .toggle-thumb {
		transform: translateX(16px);
	}

	.toggle:hover .toggle-track {
		background: color-mix(in srgb, var(--stroke), var(--accent) 30%);
	}

	.toggle input:checked:hover + .toggle-track {
		background: color-mix(in srgb, var(--accent), transparent 15%);
	}
</style>
