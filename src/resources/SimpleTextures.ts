export function createGridTexture(spacing, color) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;

  const ctx = canvas.getContext('2d');
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, 256, 256);

  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  for (let i = 0; i < 256; i += spacing) {
      ctx.fillRect(i, 0, 1, 256);
  }
  for (let j = 0; j < 256; j += spacing) {
      ctx.fillRect(0, j, 256, 1);
  }
  ctx.fillStyle = 'rgba(0,0,0,0.7)';
  ctx.font = `10px monospace`;
  for (let i = 0; i < 256; i += spacing) {
    for (let j = 0; j < 256; j += spacing) {
      ctx.fillText(`${spacing}px`, i + Math.min(7, spacing), j + Math.min(16, spacing));
    }
  }

  return canvas;
}
