<script>
let { currentTheme, ontoggle } = $props();

function handleClick() {
	ontoggle();
}
</script>

<button id="theme-toggle" type="button" aria-pressed={currentTheme === 'dark'} onclick={handleClick}>
  <span class="button-content">
    <i class="button-icon" data-lucide="moon" aria-hidden="true"></i>
    <span id="theme-toggle-label">
      {currentTheme === 'dark' ? 'Light Mode' : 'Dark Mode'}
    </span>
  </span>
</button>

<style>
  button {
    margin-top: 0.3rem;
    border-color: color-mix(in srgb, var(--accent), var(--stroke) 70%);
    cursor: pointer;
    font: inherit;
    border-radius: 10px;
    border: 1px solid var(--stroke);
    padding: 0.6rem 0.8rem;
    color: var(--ink);
    background: var(--ui-surface);
    width: 100%;
    transition: transform 120ms ease, border-color 120ms ease;
  }

  button[aria-pressed='true'] {
    background: color-mix(in srgb, var(--accent), transparent 82%);
    border-color: var(--accent);
  }

  button:hover {
    transform: translateY(-1px);
    border-color: var(--accent);
    background: var(--ui-surface-hover);
  }

  .button-content {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.45rem;
  }

  .button-icon {
    width: 0.95rem;
    height: 0.95rem;
    flex-shrink: 0;
  }
</style>
