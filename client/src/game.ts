import Phaser from 'phaser';
import { createArt, HUB_OBSTACLES } from './art';
import { checkpoint, FIELD, move, newMatch, reward, segmentDistance, SPAWN, tag, tickMatch, type Match, type Point } from './rules';
import { type Profile } from './store';
import { addWorldProps } from './world-props';
import { CHARACTER_ORIGIN } from './sprite-outline';
import { HUB_SIZE, HUB_SITES, nearbySite } from './hub';
import type { GameId } from './games/types';
import { CHARACTERS } from './characters';

export interface GameUI {
  profile: Profile;
  blocked(): boolean;
  location(mode: 'hub' | 'match'): void;
  status(match: Match | null): void;
  hint(text: string): void;
  result(match: Match, coins: number): void;
  sound(kind: 'step' | 'tag' | 'turn' | 'win' | 'emote'): void;
  enterGame(game: GameId): void;
}
type Kid = { sprite: Phaser.GameObjects.Image; shadow: Phaser.GameObjects.Ellipse; name: Phaser.GameObjects.Text; facing: number; color: number; x: number; y: number };
type Guard = { kid: Kid; axis: 'x' | 'y'; position: number; offset: number };
const textStyle: Phaser.Types.GameObjects.Text.TextStyle = { fontFamily: 'monospace', fontSize: '15px', color: '#fcf0d1', backgroundColor: '#284b3be6', padding: { x: 8, y: 5 } };

export class BarangayScene extends Phaser.Scene {
  private ui: GameUI;
  private background!: Phaser.GameObjects.Image;
  private player!: Kid;
  private guards: Guard[] = [];
  private neighbors: Kid[] = [];
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private mode: 'hub' | 'match' = 'hub';
  private match: Match | null = null;
  private reported = false;
  private elapsed = 0;
  private sprint = 100;
  private lastHUD = 0;
  private bubble?: Phaser.GameObjects.Text;
  private bubbleTimer?: Phaser.Time.TimerEvent;
  private marker!: Phaser.GameObjects.Text;
  private target?: Point;
  private pausedByUser = false;
  private controls: Point = { x: 0, y: 0 };
  private touchSprint = false;
  private lastStep = 0;
  private interactRequested = false;
  private hubProps: Phaser.GameObjects.Image[] = [];
  private courtProps: Phaser.GameObjects.Image[] = [];
  private locationMarkers: Phaser.GameObjects.GameObject[] = [];
  private hubReturnPoint = { x: 514, y: 422 };

  constructor(ui: GameUI) { super('barangay'); this.ui = ui; }

