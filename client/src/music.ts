/** Original, sparse chiptune phrases. Eighth-note rests leave room for game cues. */
export const MUSIC_THEMES = {
  barangay: { bpm: 88, gain: .28, melody: [64,null,67,69,67,null,64,null,62,null,65,67,64,null,null,null,60,null,64,67,69,null,67,null,65,null,64,62,60,null,null,null], bass: [48,45,41,43] },
  focus: { bpm: 72, gain: .20, melody: [64,null,null,67,null,null,69,null,67,null,null,64,null,null,null,null,62,null,null,65,null,null,67,null,64,null,null,62,60,null,null,null], bass: [48,45,41,43] },
} as const;
export type MusicTheme = keyof typeof MUSIC_THEMES;
export const musicStepSeconds = (theme: MusicTheme) => 60 / MUSIC_THEMES[theme].bpm / 2;
export function musicNotes(theme: MusicTheme, step: number) {
  const tune = MUSIC_THEMES[theme], note = tune.melody[step % tune.melody.length];
  const notes: { midi: number; duration: number; amplitude: number; wave: 'square' | 'triangle' | 'sine' }[] = [];
  if (note !== null) notes.push({ midi: note, duration: theme === 'focus' ? .28 : .21, amplitude: .22, wave: 'square' });
  if (step % 8 === 0) {
    const bass = tune.bass[Math.floor(step / 8) % tune.bass.length];
    notes.push({ midi: bass, duration: 1.15, amplitude: .24, wave: 'triangle' });
    notes.push({ midi: bass + 19, duration: 1.2, amplitude: .045, wave: 'sine' });
  }
  return notes;
}
