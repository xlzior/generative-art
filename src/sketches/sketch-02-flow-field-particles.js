import { attachResponsiveCanvas } from "./responsive-canvas.js";

export default function flowFieldParticles(p, theme = "light") {
  const particleCount = 1200;
  const stepSize = 1.2;
  const noiseScale = 0.0025;
  const angleScale = p.TWO_PI * 1.8;
  const isDark = theme === "dark";
  const backgroundColor = isDark ? [11, 13, 14] : [248, 250, 252];
  const trailFade = isDark ? [11, 13, 14, 12] : [248, 250, 252, 10];
  const strokeColor = isDark ? [220, 227, 231, 90] : [15, 23, 42, 62];
  let particles = [];

  function spawnParticle() {
    return {
      x: p.random(p.width),
      y: p.random(p.height),
      age: 0,
      ttl: p.random(100, 280),
    };
  }

  attachResponsiveCanvas(p, {
    onSetup: () => {
      p.background(...backgroundColor);
      p.strokeWeight(0.65);
      particles = Array.from({ length: particleCount }, spawnParticle);
    },
    onResize: () => {
      p.background(...backgroundColor);
      particles = Array.from({ length: particleCount }, spawnParticle);
    },
  });

  p.draw = () => {
    p.fill(...trailFade);
    p.noStroke();
    p.rect(0, 0, p.width, p.height);

    for (const part of particles) {
      const angle =
        p.noise(
          part.x * noiseScale,
          part.y * noiseScale,
          p.frameCount * 0.002,
        ) * angleScale;
      const vx = Math.cos(angle) * stepSize;
      const vy = Math.sin(angle) * stepSize;

      p.stroke(...strokeColor);
      p.line(part.x, part.y, part.x + vx, part.y + vy);

      part.x += vx;
      part.y += vy;
      part.age += 1;

      const out =
        part.x < 0 || part.x > p.width || part.y < 0 || part.y > p.height;
      if (out || part.age > part.ttl) {
        Object.assign(part, spawnParticle());
      }
    }
  };
}
