/** Native pixel artwork. PNG exports and the in-game obstacles share these exact coordinates. */
export const TINIK_SPRITE = { width: 160, height: 96, center: 80, ground: 88, scale: 2 };
const INK = '#293c32', SKIN = '#dda879', CREAM = '#eadbb5', CLAY = '#bc7c67', TEAL = '#48665b';
type Point = [number, number];
export function paintTinikSprite(canvas: HTMLCanvasElement, level: number, height: number) {
  const { width: w, height: h, center, ground } = TINIK_SPRITE;
  canvas.width = w; canvas.height = h;
  const c = canvas.getContext('2d')!; c.imageSmoothingEnabled = false;
  const paint = (pixels: Set<number>, color: string) => {
    c.fillStyle = INK;
    for (const at of pixels) for (let yy = -1; yy <= 1; yy++) for (let xx = -1; xx <= 1; xx++) c.fillRect(at % w + xx, Math.floor(at / w) + yy, 1, 1);
    c.fillStyle = color; for (const at of pixels) c.fillRect(at % w, Math.floor(at / w), 1, 1);
  };
  const polygon = (points: Point[], color: string) => {
    const pixels = new Set<number>();
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      let inside = false;
      for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
        const [ax, ay] = points[i], [bx, by] = points[j];
        if ((ay > y + .5) !== (by > y + .5) && x + .5 < (bx - ax) * (y + .5 - ay) / (by - ay) + ax) inside = !inside;
      }
      if (inside) pixels.add(y * w + x);
    }
    paint(pixels, color);
  };
  const rect = (x: number, y: number, width: number, height: number, color: string) => polygon([[x,y],[x+width,y],[x+width,y+height],[x,y+height]], color);
  const limb = (points: Point[], thickness = 4) => {
    const pixels = new Set<number>();
    for (let i = 1; i < points.length; i++) {
      const [ax, ay] = points[i - 1], [bx, by] = points[i], length = Math.max(Math.abs(bx - ax), Math.abs(by - ay), 1);
      for (let t = 0; t <= length; t++) for (let y = 0; y < thickness; y++) for (let x = 0; x < thickness; x++) {
        const xx = Math.round(ax + (bx - ax) * t / length) + x - Math.floor(thickness / 2), yy = Math.round(ay + (by - ay) * t / length) + y - Math.floor(thickness / 2);
        if (xx >= 0 && xx < w && yy >= 0 && yy < h) pixels.add(yy * w + xx);
      }
    }
    paint(pixels, SKIN);
  };
  const hands = Math.min(4, level), feet = Math.max(0, level - 4), footSize = 5;
  const rung = (height / 2 - feet * footSize) / hands;
  const handTop = (index: number) => Math.round(ground - feet * footSize - (index + 1) * rung);
  // One grounded leg per child; the other can form the raised-foot stage.
  for (const right of [false, true]) {
    const mirror = (points: Point[]) => points.map(([x,y]) => [right ? w - x - 18 : x + 18, y] as Point);
    const raised = right ? feet === 2 : feet >= 1;
    polygon(mirror([[27,80],[39,73],[46,74],[48,79],[43,81],[53,85],[61,85],[63,88],[52,88],[38,82],[32,86]]), SKIN);
    if (raised) limb([[right ? w - 47 : 47,83],[right ? w - 64 : 64,78],[right ? center + 6 : center - 6,ground - (right ? 7 : 2)]], 5);
    else polygon(mirror([[27,83],[39,77],[43,78],[43,82],[51,87],[58,87],[59,89],[49,89],[37,84],[31,87]]), SKIN);
    polygon(mirror([[19,78],[30,78],[36,82],[34,88],[18,88],[15,84]]), TEAL);
  }
  // The unused hand rests on a knee. Four total arms, each connected to a shoulder.
  for (let index = 0; index < 4; index++) {
    const right = index % 2 === 1, x = right ? 111 : 49;
    if (index < hands) {
      const endY = handTop(index) + Math.min(10, Math.round(rung)) - 3, endX = right ? center + 4 : center - 4;
      limb([[x,71 + (index >= 2 ? 4 : 0)],[right ? 93 : 67,Math.round((73 + endY) / 2) + 3],[endX,endY]], 4);
    } else limb([[x,75],[right ? 99 : 61,80],[right ? 95 : 65,77]], 4);
  }
  // Broad shirt and square hair silhouettes match the ordinary village sprites.
  for (const right of [false, true]) {
    const mirror = (points: Point[]) => points.map(([x,y]) => [right ? w - x - 18 : x + 18,y] as Point);
    polygon(mirror([[19,69],[29,69],[33,72],[33,76],[28,76],[28,83],[23,85],[16,84],[17,74]]), right ? CLAY : CREAM);
    polygon(mirror([[16,55],[20,52],[32,52],[32,56],[30,57],[30,68],[19,68],[15,64]]), INK);
    // A plain face block; no eyes, mouth, highlights, or texture.
    c.fillStyle = SKIN; c.fillRect(right ? w - 48 : 42, 59, 6, 8);
  }
  for (let foot = 0; foot < feet; foot++) {
    const y = ground - (foot + 1) * footSize;
    const points: Point[] = [[center-7,y+1],[center-3,y+1],[center-3,y+3],[center+5,y+3],[center+7,y+5],[center-7,y+5]];
    polygon(foot ? points.map(([x,yy]) => [w-x,yy] as Point) : points, SKIN);
  }
  for (let i = 0; i < hands; i++) {
    const y = handTop(i), bottom = y + Math.min(10, Math.max(6, Math.round(rung))) - 1;
    const points: Point[] = [[center-4,y+1],[center-2,y+1],[center-2,y],[center+2,y],[center+2,y+2],[center+4,y+2],[center+4,y+5],[center+6,y+5],[center+6,bottom],[center-4,bottom]];
    polygon(i % 2 ? points.map(([x,yy]) => [w-x,yy] as Point) : points, SKIN);
  }
}
