import type Phaser from 'phaser';
import type { BarangayScene } from '../game';
import { DamaGame } from './dama';
import { ChessGame } from './chess';
import { PikoGame } from './piko';
import { TumbangGame } from './tumbang';
import { TaguanScene } from './taguan';
import { TinikScene } from './tinik';
import { JolenGame } from './jolen';
import { LubidScene } from './lubid';
import { RetroGame } from './retro';
import type { ActivityControls, ActivityUI, GameId } from './types';

export class GameDirector {
  active: GameId | 'hub' = 'hub';
  private activity?: ActivityControls;
  private dama?: DamaGame;
  private chess?: ChessGame;
  private street?: PikoGame | TumbangGame;
  private jolen?: JolenGame;
  private retro?: RetroGame;
  private phoneSession = false;
  private returnPhone() { if (!this.phoneSession) return; this.phoneSession = false; this.barangay.respawnPhone(); this.ui.phoneReturned?.(); }
  constructor(private game: Phaser.Game, private barangay: BarangayScene, private ui: ActivityUI) {}

  private stop() {
    this.street?.dispose(); this.street = undefined;
    this.chess?.dispose(); this.chess = undefined;
    this.activity?.resetInput(); this.activity = undefined; this.dama?.dispose(); this.dama = undefined; this.jolen?.dispose(); this.jolen = undefined;
    this.returnPhone(); this.retro?.dispose(); this.retro = undefined;
    for (const key of ['taguan', 'tinik', 'lubid']) if (this.game.scene.getScene(key)) this.game.scene.remove(key);
    this.barangay.resetInput();
    document.querySelector<HTMLElement>('#game')!.style.visibility = '';
  }
  hub() { this.stop(); this.active = 'hub'; this.game.scene.wake('barangay'); this.barangay.hub(); }
  startMatch() { this.stop(); this.active = 'patintero'; this.game.scene.wake('barangay'); this.barangay.startMatch(); }
  start(id: GameId, options: { mode?: 'bot' | 'local'; resume?: boolean; practice?: boolean } = {}) {
    if (id === 'patintero') { this.startMatch(); return; }
    if (this.active === 'hub') this.barangay.rememberHubPosition();
    this.stop(); this.active = id; this.game.scene.sleep('barangay');
    if (id === 'snake' || id === 'impact') {
      document.querySelector<HTMLElement>('#game')!.style.visibility = 'hidden';
      this.phoneSession = true;
      this.retro = new RetroGame({ ...this.ui, result: result => { this.returnPhone(); this.ui.result(result); } }, id); this.activity = this.retro;
    } else if (id === 'jolen') {
      document.querySelector<HTMLElement>('#game')!.style.visibility = 'hidden';
      this.jolen = new JolenGame(this.ui); this.activity = this.jolen;
    } else if (id === 'piko' || id === 'tumbang') {
      document.querySelector<HTMLElement>('#game')!.style.visibility = 'hidden';
      this.street = id === 'piko' ? new PikoGame(this.ui) : new TumbangGame(this.ui); this.activity = this.street;
    } else if (id === 'chess') {
      document.querySelector<HTMLElement>('#game')!.style.visibility = 'hidden';
      this.chess = new ChessGame(this.ui, options.mode ?? 'bot'); this.activity = this.chess;
    } else if (id === 'dama') {
      document.querySelector<HTMLElement>('#game')!.style.visibility = 'hidden';
      this.dama = new DamaGame(this.ui, options.mode ?? 'bot', options.resume); this.activity = this.dama;
    } else {
      const scene = id === 'lubid' ? new LubidScene(this.ui) : id === 'taguan' ? new TaguanScene(this.ui) : new TinikScene(this.ui, options.practice);
      this.activity = scene; this.game.scene.add(id, scene, true);
    }
  }
  setTouch(x: number, y: number) { if (this.activity) this.activity.setTouch(x, y); else this.barangay.setTouch(x, y); }
  setSprint(value: boolean) { if (this.activity) this.activity.setSprint(value); else this.barangay.setSprint(value); }
  setPaused(value: boolean) { if (this.activity) this.activity.setPaused(value); else this.barangay.setPaused(value); }
  resetInput() { this.activity?.resetInput(); this.barangay.resetInput(); }
  updateAvatar() { this.barangay.updateAvatar(); this.activity?.updateAvatar(); }
  action() { if (this.activity) this.activity.action(); else if (this.active === 'hub') this.barangay.interact(); }
  finishRun() { this.activity?.finishRun?.(); }
  emote() { if (this.active === 'hub' || this.active === 'patintero') this.barangay.emote(); }
}
