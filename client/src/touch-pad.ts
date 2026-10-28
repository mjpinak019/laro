export function padDirection(dx: number, dy: number, radius: number) {
  const distance = Math.hypot(dx, dy);
  if (radius <= 0 || distance <= radius * .18) return { x: 0, y: 0 };
  return { x: dx / distance, y: dy / distance };
}

export class TouchPad {
  private pointer: number | null = null;
  private element: HTMLElement;
  private move: (x: number, y: number) => void;
  constructor(element: HTMLElement, move: (x: number, y: number) => void) {
    this.element = element; this.move = move;
    element.onpointerdown = event => {
      if (this.pointer !== null || event.button !== 0) return;
      event.preventDefault(); this.pointer = event.pointerId; element.setPointerCapture(event.pointerId); element.classList.add('held'); this.update(event);
    };
    element.onpointermove = event => { if (this.pointer === event.pointerId) { event.preventDefault(); this.update(event); } };
    const release = (event: PointerEvent) => { if (this.pointer === event.pointerId) this.reset(); };
    element.onpointerup = release; element.onpointercancel = release; element.onlostpointercapture = release;
  }
  private update(event: PointerEvent) {
    const box = this.element.getBoundingClientRect(), radius = box.width * .27;
    const dx = event.clientX - box.x - box.width / 2, dy = event.clientY - box.y - box.height / 2;
    const direction = padDirection(dx, dy, radius), distance = Math.hypot(dx, dy), scale = distance > radius ? radius / distance : 1;
    this.element.style.setProperty('--stick-x', `${dx * scale}px`); this.element.style.setProperty('--stick-y', `${dy * scale}px`);
    this.element.dataset.moving = String(direction.x !== 0 || direction.y !== 0); this.move(direction.x, direction.y);
  }
  reset() {
    const pointer = this.pointer; this.pointer = null;
    if (pointer !== null && this.element.hasPointerCapture(pointer)) this.element.releasePointerCapture(pointer);
    this.element.classList.remove('held'); this.element.style.setProperty('--stick-x', '0px'); this.element.style.setProperty('--stick-y', '0px'); this.element.dataset.moving = 'false'; this.move(0, 0);
  }
}
