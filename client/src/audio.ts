import type { Profile } from './store';
import type { Sound } from './games/types';
import { MUSIC_THEMES, musicNotes, musicStepSeconds, type MusicTheme } from './music';

export class GameAudio {
  private context?: AudioContext;
  private master?: GainNode;
  private music?: GainNode;
  private next = 0;
  private step = 0;
  private theme?: MusicTheme;
  private voices = new Set<OscillatorNode>();
  private playing = false;
  private timer: number;
  constructor(private profile: Profile, private mode: () => string | undefined, private blocked: () => boolean) {
    document.addEventListener('pointerdown', this.unlock, { passive: true });
    document.addEventListener('keydown', this.unlock);
    document.addEventListener('visibilitychange', this.visibility);
    this.timer = window.setInterval(() => this.tick(), 100);
  }
  private unlock = () => {
    try {
      if (!this.context) {
        this.context = new AudioContext(); this.master = this.context.createGain(); this.music = this.context.createGain();
        const mellow = this.context.createBiquadFilter(); mellow.type = 'lowpass'; mellow.frequency.value = 1050; mellow.Q.value = .4;
        this.music.connect(mellow); mellow.connect(this.master); this.master.connect(this.context.destination);
      }
      if (this.context.state === 'suspended') void this.context.resume().catch(() => {});
      this.refresh();
    } catch { /* Audio remains optional on browsers without Web Audio. */ }
  };
  refresh() {
    const context = this.context;
    if (!context || !this.master || !this.music) return;
    this.master.gain.setTargetAtTime(this.profile.muted ? 0 : this.profile.volume, context.currentTime, .025);
    const mode = this.mode(), theme = mode === 'hub' ? 'barangay' : 'focus';
    if (this.theme !== theme) { this.stopMusic(); this.step = 0; this.theme = theme; }
    const playing = !!mode && !this.blocked() && !document.hidden && this.profile.musicEnabled && !this.profile.muted && this.profile.volume > 0 && this.profile.musicVolume > 0;
    if (!playing && this.playing) this.stopMusic(); this.playing = playing;
    this.music.gain.setTargetAtTime(playing ? this.profile.musicVolume * MUSIC_THEMES[theme].gain : 0, context.currentTime, .035);
    document.querySelector('#game-display')?.setAttribute('data-music', playing && !this.profile.muted && this.profile.volume > 0 && this.profile.musicVolume > 0 ? 'playing' : 'silent');
    document.querySelector('#game-display')?.setAttribute('data-music-theme', theme);
    document.querySelector('#game-display')?.setAttribute('data-music-bpm', String(MUSIC_THEMES[theme].bpm));
  }
  private tone(frequency: number, when: number, duration: number, amplitude: number, type: OscillatorType, destination: AudioNode) {
    const context = this.context!, oscillator = context.createOscillator(), gain = context.createGain();
    oscillator.type = type; oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0, when); gain.gain.linearRampToValueAtTime(amplitude, when + .008); gain.gain.exponentialRampToValueAtTime(.0001, when + duration);
    oscillator.connect(gain); gain.connect(destination); oscillator.start(when); oscillator.stop(when + duration + .02);
    if (destination === this.music) this.voices.add(oscillator);
    oscillator.onended = () => { this.voices.delete(oscillator); oscillator.disconnect(); gain.disconnect(); };
  }
  effect(kind: Sound) {
    if (this.profile.muted || this.profile.volume === 0) return;
    this.unlock(); if (!this.context || !this.master || this.context.state !== 'running') return;
    const sequence = kind === 'win' ? [523, 659, 784, 1046] : kind === 'turn' ? [659, 880] : kind === 'tag' ? [180, 120] : kind === 'emote' ? [440, 554, 659] : [100];
    sequence.forEach((frequency, i) => this.tone(frequency, this.context!.currentTime + .01 + i * .095, .11, kind === 'step' ? .012 : .045, kind === 'step' ? 'sine' : 'triangle', this.master!));
  }
  private tick() {
    this.refresh(); const context = this.context;
    if (!context || context.state !== 'running' || !this.playing || !this.theme) { this.next = 0; return; }
    if (this.next < context.currentTime) this.next = context.currentTime + .035;
    while (this.next < context.currentTime + .2) {
      for (const note of musicNotes(this.theme, this.step)) this.tone(440 * 2 ** ((note.midi - 69) / 12), this.next, note.duration, note.amplitude, note.wave, this.music!);
      this.step++; this.next += musicStepSeconds(this.theme);
    }
  }
  private visibility = () => this.refresh();
  private stopMusic() { for (const voice of this.voices) try { voice.stop(this.context!.currentTime + .03); } catch { /* Already ended. */ } this.voices.clear(); this.next = 0; }
  dispose() { clearInterval(this.timer); this.stopMusic(); document.removeEventListener('pointerdown', this.unlock); document.removeEventListener('keydown', this.unlock); document.removeEventListener('visibilitychange', this.visibility); void this.context?.close(); }
}
