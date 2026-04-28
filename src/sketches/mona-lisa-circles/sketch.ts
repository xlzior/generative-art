import { attachResponsiveCanvas } from "../../utils/responsive-canvas.js";
import { defineSketch } from "../../utils/defineSketch.js";
import type { SketchContext } from "../../types/sketch.js";
import type p5 from "p5";

export default defineSketch({
  id: "mona-lisa-circles",
  title: "Mona Lisa Circles",
  description:
    "Random circles colored by the Mona Lisa painting at their coordinates.",
  parameters: [
    {
      key: "imageUrl",
      label: "Image URL",
      type: "string",
    },
    {
      key: "totalCircles",
      label: "Total Circles",
      type: "number",
      min: 100,
      max: 10000,
      step: 10,
    },
    {
      key: "radiusMin",
      label: "Min Radius",
      type: "number",
      min: 2,
      max: 50,
      step: 1,
    },
    {
      key: "radiusMax",
      label: "Max Radius",
      type: "number",
      min: 5,
      max: 200,
      step: 5,
    },
    {
      key: "opacity",
      label: "Opacity",
      type: "number",
      min: 0,
      max: 255,
      step: 5,
    },
  ],
  create({ p, theme = "light", params }: SketchContext) {
    const isDark = theme === "dark";
    const backgroundColor: [number, number, number] = isDark
      ? [11, 13, 14]
      : [248, 250, 252];

    let monaLisaImage: p5.Image | null = null;
    let isImageLoaded = false;
    let lastImageUrl = "";

    function loadImageFromUrl(url: string) {
      if (!url) {
        return;
      }

      if (url === lastImageUrl) {
        return;
      }

      lastImageUrl = url;
      isImageLoaded = false;

      p.loadImage(
        url,
        (img: p5.Image) => {
          monaLisaImage = img;
          isImageLoaded = true;
          drawCircles();
        },
        () => {
          console.error("Failed to load image:", url);
          isImageLoaded = false;
        },
      );
    }

    function drawCircles() {
      // Check if we need to load a new image
      const currentUrl = String(params.imageUrl);
      if (currentUrl && currentUrl !== lastImageUrl) {
        loadImageFromUrl(currentUrl);
        return;
      }

      if (!isImageLoaded || !monaLisaImage) {
        return;
      }

      const canvasWidth = p.width;
      const canvasHeight = p.height;

      p.background(...backgroundColor);

      // Load pixels once, outside the loop
      monaLisaImage.loadPixels();

      // Calculate aspect-ratio-preserving dimensions
      const imageAspectRatio = monaLisaImage.width / monaLisaImage.height;
      const canvasAspectRatio = canvasWidth / canvasHeight;

      let scaledWidth: number;
      let scaledHeight: number;
      let offsetX = 0;
      let offsetY = 0;

      if (imageAspectRatio > canvasAspectRatio) {
        // Image is wider - fit to width
        scaledWidth = canvasWidth;
        scaledHeight = canvasWidth / imageAspectRatio;
        offsetY = (canvasHeight - scaledHeight) / 2;
      } else {
        // Image is taller - fit to height
        scaledHeight = canvasHeight;
        scaledWidth = canvasHeight * imageAspectRatio;
        offsetX = (canvasWidth - scaledWidth) / 2;
      }

      for (let i = 0; i < params.totalCircles; i++) {
        // Pick random point on canvas
        const x = p.random(canvasWidth);
        const y = p.random(canvasHeight);

        // Map canvas coordinates to image coordinates while maintaining aspect ratio
        let imgX = Math.floor(
          ((x - offsetX) / scaledWidth) * monaLisaImage.width,
        );
        let imgY = Math.floor(
          ((y - offsetY) / scaledHeight) * monaLisaImage.height,
        );

        // Clamp to image bounds
        imgX = Math.max(0, Math.min(monaLisaImage.width - 1, imgX));
        imgY = Math.max(0, Math.min(monaLisaImage.height - 1, imgY));

        // Get color at that point in the image
        const pixelIndex = (imgY * monaLisaImage.width + imgX) * 4;
        const r = monaLisaImage.pixels[pixelIndex];
        const g = monaLisaImage.pixels[pixelIndex + 1];
        const b = monaLisaImage.pixels[pixelIndex + 2];

        // Random radius
        const radius = p.random(
          params.radiusMin as number,
          params.radiusMax as number,
        );

        // Draw circle with color from image
        p.fill(r, g, b, params.opacity as number);
        p.noStroke();
        p.circle(x, y, radius * 2);
      }
    }

    p.preload = function () {
      // Load the initial image from params
      const initialUrl = String(params.imageUrl);
      if (initialUrl) {
        loadImageFromUrl(initialUrl);
      }
    };

    attachResponsiveCanvas(p, {
      onSetup: () => {
        p.noLoop();
        drawCircles();
      },
      onResize: () => {
        drawCircles();
      },
    });

    p.draw = function () {
      // Static draw - controlled by setup/resize
    };
  },
});
