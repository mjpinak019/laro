type FullscreenDocument = Document & { webkitFullscreenElement?: Element; webkitExitFullscreen?: () => void | Promise<void> };
type FullscreenPanel = HTMLElement & { webkitRequestFullscreen?: () => void | Promise<void> };
type LockableOrientation = ScreenOrientation & { lock?: (orientation: 'landscape') => Promise<void> };

/** Native fullscreen where available; a complete viewport-sized play panel otherwise. */
export class PlayScreen {
  private nativeEntered = false;
  private lockedOrientation = false;
  private busy = false;
  private scrollY = 0;
  private readonly doc = document as FullscreenDocument;

  constructor(private panel: HTMLElement, private button: HTMLElement, private refresh: () => void) {
    document.addEventListener('fullscreenchange', this.nativeChanged);
    document.addEventListener('webkitfullscreenchange', this.nativeChanged);
    window.addEventListener('resize', this.resize);
    window.visualViewport?.addEventListener('resize', this.resize);
    window.visualViewport?.addEventListener('scroll', this.resize);
    new ResizeObserver(() => {
      if (this.active) this.panel.style.setProperty('--play-stage-height', `${this.panel.querySelector<HTMLElement>('.game-shell')!.clientHeight}px`);
    }).observe(this.panel.querySelector('.game-shell')!);
  }

  get active() { return this.panel.classList.contains('play-fullscreen'); }
  private get nativeElement() { return this.doc.fullscreenElement ?? this.doc.webkitFullscreenElement; }
  private get touch() { return navigator.maxTouchPoints > 0 || matchMedia('(pointer: coarse)').matches || window.innerWidth <= 720; }
  private nativeChanged = () => {
    if (this.nativeElement === this.panel) {
      this.nativeEntered = true;
      this.panel.dataset.displayMode = 'native';
      this.resize();
    } else if (this.nativeEntered) this.cleanup();
  };
  private resize = () => {
    if (!this.active) return;
    const viewport = window.visualViewport;
    const width = viewport?.width ?? window.innerWidth, height = viewport?.height ?? window.innerHeight;
    this.panel.style.setProperty('--play-width', `${width}px`); this.panel.style.setProperty('--play-height', `${height}px`);
    this.panel.style.setProperty('--play-top', `${viewport?.offsetTop ?? 0}px`); this.panel.style.setProperty('--play-left', `${viewport?.offsetLeft ?? 0}px`);
    const portrait = height > width;
    this.panel.classList.toggle('portrait-screen', portrait);
    this.panel.classList.toggle('touch-screen', this.touch);
    this.panel.querySelector<HTMLElement>('#rotate-hint')!.hidden = !this.touch || !portrait;
    this.panel.style.setProperty('--play-stage-height', `${this.panel.querySelector<HTMLElement>('.game-shell')!.clientHeight}px`);
    requestAnimationFrame(this.refresh);
  };

  async toggle() {
    if (this.busy) return;
    if (this.active) { await this.exit(); return; }
    this.busy = true; this.scrollY = window.scrollY;
    this.panel.classList.add('play-fullscreen'); document.body.classList.add('expanded-game');
    this.panel.dataset.displayMode = 'immersive';
    this.button.setAttribute('aria-label', 'Exit fullscreen'); this.button.setAttribute('title', 'Exit fullscreen');
    this.resize();
    try {
      const panel = this.panel as FullscreenPanel;
      if (panel.requestFullscreen && document.fullscreenEnabled !== false) await panel.requestFullscreen({ navigationUI: 'hide' });
      else if (panel.webkitRequestFullscreen) await panel.webkitRequestFullscreen();
      if (this.nativeElement === this.panel) { this.nativeEntered = true; this.panel.dataset.displayMode = 'native'; }
    } catch { /* Keep the usable immersive panel when the browser denies native fullscreen. */ }
    if (this.touch) {
      try {
        const orientation = screen.orientation as LockableOrientation | undefined;
        if (orientation?.lock) {
          await orientation.lock('landscape');
          if (this.active) this.lockedOrientation = true;
          else orientation.unlock?.();
        }
      } catch { /* Some mobile browsers require a physical rotation; keep navigation and controls available. */ }
    }
    this.busy = false; this.resize();
  }

  async exit() {
    if (this.busy || !this.active) return;
    this.busy = true;
    try {
      if (this.nativeElement === this.panel) {
        if (this.doc.exitFullscreen) await this.doc.exitFullscreen();
        else await this.doc.webkitExitFullscreen?.();
      }
    } catch { /* The browser may already have left fullscreen through its own controls. */ }
    finally { this.cleanup(); this.busy = false; }
  }

  private cleanup() {
    if (this.lockedOrientation) { screen.orientation?.unlock?.(); this.lockedOrientation = false; }
    this.nativeEntered = false;
    this.panel.classList.remove('play-fullscreen', 'portrait-screen', 'touch-screen');
    document.body.classList.remove('expanded-game');
    delete this.panel.dataset.displayMode;
    this.panel.querySelector<HTMLElement>('#rotate-hint')!.hidden = true;
    this.button.setAttribute('aria-label', 'Fullscreen game'); this.button.setAttribute('title', 'Fullscreen game');
    window.scrollTo(0, this.scrollY); requestAnimationFrame(this.refresh);
  }
}
