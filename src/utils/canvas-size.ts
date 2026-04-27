export function getCanvasSize(
  containerId: string = "canvas-container",
  minSize: number = 320,
): { width: number; height: number } {
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
