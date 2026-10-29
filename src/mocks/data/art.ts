function hash(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function hsl(n: number, sat: number, light: number): string {
  return `hsl(${n % 360} ${sat}% ${light}%)`;
}

export function artSvg(seed: string, size = 600): string {
  const h = hash(seed);
  const hue = h % 360;
  const hue2 = (hue + 60 + (h % 120)) % 360;
  const angle = h % 360;
  const shapes: string[] = [];
  let r = h;
  for (let i = 0; i < 5; i++) {
    r = (Math.imul(r, 48271) + 1) >>> 0;
    const cx = (r % size);
    r = (Math.imul(r, 48271) + 1) >>> 0;
    const cy = (r % size);
    r = (Math.imul(r, 48271) + 1) >>> 0;
    const rad = 40 + (r % (size / 3));
    r = (Math.imul(r, 48271) + 1) >>> 0;
    const op = 0.08 + (r % 20) / 100;
    shapes.push(
      `<circle cx="${cx}" cy="${cy}" r="${rad}" fill="${hsl(hue2 + i * 20, 85, 60)}" opacity="${op.toFixed(2)}"/>`,
    );
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="g" gradientTransform="rotate(${angle})">
      <stop offset="0%" stop-color="${hsl(hue, 70, 22)}"/>
      <stop offset="100%" stop-color="${hsl(hue2, 65, 12)}"/>
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" fill="url(#g)"/>
  ${shapes.join('\n  ')}
</svg>`;
}

export function avatarSvg(seed: string, size = 128): string {
  const h = hash(seed);
  const hue = h % 360;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="${hsl(hue, 60, 25)}"/>
  <circle cx="${size / 2}" cy="${size * 0.4}" r="${size * 0.18}" fill="${hsl(hue + 40, 70, 60)}"/>
  <rect x="${size * 0.2}" y="${size * 0.62}" width="${size * 0.6}" height="${size * 0.4}" rx="${size * 0.25}" fill="${hsl(hue + 40, 70, 60)}"/>
</svg>`;
}
