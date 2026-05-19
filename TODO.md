# TODO

## Architecture & Structure

- [ ] **Add error boundaries around sketches** — If a sketch throws during `create()` or `draw()`, it breaks the entire app. Wrap each sketch in try-catch with graceful fallback (e.g., show error state in canvas container).


## Developer Experience

- [ ] **Add UI feedback for save defaults** — `App.svelte` has a `#save-status` element but never updates it. Show success/error message to user when saving defaults succeeds or fails.

## Bug fixes

## Features

- [ ] take in an image as the depth map
- [ ] patterned stereogram instead of random dot stereogram
- [ ] flow field particles doesnt fade correctly
