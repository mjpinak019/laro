import type { Profile } from './store';
import type { Sound } from './games/types';

// Original chiptune phrase, generated locally. No streaming or music assets.
const MELODY = [72, 76, 79, 76, 74, 77, 81, 77, 76, 79, 84, 79, 74, 77, 79, 71,
  72, 76, 79, 84, 81, 79, 77, 74, 76, 79, 77, 74, 72, 67, 71, 72];
export class GameAudio {
  private context?: AudioContext;
  private master?: GainNode;
  private music?: GainNode;
  private next = 0;
  private step = 0;
  private timer: number;
  constructor(private profile: Profile, private inBarangay: () => boolean, private blocked: () => boolean) {
    document.addEventListener('pointerdown', this.unlock, { passive: true });
    document.addEventListener('keydown', this.unlock);
    this.timer = window.setInterval(() => this.tick(), 100);
  }
  private unlock = () => {
    try {
      if (!this.context) {
        this.context = new AudioContext(); this.master = this.context.createGain(); this.music = this.context.createGain();
        this.music.connect(this.master); this.master.connect(this.context.destination);
      }
      if (this.context.state === 'suspended') void this.context.resume().catch(() => {});
      this.refresh();
    } catch { /* Audio remains optional on browsers without Web Audio. */ }
  };
  refresh() {
    const context = this.context;
    if (!context || !this.master || !this.music) return;
    this.master.gain.setTargetAtTime(this.profile.muted ? 0 : this.profile.volume, context.currentTime, .025);
    const playing = this.inBarangay() && !this.blocked() && !document.hidden && this.profile.musicEnabled;
    this.music.gain.setTargetAtTime(playing ? this.profile.musicVolume * .22 : 0, context.currentTime, .035);
    document.querySelector('#game-display')?.setAttribute('data-music', playing && !this.profile.muted && this.profile.volume > 0 && this.profile.musicVolume > 0 ? 'playing' : 'silent');
  }
  private tone(frequency: number, when: number, duration: number, amplitude: number, type: OscillatorType, destination: AudioNode) {
    const context = this.context!, oscillator = context.createOscillator(), gain = context.createGain();
    oscillator.type = type; oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0, when); gain.gain.linearRampToValueAtTime(amplitude, when + .008); gain.gain.exponentialRampToValueAtTime(.0001, when + duration);
    oscillator.connect(gain); gain.connect(destination); oscillator.start(when); oscillator.stop(when + duration + .02);
    oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
  }
  effect(kind: Sound) {
    if (this.profile.muted || this.profile.volume === 0) return;
    this.unlock(); if (!this.context || !this.master || this.context.state !== 'running') return;
    const sequence = kind === 'win' ? [523, 659, 784, 1046] : kind === 'turn' ? [659, 880] : kind === 'tag' ? [180, 120] : kind === 'emote' ? [440, 554, 659] : [100];
    sequence.forEach((frequency, i) => this.tone(frequency, this.context!.currentTime + .01 + i * .095, .11, kind === 'step' ? .012 : .045, kind === 'step' ? 'sine' : 'triangle', this.master!));
  }
  private tick() {
    this.refresh(); const context = this.context;
    if (!context || context.state !== 'running' || this.profile.muted || !this.profile.musicEnabled || !this.inBarangay() || this.blocked() || document.hidden) { this.next = 0; return; }
    if (this.next < context.currentTime) this.next = context.currentTime + .035;
    while (this.next < context.currentTime + .2) {
      const note = MELODY[this.step % MELODY.length], frequency = 440 * 2 ** ((note - 69) / 12);
      this.tone(frequency, this.next, .12, .25, 'square', this.music!);
      if (this.step % 2 === 0) this.tone(frequency / 4, this.next, .23, .4, 'triangle', this.music!);
      this.step++; this.next += .19;
    }
  }
  dispose() { clearInterval(this.timer); document.removeEventListener('pointerdown', this.unlock); document.removeEventListener('keydown', this.unlock); void this.context?.close(); }
}