  create() {
    createArt(this);
    this.background = this.add.image(0, 0, 'hub').setOrigin(0).setScale(2);
    this.hubProps = addWorldProps(this, 'hub');
    this.courtProps = addWorldProps(this, 'court').map(prop => prop.setVisible(false));
    this.hubProps.push(this.add.image(450, 720, 'world-dama-table').setScale(2).setOrigin(.5, 44 / 48).setDepth(720));
    for (const site of HUB_SITES.filter(site => site.game !== 'patintero')) {
      const ring = this.add.ellipse(site.at.x, site.at.y, 52, 23, 0xe6c078, .25).setDepth(.5);
      const label = this.add.text(site.at.x, site.at.y + 26, `${site.game === 'dama' ? 'DAMA TABLE' : site.game === 'tinik' ? 'LUKSONG-TINIK' : 'TAGU-TAGUAN'} · E`, { ...textStyle, fontSize: '16px' }).setOrigin(.5, 0).setDepth(950);
      this.locationMarkers.push(ring, label);
    }
    this.marker = this.add.text(755, 213, 'PATINTERO  ↗', { ...textStyle, fontSize: '16px', color: '#fff0b7' }).setOrigin(0.5);
    this.player = this.kid(514, 422, this.ui.profile.color, this.ui.profile.name);
    this.keys = this.input.keyboard!.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT,SHIFT,E,SPACE,ESC', false) as Record<string, Phaser.Input.Keyboard.Key>;
    this.input.keyboard!.addCapture(['UP', 'DOWN', 'LEFT', 'RIGHT', 'SPACE']);
    this.keys.SPACE.on('down', () => this.emote());
    this.keys.E.on('down', () => { if (!this.ui.blocked()) this.interactRequested = true; });
    this.keys.ESC.on('down', () => { if (!this.ui.blocked() && !this.pausedByUser) document.querySelector<HTMLButtonElement>('#pause-button')?.click(); });
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (!this.ui.blocked() && !this.pausedByUser) this.target = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
    });
    window.addEventListener('blur', this.blur);
    this.events.once('shutdown', () => window.removeEventListener('blur', this.blur));
    this.hub();
    document.querySelector('#game')?.setAttribute('data-ready', 'true');
  }

  private blur = () => { this.controls = { x: 0, y: 0 }; this.target = undefined; this.touchSprint = false; this.interactRequested = false; this.keys && Object.values(this.keys).forEach(key => key.reset()); };

  private kid(x: number, y: number, color: number, name: string): Kid {
    const shadow = this.add.ellipse(x, y + 2, 27, 10, 0x294e38, 0.22);
    const sprite = this.add.image(x, y, `kid-${color}-0-0`).setOrigin(CHARACTER_ORIGIN.x, CHARACTER_ORIGIN.y).setScale(2);
    const nameTag = this.add.text(x, y - 61, name, textStyle).setOrigin(0.5, 1);
    return { x, y, color, facing: 0, sprite, shadow, name: nameTag };
  }

  private drawKid(kid: Kid, time: number, moving = false, vector: Point = { x: 0, y: 0 }) {
    if (moving) kid.facing = Math.abs(vector.x) > Math.abs(vector.y) ? vector.x < 0 ? 1 : 2 : vector.y < 0 ? 3 : 0;
    const frame = moving ? Math.floor(time / 115) % 4 : 0;
    kid.sprite.setPosition(Math.round(kid.x), Math.round(kid.y)).setTexture(`kid-${kid.color}-${kid.facing}-${frame}`).setDepth(kid.y);
    kid.shadow.setPosition(kid.x, kid.y + 2).setDepth(kid.y - 1);
    kid.name.setPosition(kid.x, kid.y - 59).setDepth(1000);
  }

  private clearKids() {
    [...this.guards.map(guard => guard.kid), ...this.neighbors].forEach(kid => { kid.sprite.destroy(); kid.shadow.destroy(); kid.name.destroy(); });
    this.guards = []; this.neighbors = [];
    this.bubble?.destroy(); this.bubble = undefined; this.bubbleTimer?.remove();
  }

  hub() {
    if (!this.player) return;
    this.blur(); this.clearKids(); this.mode = 'hub'; this.match = null; this.pausedByUser = false;
    this.background.setTexture('hub'); this.marker.setVisible(true);
    this.hubProps.forEach(prop => prop.setVisible(true)); this.courtProps.forEach(prop => prop.setVisible(false));
    this.locationMarkers.forEach(marker => (marker as Phaser.GameObjects.Image).setVisible(true));
    this.cameras.main.setBounds(0, 0, HUB_SIZE.width, HUB_SIZE.height).setScroll(0, 0);
    this.player.x = this.hubReturnPoint.x; this.player.y = this.hubReturnPoint.y; this.player.sprite.setAlpha(1);
    this.cameras.main.setScroll(Phaser.Math.Clamp(this.player.x - 480, 0, HUB_SIZE.width - 960), Phaser.Math.Clamp(this.player.y - 300, 0, HUB_SIZE.height - 600));
    this.neighbors = [this.kid(227, 316, 3, CHARACTERS.mamaShoni), this.kid(675, 396, 1, CHARACTERS.mj), this.kid(792, 417, 4, CHARACTERS.audrey), this.kid(372, 750, 1, CHARACTERS.tatayEfren), this.kid(1250, 420, 2, CHARACTERS.maya), this.kid(1360, 420, 3, CHARACTERS.ferdie), this.kid(1400, 860, 4, CHARACTERS.sheena)];
    this.ui.location('hub'); this.ui.status(null);
    this.ui.hint('Explore the larger barangay. Walk to a game marker and press E, or use Games.');
  }

  startMatch() {
    if (!this.player) return;
    if (this.mode === 'hub') this.rememberHubPosition();
    this.blur(); this.clearKids(); this.mode = 'match'; this.pausedByUser = false;
    this.background.setTexture('court'); this.marker.setVisible(false);
    this.hubProps.forEach(prop => prop.setVisible(false)); this.courtProps.forEach(prop => prop.setVisible(true));
    this.locationMarkers.forEach(marker => (marker as Phaser.GameObjects.Image).setVisible(false));
    this.cameras.main.setBounds(0, 0, 960, 600).setScroll(0, 0);
    this.player.x = SPAWN.x; this.player.y = SPAWN.y; this.player.facing = 3; this.player.sprite.setAlpha(1);
    this.match = newMatch(); this.reported = false; this.sprint = 100;
    this.guards = [
      { kid: this.kid(300, 180, 4, CHARACTERS.audrey), axis: 'x', position: 180, offset: 0.4 },
      { kid: this.kid(650, 280, 1, CHARACTERS.mj), axis: 'x', position: 280, offset: 2.1 },
      { kid: this.kid(400, 380, 3, CHARACTERS.ferdie), axis: 'x', position: 380, offset: 4.3 },
      { kid: this.kid(480, 210, 2, CHARACTERS.sheena), axis: 'y', position: 480, offset: 1.3 },
    ];
    this.ui.location('match'); this.ui.status(this.match); this.ui.hint('Get ready! Cross to the far green strip, then return home.');
  }

  setTouch(x: number, y: number) { this.controls = { x, y }; this.target = undefined; }
  setSprint(held: boolean) { this.touchSprint = held; }
  setPaused(paused: boolean) { this.pausedByUser = paused; this.blur(); }
  resetInput() { this.blur(); }
  interact() { if (!this.ui.blocked()) this.interactRequested = true; }
  rememberHubPosition() { if (this.player && this.mode === 'hub') this.hubReturnPoint = { x: this.player.x, y: this.player.y }; }
  updateAvatar() { if (this.player) { this.player.color = this.ui.profile.color; this.player.name.setText(this.ui.profile.name); } }
  emote() { if (!this.ui.blocked()) { this.say('Tara, laro!'); this.ui.sound('emote'); } }

  private say(text: string) {
    this.bubble?.destroy(); this.bubbleTimer?.remove();
    this.bubble = this.add.text(this.player.x, this.player.y - 96, text, { ...textStyle, backgroundColor: '#fff0cf', color: '#35513f', fontSize: '17px', padding: { x: 10, y: 7 } }).setOrigin(0.5, 1).setDepth(1200);
    this.bubbleTimer = this.time.delayedCall(2300, () => { this.bubble?.destroy(); this.bubble = undefined; });
  }

  private finish() {
    if (!this.match || this.reported) return;
    this.reported = true; this.target = undefined;
    this.ui.status(this.match);
    const element = document.querySelector<HTMLElement>('#game');
    if (element) { element.dataset.phase = this.match.phase; element.dataset.x = this.player.x.toFixed(1); element.dataset.y = this.player.y.toFixed(1); }
    this.ui.sound(this.match.phase === 'won' ? 'win' : 'tag');
    this.ui.result({ ...this.match }, reward(this.match));
  }

  update(time: number, milliseconds: number) {
    if (!this.player) return;
    const dt = Math.min(milliseconds / 1000, 0.04);
    if (this.ui.blocked() || this.pausedByUser) { this.drawKid(this.player, time); return; }
    this.elapsed += dt;
    if (this.pausedByUser || this.ui.blocked()) return;
    let input = { x: Number(this.keys.D.isDown || this.keys.RIGHT.isDown) - Number(this.keys.A.isDown || this.keys.LEFT.isDown) + this.controls.x, y: Number(this.keys.S.isDown || this.keys.DOWN.isDown) - Number(this.keys.W.isDown || this.keys.UP.isDown) + this.controls.y };
    if (input.x || input.y) this.target = undefined;
    if (this.target && !input.x && !input.y) {
      const dx = this.target.x - this.player.x, dy = this.target.y - this.player.y;
      if (Math.hypot(dx, dy) < 5) this.target = undefined;
      else input = { x: dx, y: dy };
    }
    const canMove = this.mode === 'hub' || this.match?.phase === 'playing';
    const running = canMove && (input.x !== 0 || input.y !== 0);
    const fast = running && (this.keys.SHIFT.isDown || this.touchSprint) && this.sprint > 2;
    this.sprint = Phaser.Math.Clamp(this.sprint + (fast ? -32 : 20) * dt, 0, 100);
    const previous = { x: this.player.x, y: this.player.y };
    if (canMove) {
      const bounds = this.mode === 'hub' ? { x: 24, y: 45, width: HUB_SIZE.width - 50, height: HUB_SIZE.height - 70 } : { x: FIELD.left + 13, y: 86, width: FIELD.right - FIELD.left - 26, height: 462 };
      const next = move(this.player, input, fast ? 255 : 176, dt, this.mode === 'hub' ? HUB_OBSTACLES : [], bounds);
      this.player.x = next.x; this.player.y = next.y;
      if (this.target && Math.hypot(next.x - previous.x, next.y - previous.y) < 0.1) this.target = undefined;
    }
    this.drawKid(this.player, time, running, input);
    if (running && time - this.lastStep > (fast ? 230 : 360)) { this.ui.sound('step'); this.lastStep = time; }
    this.bubble?.setPosition(this.player.x, this.player.y - 96);
    if (this.mode === 'hub') {
      this.neighbors.forEach((kid, index) => {
        if (index > 0) { const dx = Math.cos(this.elapsed * 0.45 + index) * 9 * dt; kid.x += dx; this.drawKid(kid, time, Math.abs(dx) > 0.04, { x: dx, y: 0 }); }
        else this.drawKid(kid, time);
      });
      const site = nearbySite(this.player);
      const atStore = Math.hypot(this.player.x - 227, this.player.y - 316) < 75;
      if (time - this.lastHUD > 110) {
        this.ui.hint(site ? `Press E or tap Play to enter ${site.name}.` : atStore ? `Press E to say hello to ${CHARACTERS.mamaShoni}` : 'Dama is south of the plaza · schoolyard is east · Tagu-taguan is southeast');
        const button = document.querySelector<HTMLButtonElement>('#activity-action')!;
        button.hidden = !site; if (site) button.textContent = `Play ${site.game === 'dama' ? 'Dama' : site.game === 'tinik' ? 'Luksong-tinik' : site.game === 'taguan' ? 'Tagu-taguan' : 'Patintero'} · E`;
        document.querySelector<HTMLButtonElement>('#emote-button')!.hidden = Boolean(site);
      }
      if (this.interactRequested) {
        this.interactRequested = false;
        if (site) this.ui.enterGame(site.game);
        else if (atStore) this.say(`${CHARACTERS.mamaShoni}: Kaya mo ’yan!`);
        else this.emote();
      }
      const camera = this.cameras.main;
      camera.scrollX = Math.round(Phaser.Math.Linear(camera.scrollX, Phaser.Math.Clamp(this.player.x - 480, 0, HUB_SIZE.width - 960), .12));
      camera.scrollY = Math.round(Phaser.Math.Linear(camera.scrollY, Phaser.Math.Clamp(this.player.y - 300, 0, HUB_SIZE.height - 600), .12));
      const miniPlayer = document.querySelector('#hub-map-player'); miniPlayer?.setAttribute('cx', String(this.player.x / HUB_SIZE.width * 136)); miniPlayer?.setAttribute('cy', String(this.player.y / HUB_SIZE.height * 85));
      const miniView = document.querySelector('#hub-map-view'); miniView?.setAttribute('x', String(camera.scrollX / HUB_SIZE.width * 136)); miniView?.setAttribute('y', String(camera.scrollY / HUB_SIZE.height * 85));
      const gameElement = document.querySelector<HTMLElement>('#game')!;
      gameElement.dataset.cameraX = String(camera.scrollX); gameElement.dataset.cameraY = String(camera.scrollY); gameElement.dataset.nearby = site?.game ?? '';
      document.querySelector('#location-subtitle')!.textContent = site?.district ?? (this.player.x > 1000 ? 'EAST BARANGAY' : this.player.y > 600 ? 'TAMBAYAN' : 'THE PLAZA');
    } else if (this.match) {
      tickMatch(this.match, dt);
      if (this.match.phase === 'playing') {
        this.guards.forEach(guard => {
          const last = { x: guard.kid.x, y: guard.kid.y };
          const active = guard.axis === 'x' ? Math.abs(this.player.y - guard.position) < 95 : Math.abs(this.player.x - guard.position) < 90;
          const target = guard.axis === 'x' ? active ? this.player.x : 480 + Math.sin(this.elapsed * 0.8 + guard.offset) * 220 : active ? this.player.y : 300 + Math.sin(this.elapsed * 0.7 + guard.offset) * 140;
          const current = guard.axis === 'x' ? guard.kid.x : guard.kid.y;
          const speed = this.ui.profile.difficulty === 'easy' ? guard.axis === 'x' ? 90 : 66 : this.ui.profile.difficulty === 'hard' ? guard.axis === 'x' ? 150 : 110 : guard.axis === 'x' ? 128 : 92;
          const next = current + Phaser.Math.Clamp(target - current, -speed * dt, speed * dt);
          if (guard.axis === 'x') guard.kid.x = Phaser.Math.Clamp(next, FIELD.left + 15, FIELD.right - 15);
          else guard.kid.y = Phaser.Math.Clamp(next, FIELD.top + 10, FIELD.bottom - 10);
          this.drawKid(guard.kid, time, true, { x: guard.kid.x - last.x, y: guard.kid.y - last.y });
          // Relative swept collision accounts for both players moving within a frame.
          const distance = segmentDistance({ x: 0, y: 0 }, { x: previous.x - last.x, y: previous.y - last.y }, { x: this.player.x - guard.kid.x, y: this.player.y - guard.kid.y });
          if (distance < 22 && tag(this.match!)) {
            this.player.x = SPAWN.x; this.player.y = SPAWN.y; this.target = undefined;
            this.ui.sound('tag'); this.cameras.main.shake(120, 0.003); this.say('Tagged! Try another way.');
          }
        });
        const result = checkpoint(this.match, this.player);
        if (result === 'turn') { this.say('Balik! Now get home.'); this.ui.sound('turn'); }
        this.player.sprite.setAlpha(this.match.grace > 0 ? (Math.floor(time / 110) % 2 ? 0.4 : 1) : 1);
        this.ui.hint(this.match.returning ? 'You made it across! Return to the HOME strip.' : 'Reach the far green strip. Stay inside the sidelines.');
      }
      if (this.match.phase === 'won' || this.match.phase === 'lost') this.finish();
    }
    if (time - this.lastHUD > 120) {
      this.lastHUD = time;
      this.ui.status(this.match);
      document.querySelector('#stamina-fill')?.setAttribute('style', `width:${this.sprint}%`);
      const element = document.querySelector<HTMLElement>('#game');
      if (element) { element.dataset.x = this.player.x.toFixed(1); element.dataset.y = this.player.y.toFixed(1); element.dataset.mode = this.mode; element.dataset.phase = this.match?.phase ?? 'exploring'; }
    }
  }
}

export function createGame(ui: GameUI): { game: Phaser.Game; scene: BarangayScene } {
  const scene = new BarangayScene(ui);
  const game = new Phaser.Game({
    type: Phaser.WEBGL, parent: 'game', width: 960, height: 600,
    backgroundColor: '#86a278', pixelArt: true, roundPixels: true,
    antialias: false, scene: [scene], audio: { noAudio: true },
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    render: { preserveDrawingBuffer: true },
  });
  return { game, scene };
}
