export const CHARACTER_WIDTH = 24;
export const CHARACTER_HEIGHT = 32;
export const CHARACTER_ORIGIN = { x: .5, y: 28 / CHARACTER_HEIGHT };
export const OUTLINE_COLOR = 0x213029;

export function outlineSprite(c: CanvasRenderingContext2D) {
  const image = c.getImageData(0, 0, c.canvas.width, c.canvas.height);
  const { width, height, data } = image, source = new Uint8ClampedArray(data);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const at = (y * width + x) * 4;
    if (source[at + 3]) continue;
    let edge = false;
    for (let dy = -1; dy <= 1 && !edge; dy++) for (let dx = -1; dx <= 1; dx++) {
      const nx = x + dx, ny = y + dy;
      if (nx >= 0 && nx < width && ny >= 0 && ny < height && source[(ny * width + nx) * 4 + 3]) { edge = true; break; }
    }
    if (edge) { data[at] = 0x21; data[at + 1] = 0x30; data[at + 2] = 0x29; data[at + 3] = 255; }
  }
  c.putImageData(image, 0, 0);
}
