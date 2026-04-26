export default function flowFieldParticles(p) {
  const particleCount = 1200;
  const stepSize = 1.2;
  const noiseScale = 0.0025;
  const angleScale = p.TWO_PI * 1.8;
  let particles = [];

  function spawnParticle() {
    return {
      x: p.random(p.width),
      y: p.random(p.height),
      age: 0,
      ttl: p.random(100, 280),
    };
  }

  p.setup = () => {
    const size = Math.min(window.innerWidth - 32, 1100);
    p.createCanvas(size, size * 0.68);
    p.background("#0B0D0E");
    p.strokeWeight(0.65);
    particles = Array.from({ length: particleCount }, spawnParticle);
  };

  p.draw = () => {
    p.fill(11, 13, 14, 12);
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

      p.stroke(220, 227, 231, 90);
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
