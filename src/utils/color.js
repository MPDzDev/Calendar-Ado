export function lightenColor(color, percent = 50) {
  if (!color) return color;
  let c = color.replace('#', '');
  if (c.length === 3) {
    c = c.split('').map((ch) => ch + ch).join('');
  }
  const num = parseInt(c, 16);
  const r = (num >> 16) & 0xff;
  const g = (num >> 8) & 0xff;
  const b = num & 0xff;
  const p = percent / 100;
  const nr = Math.min(255, Math.round(r + (255 - r) * p));
  const ng = Math.min(255, Math.round(g + (255 - g) * p));
  const nb = Math.min(255, Math.round(b + (255 - b) * p));
  return (
    '#' + ((1 << 24) + (nr << 16) + (ng << 8) + nb).toString(16).slice(1)
  );
}
