export function getCanvasSize(containerId = "canvas-container", minSize = 320) {
  const container = document.getElementById(containerId);
  return {
    width: Math.max(
      minSize,
      Math.floor(container?.clientWidth ?? window.innerWidth),
    ),
    height: Math.max(
      minSize,
      Math.floor(container?.clientHeight ?? window.innerHeight),
    ),
  };
}
