<script>
  let { sketches, currentSketch, onchange } = $props();

  function handleChange(event) {
    onchange(event.target.value);
  }
</script>

<select id="sketch-select" value={currentSketch} onchange={handleChange}>
  {#each sketches as sketch}
    <option value={sketch.id}>
      {sketch.date} - {sketch.title}
    </option>
  {/each}
</select>

<style>
  select {
    font: inherit;
    border-radius: 10px;
    border: 1px solid var(--stroke);
    padding: 0.6rem 0.8rem;
    color: var(--ink);
    background: var(--ui-surface);
    width: 100%;
  }
</style>
