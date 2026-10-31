import './style.css';
import './typography.css';
import './games/games.css';
import './play-screen.css';
import './avatar.css';
import './touch-pad.css';
import './games/dama-motion.css';
import './games/chess.css';
import './games/neighborhood.css';
import './games/jolen.css';
import './games/retro.css';
import './games/lubid.css';
import './wardrobe.css';
import './landscape.css';
import { fitGameViewport } from './game-viewport';
import { FailureFeedback } from './haptics';
import { mountWardrobe } from './wardrobe-ui';
import { mountSaveTools } from './save-ui';
import { GAME_VERSION } from './version';
import { JOLEN_OPPONENTS } from './games/jolen';
import { createGame } from './game';
import { COLORS, loadProfile, saveProfile, storageAvailable } from './store';
import type { Match } from './rules';
import { GameDirector } from './games/director';
import { savedDama } from './games/dama';
import { GAMES, PUBLIC_GAMES, type ActivityUI, type GameId, type NewGameId, type Result } from './games/types';
import { HUB_SIZE, HUB_SITES } from './hub';
import { CHARACTERS, type AvatarGender } from './characters';
import { paintCharacterPreview } from './character-art';
import { DAMA_LEVELS, isDamaDifficulty, type DamaDifficulty } from './games/dama-levels';
import { PlayScreen } from './play-screen';
import { TouchPad } from './touch-pad';

const icons = {
  home: '<path d="m3 10 9-7 9 7v10H3z"/><path d="M9 20v-7h6v7"/>',
  game: '<rect x="3" y="6" width="18" height="13" rx="4"/><path d="M7 10v5m-2-2h5m6-2h.01m3 4h.01"/>',
  person: '<circle cx="12" cy="7" r="4"/><path d="M4 21v-3a8 8 0 0 1 16 0v3"/>',
  book: '<path d="M12 5v16M3 4h5a4 4 0 0 1 4 2 4 4 0 0 1 4-2h5v15h-5a4 4 0 0 0-4 2 4 4 0 0 0-4-2H3z"/>',
  sound: '<path d="m11 4-6 5H2v6h3l6 5zM15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>',
  settings: '<path d="M12 8v8m-4-4h8"/><circle cx="12" cy="12" r="9"/>',
  arrow: '<path d="M4 12h15m-6-6 6 6-6 6"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 1v3m0 16v3M1 12h3m16 0h3M4 4l2 2m12 12 2 2M4 20l2-2M18 6l2-2"/>',
  flag: '<path d="M5 22V3c6-4 8 4 15 0v10c-7 4-9-4-15 0"/>',
};
const icon = (name: keyof typeof icons) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name]}</svg>`;
const app = document.querySelector<HTMLDivElement>('#app')!;
const profile = loadProfile();
const DOM_GAMES = ['piko', 'tumbang', 'chess', 'dama', 'jolen', 'snake', 'impact'];
let phoneUnlocked = false;
let screenMenuOpen = false;
const feedback = new FailureFeedback(() => profile.vibration);
let paused = false;
let lastFocus: HTMLElement | null = null;
let resultMatch: Match | Result | null = null;
let selectedGame: GameId = 'patintero';
let scene: GameDirector;
let audio: AudioContext | undefined;
let toastTimer = 0;

app.innerHTML = `
  <header class="header">
    <a class="brand" href="./" aria-label="LARO home"><span class="brand-pixels">▗</span>LARO<span class="brand-period">.</span></a>
    <span class="brand-caption">THE NEIGHBORHOOD IS YOUR PLAYGROUND</span>
    <div class="header-right"><span class="offline-badge"><i></i> OFFLINE EDITION</span><span class="version">ALPHA 0.1</span><button id="sound-button" class="icon-button" aria-label="Mute sound" title="Toggle sound">${icon('sound')}</button></div>
  </header>
  <div class="layout">
    <aside class="rail" aria-label="Game navigation">
      <span class="rail-label">TARA, LARO.</span>
      <nav><button id="nav-hub" class="nav-item active">${icon('home')}<span>Barangay</span></button><button id="nav-play" class="nav-item">${icon('game')}<span>Patintero</span></button><button id="avatar-button" class="nav-item">${icon('person')}<span>My avatar</span></button></nav>
      <div class="rail-bottom"><button id="guide-button" class="nav-item">${icon('book')}<span>How to play</span></button><button id="settings-button" class="nav-item">${icon('settings')}<span>Settings</span></button><div class="made-in"><span>✳</span> MADE OF<br>FILIPINO PLAY.</div></div>
    </aside>
    <main>
      <section class="welcome"><div><div class="eyebrow">MALIGAYANG PAGDATING <span> / </span> WELCOME HOME</div><h1>A little street. A lot of play<span>.</span></h1><p>Old-school games. New memories. Your barangay is waiting.</p></div><div class="daily-note">${icon('sun')}<span>A good day<br><strong>to play outside.</strong></span></div></section>
      <div class="play-layout">
        <section id="game-display" class="world-card" aria-label="Playable game">
          <div class="world-toolbar"><div class="place"><span class="live-dot"></span><strong id="location-title">Barangay Maligaya</strong><span id="location-subtitle">PUROK 01</span></div><div class="weather">${icon('sun')}<span>15:30 · GOLDEN HOUR</span><button id="play-menu" class="tiny-button" hidden aria-controls="fullscreen-nav" aria-expanded="false">Menu</button><button id="pocket-phone" class="tiny-button" hidden aria-label="Open pocket phone" title="Pocket phone">▣</button><button id="pause-button" class="tiny-button" aria-label="Pause game" title="Pause game">Ⅱ</button><button id="fullscreen-button" class="tiny-button" aria-label="Fullscreen game" title="Fullscreen game">⛶</button></div></div>
          <div id="game-shell" class="game-shell"><div id="game" aria-label="Barangay game. Move with WASD or arrow keys. Press E to interact." tabindex="0"></div>
            <div class="map-label" id="map-label"><span>EXPLORE AT YOUR OWN PACE</span><strong>Welcome to the barangay.</strong></div>
            <div class="round-hud" id="round-hud" hidden><span id="lives">♥ ♥ ♥</span><strong id="round-objective">CROSS THE COURT</strong><span id="timer">01:30</span></div>
            <div id="countdown" class="countdown" hidden></div>
            <div class="player-chip"><span class="mini-avatar" id="mini-avatar"></span><div><strong id="player-name"></strong><span>THAT’S YOU</span></div></div>
            <button id="emote-button" class="emote-button" aria-label="Wave to your neighbors" title="Wave · Space">☺ <span>SPACE</span></button>
            <div class="touch-controls" aria-label="Touch movement controls"><div id="touch-pad" class="touch-pad" role="group" aria-label="Movement control pad" aria-describedby="touch-pad-help" tabindex="0"><span class="stick-knob" aria-hidden="true"></span></div><span id="touch-pad-help" class="sr-only">Drag the circular pad to move in any direction, including diagonals. You can also use WASD or arrow keys.</span><button id="touch-run" aria-label="Takbo · hold to run">Takbo</button></div>
          </div>
          <div class="world-bottom"><span class="hint" id="hint" role="status">Getting the neighborhood ready…</span><span class="stamina"><span>ENERGY</span><span class="stamina-track"><i id="stamina-fill"></i></span></span></div>
          <nav id="fullscreen-nav" class="fullscreen-nav" aria-label="Fullscreen game navigation"><button data-screen-nav="nav-hub">Barangay</button><button data-screen-nav="nav-play">Games</button><button data-screen-nav="avatar-button">Avatar</button><button data-screen-nav="guide-button">Rules</button><button data-screen-nav="settings-button">Settings</button><button data-screen-nav="sound-button">Sound</button><button id="exit-play-screen">Exit ⛶</button></nav>
          <span id="rotate-hint" class="rotate-hint" hidden>Turn your phone sideways for landscape play.</span>
        </section>
        <aside class="side-panel">
          <section class="game-card"><div class="card-top"><span class="eyebrow">THE CLASSICS</span><span class="number">01 / 05</span></div><div class="court-art" aria-hidden="true"><div class="chalk-court"><i></i><i></i><i></i><b></b></div><span class="art-kid one"></span><span class="art-kid two"></span><span class="art-kid three"></span><span class="art-ball"></span><span class="art-spark">✦</span></div><div class="game-card-content"><div class="game-category"><span class="small-dot"></span> STREET GAME <span>·</span> SOLO + BOTS</div><h2>Patintero</h2><p>Quick feet. Good timing.<br>Cross the lines. Make it home.</p><div class="game-tags"><span>90-second rounds</span><span>4 bot guards</span></div><button id="play-button" class="primary-button">Play Patintero ${icon('arrow')}</button><button id="rules-button" class="text-button">New here? Learn the rules ↗</button></div></section>
          <section class="progress-card"><div class="eyebrow">YOUR LITTLE WINS</div><div class="stats"><div><strong id="wins">0</strong><span>WINS</span></div><div><strong id="coins">0</strong><span>COINS</span></div><div><strong id="best">—</strong><span>BEST TIME</span></div></div><p><span class="save-dot"></span><span id="save-status">Progress saved on this device</span></p></section>
          <div class="more-games"><span>MORE STREET GAMES, SOON</span><span>⌑ Tumbang Preso</span><span>⌑ Sipa</span></div>
        </aside>
      </div>
      <section class="below-game"><div><span class="little-star">✳</span><p><strong>No internet. No problem.</strong><span>Just you, the neighborhood, and one more round.</span></p></div><div class="keyboard-guide"><span><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> Move</span><span><kbd>SHIFT</kbd> Run</span><span><kbd>E</kbd> Interact</span></div></section>
      <footer><span>ROOTED IN FILIPINO CHILDHOOD. BUILT FOR EVERYONE.</span><span>Isang laro pa? <span class="footer-flower">✳</span></span></footer>
    </main>
  </div>
  <dialog id="modal" aria-labelledby="modal-title"><button id="close-modal" class="close-modal" aria-label="Close dialog">×</button><div id="modal-content"></div></dialog>
  <div id="toast" class="toast" role="status" hidden></div>
`;
document.querySelector('.version')!.textContent = 'v' + GAME_VERSION;
document.querySelector('#boot-version')!.textContent = ' · v' + GAME_VERSION;
const finishBoot = () => { const splash = document.querySelector<HTMLElement>('#boot-screen')!; document.querySelector('#boot-status')!.textContent = 'Tara, laro tayo!'; splash.classList.add('leaving'); window.setTimeout(() => { splash.hidden = true; }, 260); };
window.addEventListener('laro-ready', finishBoot, { once: true });
document.querySelector('.rail-bottom')!.insertAdjacentHTML('beforeend', '<button id="about-button" class="nav-item" aria-label="About LARO"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10v1"/></svg><span>About</span></button>');
document.querySelector('#exit-play-screen')!.insertAdjacentHTML('beforebegin', '<button data-screen-nav="about-button">About</button>');
document.querySelector('#nav-play span')!.textContent = 'Games';
document.querySelector('.more-games')!.innerHTML = '<span>NINE CLASSICS · TWO HIDDEN SECRETS</span><span>All playable offline · your progress stays here.</span>';
document.querySelector('.side-panel')!.insertAdjacentHTML('afterbegin', `<section class="game-picker" aria-label="Choose a game"><div class="eyebrow">WHAT SHALL WE PLAY?</div><div class="game-picker-grid">${PUBLIC_GAMES.map(id => `<button type="button" data-game="${id}" aria-label="Choose ${GAMES[id].title}" aria-pressed="${id === selectedGame}" class="${id === selectedGame ? 'selected' : ''}"><span>${({ piko: 'P', tumbang: 'T', chess: 'C', patintero: '╬', dama: '◉', taguan: '♧', tinik: '↟', jolen: '●', lubid: '∿', snake: '▧', impact: '✧' })[id]}</span>${GAMES[id].title}</button>`).join('')}</div></section>`);
document.querySelector('#game-shell')!.insertAdjacentHTML('beforeend', '<button id="finish-lubid" hidden>Finish · 0/100 coins</button><button id="activity-action" class="activity-action" hidden>Jump · Space</button>');
document.querySelector('.game-picker')!.insertAdjacentHTML('beforeend', '<button id="quick-settings" class="quick-settings">Difficulty: Easy · Change</button>');
document.querySelector('#game-shell')!.insertAdjacentHTML('beforeend', `<div id="hub-map" class="hub-map"><svg viewBox="0 0 136 85" role="img" aria-label="Barangay map with eight game locations"><path d="M13 9V58M0 22H132M13 41H98M77 22V60M102 22V81M77 81H132M102 56H132" fill="none" stroke="#b8a780" stroke-width="5"/>${HUB_SITES.map(site => `<circle cx="${site.at.x / HUB_SIZE.width * 136}" cy="${site.at.y / HUB_SIZE.height * 85}" r="4" fill="#e7bd73"/><text x="${site.at.x / HUB_SIZE.width * 136 + 5}" y="${site.at.y / HUB_SIZE.height * 85 - 4}" fill="#f3e7bb" font-size="8">${site.game === 'piko' ? 'K' : site.game === 'tumbang' ? 'B' : site.game === 'lubid' ? 'R' : site.game === 'jolen' ? 'J' : site.game === 'dama' ? 'D' : site.game === 'tinik' ? 'L' : site.game === 'taguan' ? 'T' : 'P'}</text>`).join('')}<rect id="hub-map-view" width="81.6" height="51" fill="none" stroke="#e4efcc" stroke-opacity=".6"/><circle id="hub-map-player" r="3" fill="#fff8d7" stroke="#314a35"/></svg><span>MALIGAYA · 8 PLACES</span></div>`);
const $ = <T extends HTMLElement = HTMLElement>(selector: string) => document.querySelector<T>(selector)!;
const dialog = $<HTMLDialogElement>('#modal');
// Keep dialogs and feedback inside the fullscreen element on every browser.
$('#game-display').append(dialog, $('#toast'));
function toast(message: string) { $('#toast').textContent = message; $('#toast').hidden = false; clearTimeout(toastTimer); toastTimer = window.setTimeout(() => { $('#toast').hidden = true; }, 4000); }
function refreshProfile() {
  $('#quick-settings').textContent = selectedGame === 'chess' ? `Chess: ${profile.chessDifficulty} - Change` : selectedGame === 'jolen' ? `Jolen: ${profile.jolenDifficulty === 'master' ? 'Extreme' : DAMA_LEVELS[profile.jolenDifficulty].label} · ${JOLEN_OPPONENTS[profile.jolenDifficulty].name}` : selectedGame === 'dama' ? `Dama: ${DAMA_LEVELS[profile.damaDifficulty].label} · ${DAMA_LEVELS[profile.damaDifficulty].opponent}` : `Difficulty: ${profile.difficulty[0].toUpperCase() + profile.difficulty.slice(1)} · Change`;
  $('#player-name').textContent = profile.name;
  $('#mini-avatar').style.setProperty('--shirt', COLORS[profile.color]);
  $('#mini-avatar').classList.add('has-portrait');
  const portrait = document.createElement('canvas'); paintCharacterPreview(portrait, profile.gender, COLORS[profile.color], 0, 0, profile.wardrobe.equipped); $('#mini-avatar').replaceChildren(portrait);
  $('#game').dataset.avatarGender = profile.gender; $('#game').dataset.avatarOutfit = JSON.stringify(profile.wardrobe.equipped);
  const record = selectedGame === 'patintero' ? { wins: profile.wins, best: profile.best, played: profile.played } : profile.records[selectedGame];
  $('#wins').textContent = String(record.wins); $('#coins').textContent = String(profile.coins);
  $('#best').textContent = ['dama', 'chess'].includes(selectedGame) ? String(record.played) : record.best ? selectedGame === 'lubid' ? String(record.best) : selectedGame === 'snake' || selectedGame === 'impact' ? String(record.best) : selectedGame === 'jolen' ? `${record.best}/15` : selectedGame === 'piko' ? `${record.best}/8` : selectedGame === 'tumbang' ? String(record.best) : selectedGame === 'tinik' ? `${record.best}/6` : `${record.best}s` : '—';
  document.querySelector('.stats > div:last-child > span')!.textContent = GAMES[selectedGame].record;
  $('#sound-button').setAttribute('aria-label', profile.muted ? 'Unmute sound' : 'Mute sound');
  $('#sound-button').classList.toggle('muted', profile.muted);
  $('#save-status').textContent = storageAvailable ? 'Progress saved on this device' : 'Saving unavailable in this browser';
}
function persist() { const saved = saveProfile(profile); refreshProfile(); return saved; }
function openModal(content: string, dismissible = true) {
  if (screenMenuOpen) $('#play-menu').click();
  touchPad.reset(); document.querySelectorAll('.held').forEach(button => button.classList.remove('held'));
  scene.resetInput();
  game.input.keyboard!.preventDefault = false;
  lastFocus = document.activeElement as HTMLElement;
  $('#modal-content').innerHTML = content; $('#close-modal').hidden = !dismissible;
  if (!dialog.open) dialog.showModal();
}
function closeModal() { scene.resetInput(); game.input.keyboard!.preventDefault = !DOM_GAMES.includes(scene.active); dialog.close(); resultMatch = null; lastFocus?.focus(); }
$('#close-modal').onclick = closeModal;
document.addEventListener('keydown', event => {
  if (!dialog.open && ['dama', 'chess'].includes(scene?.active) && event.key === 'Escape') pause();
});
dialog.addEventListener('cancel', event => { event.preventDefault(); if (resultMatch) return; if (paused) resume(); else closeModal(); });
dialog.addEventListener('click', event => { if (event.target === dialog && !resultMatch) { if (paused) resume(); else closeModal(); } });

function sound(kind: 'step' | 'tag' | 'turn' | 'win' | 'emote') {
  if (profile.muted) return;
  try {
    audio ??= new AudioContext();
    if (audio.state !== 'running') { if (kind === 'step') return; void audio.resume(); }
    const sequence = kind === 'win' ? [523, 659, 784, 1046] : kind === 'turn' ? [659, 880] : kind === 'tag' ? [180, 120] : kind === 'emote' ? [440, 554, 659] : [100];
    sequence.forEach((frequency, i) => {
      const oscillator = audio!.createOscillator(); const gain = audio!.createGain();
      const now = audio!.currentTime + i * 0.095;
      oscillator.type = kind === 'step' ? 'sine' : 'triangle'; oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0, now); gain.gain.linearRampToValueAtTime(kind === 'step' ? 0.012 : 0.045, now + 0.008); gain.gain.exponentialRampToValueAtTime(0.001, now + 0.11);
      oscillator.connect(gain); gain.connect(audio!.destination); oscillator.start(now); oscillator.stop(now + 0.12);
    });
  } catch { /* Sound is optional on browsers without Web Audio. */ }
}

const { scene: barangay, game } = createGame({
  profile, blocked: () => dialog.open || screenMenuOpen,
  foundPhone() { phoneUnlocked = true; profile.phoneFinds++; persist(); $('#pocket-phone').hidden = false; openPhone(); },
  failure: feedback.trigger,
  enterGame(id) { selectedGame = id; updateGameCard(); setupGame(id); },
  location(mode) {
    activityLocation(mode);
    $('#location-title').textContent = mode === 'hub' ? 'Barangay Maligaya' : 'Patintero Court';
    $('#location-subtitle').textContent = mode === 'hub' ? 'PUROK 01' : 'PRACTICE ROUND';
    $('#map-label').hidden = mode !== 'hub'; $('#round-hud').hidden = mode !== 'match';
    $('#nav-hub').classList.toggle('active', mode === 'hub'); $('#nav-play').classList.toggle('active', mode === 'match');
    updateGameCard();
  },
  status(match) {
    if (!match) { $('#countdown').hidden = true; return; }
    $('#lives').textContent = '♥ '.repeat(match.lives) + '♡ '.repeat(3 - match.lives);
    $('#timer').textContent = `${Math.floor(Math.ceil(match.remaining) / 60).toString().padStart(2, '0')}:${(Math.ceil(match.remaining) % 60).toString().padStart(2, '0')}`;
    $('#round-objective').textContent = match.returning ? 'NOW MAKE IT HOME ↓' : 'CROSS THE COURT ↑';
    $('#countdown').hidden = match.phase !== 'ready';
    $('#countdown').textContent = String(Math.ceil(match.countdown));
  },
  hint(message) { $('#hint').textContent = message; },
  sound,
  result(match, earned) {
    resultMatch = match; if (match.phase !== 'won') feedback.trigger('loss');
    profile.played++; profile.coins += earned;
    const seconds = Math.ceil(90 - match.remaining);
    if (match.phase === 'won') { profile.wins++; if (!profile.best || seconds < profile.best) profile.best = seconds; }
    persist();
    openModal(`<div class="result-symbol">${match.phase === 'won' ? '✳' : '↻'}</div><div class="eyebrow">${match.phase === 'won' ? 'ANG GALING MO!' : 'ISA PANG LARO?'}</div><h2 id="modal-title">${match.phase === 'won' ? 'You made it home.' : 'Another round awaits.'}</h2><p>${match.phase === 'won' ? `Across the lines and back in ${seconds} seconds. The barangay is cheering for you.` : match.remaining === 0 ? 'Time’s up! Try using a sprint when the guards move away.' : 'Those guards are quick. Try changing lanes before you cross.'}</p><div class="result-reward">+${earned} <span>COINS EARNED</span></div><button id="rematch-button" class="primary-button">One more round ${icon('arrow')}</button><button id="return-button" class="secondary-button">Back to the barangay</button>`, false);
    $('#rematch-button').onclick = () => { closeModal(); scene.startMatch(); };
    $('#return-button').onclick = () => { closeModal(); scene.hub(); };
  },
});

const activityUI: ActivityUI = {
  failure: feedback.trigger,
  progress(id, best) { if (best > profile.records[id].best) { profile.records[id].best = best; persist(); } },
  phoneReturned() { phoneUnlocked = false; $('#pocket-phone').hidden = true; },
  profile, blocked: () => dialog.open || screenMenuOpen,
  location: activityLocation,
  hud(value) {
    $('#lives').textContent = value.left; $('#round-objective').textContent = value.objective; $('#timer').textContent = value.right;
    $('#countdown').hidden = !value.countdown; $('#countdown').textContent = value.countdown ? String(Math.ceil(value.countdown)) : '';
  },
  hint(message) { $('#hint').textContent = message; }, sound,
  result(value) {
    resultMatch = value; if (!value.won && !value.draw && !value.practice && value.failure !== false) feedback.trigger('loss');
    if (!value.practice) {
      const record = profile.records[value.game]; record.played++; if (value.won) record.wins++;
      record.best = Math.max(record.best, value.record); profile.coins += value.coins; persist();
    }
    openModal(`<div class="result-symbol">${value.won ? '✳' : '↻'}</div><div class="eyebrow">${GAMES[value.game].title.toUpperCase()} · ${value.practice ? 'FRIENDLY PRACTICE' : value.draw ? 'DRAW' : value.won ? 'ANG GALING MO!' : 'ISA PANG LARO?'}</div><h2 id="modal-title"></h2><p id="result-summary"></p><div class="result-reward">+${value.coins} <span>${value.practice ? 'PRACTICE · NO COINS OR RECORDS' : 'COINS EARNED'}</span></div><button id="rematch-button" class="primary-button">${value.game === 'snake' || value.game === 'impact' ? 'Find the phone again' : 'One more round'} ${icon('arrow')}</button><button id="return-button" class="secondary-button">Back to the barangay</button>`, false);
    $('#modal-title').textContent = value.title; $('#result-summary').textContent = value.summary;
    $('#rematch-button').onclick = () => { closeModal(); setupGame(value.game); };
    $('#return-button').onclick = () => { closeModal(); scene.hub(); };
  },
};
scene = new GameDirector(game, barangay, activityUI);

function activityLocation(mode: 'hub' | 'match' | NewGameId) {
  const active = mode === 'match' ? 'patintero' : mode;
  if (scene) scene.active = active;
  if (active !== 'hub') selectedGame = active; else if (!phoneUnlocked && ['snake', 'impact'].includes(selectedGame)) selectedGame = 'patintero';
  const titles = { hub: 'Barangay Maligaya', patintero: 'Patintero Court', dama: 'Dama sa Tindahan', chess: 'Chess sa Tindahan', taguan: 'Tagu-taguan Alley', tinik: 'Luksong-tinik Schoolyard', jolen: 'Jolen Circle', lubid: 'Luksong Lubid Yard', piko: 'Piko with Wendy', tumbang: 'Tumbang Preso with Eric', snake: 'Pocket Phone · Snake', impact: 'Pocket Phone · Orbit Patrol' };
  $('#location-title').textContent = titles[active];
  $('#location-subtitle').textContent = active === 'hub' ? 'PUROK 01' : ['dama', 'chess'].includes(active) ? 'AT THE WOODEN TABLE' : 'OFFLINE PLAY';
  $('#game-shell').dataset.activity = active;
  $('#game-display').dataset.activity = active;
  $('#pocket-phone').hidden = !phoneUnlocked || ['snake', 'impact'].includes(active);
  game.input.keyboard!.preventDefault = !DOM_GAMES.includes(active);
  $('#map-label').hidden = active !== 'hub'; $('#round-hud').hidden = active === 'hub' || DOM_GAMES.includes(active); $('#countdown').hidden = true;
  $('#hub-map').hidden = active !== 'hub';
  $('.player-chip').hidden = DOM_GAMES.includes(active); $('#emote-button').hidden = active !== 'hub' && active !== 'patintero';
  $('.touch-controls').hidden = !['hub', 'patintero', 'taguan'].includes(active);
  $('.stamina').hidden = !['hub', 'patintero', 'taguan'].includes(active);
  $('#finish-lubid').hidden = active !== 'lubid';
  $('#activity-action').hidden = !['tinik', 'taguan', 'lubid'].includes(active);
  $('#activity-action').textContent = active === 'tinik' || active === 'lubid' ? 'Jump · Space' : 'Crouch · E';
  $('#nav-hub').classList.toggle('active', active === 'hub'); $('#nav-play').classList.toggle('active', active !== 'hub');
  const instructions = active === 'piko' ? 'Aim / toss with Space - one foot: Space - two feet: D - Escape pauses' : active === 'tumbang' ? 'Tap to aim / move - Space throws, retrieves, or guards - Escape pauses' : active === 'lubid' ? 'Tap the court or Jump · Space jumps · Escape pauses' : active === 'snake' || active === 'impact' ? 'Phone keypad / WASD / arrows · Space fires · Escape pauses' : active === 'jolen' ? 'Tap to aim · Tira starts power · tap again to shoot · Space also works' : ['dama', 'chess'].includes(active) ? 'Click a piece, then its highlighted destination.' : active === 'tinik' ? 'Space or Jump to take off · Escape to pause' : active === 'taguan' ? 'WASD / arrows move · Shift sprints · E crouches' : 'WASD / arrows move · Shift runs · E interacts';
  $('.keyboard-guide').textContent = instructions;
  updateGameCard();
  if (active !== 'hub' && innerWidth <= 1100) requestAnimationFrame(() => $('.world-card').scrollIntoView({ block: 'start' }));
}

function updateGameCard() {
  const item = GAMES[selectedGame];
  $('.game-card h2').textContent = item.title; $('.game-card p').textContent = item.description;
  $('.game-category').textContent = item.category;
  $('.game-tags').innerHTML = item.tags.map(tag => `<span>${tag}</span>`).join('');
  $('.number').textContent = PUBLIC_GAMES.includes(selectedGame) || selectedGame === 'chess' ? `${String(PUBLIC_GAMES.indexOf(selectedGame === 'chess' ? 'dama' : selectedGame) + 1).padStart(2, '0')} / 08` : 'SECRET / 02';
  const art = $('.court-art'); art.dataset.gameArt = selectedGame;
  if (selectedGame === 'patintero') art.innerHTML = '<div class="chalk-court"><i></i><i></i><i></i><b></b></div><span class="art-kid one"></span><span class="art-kid two"></span><span class="art-kid three"></span><span class="art-spark">✦</span>';
  else if (selectedGame === 'piko') art.innerHTML = '<div class="preview-piko">9<br>7 | 8<br>6<br>4 | 5<br>3<br>2<br>1</div><span class="preview-caption">TOSS. HOP. LAND WITH WENDY.</span>';
  else if (selectedGame === 'tumbang') art.innerHTML = '<div class="preview-tin"></div><span class="preview-caption">TUTOK. TIRA. TAKBO WITH ERIC!</span>';
  else if (selectedGame === 'lubid') art.innerHTML = '<div class="preview-rope"></div><span class="art-kid one"></span><span class="art-kid two"></span><span class="preview-caption">TALON. BILIS. ULIT!</span>';
  else if (selectedGame === 'snake' || selectedGame === 'impact') art.innerHTML = '<span class="preview-pocket">▣</span><span class="preview-caption">A SECRET IN YOUR POCKET</span>';
  else if (selectedGame === 'jolen') art.innerHTML = '<div class="preview-jolen"><i></i><i></i><i></i></div><span class="preview-caption">TUTOK. TIMING. TIRA!</span>';
  else if (selectedGame === 'dama' || selectedGame === 'chess') art.innerHTML = '<div class="preview-board">' + Array.from({ length: 16 }, (_, i) => `<i class="${(Math.floor(i / 4) + i % 4) % 2 ? 'dark' : ''}">${[1, 3, 12, 14].includes(i) ? '<b></b>' : ''}</i>`).join('') + '</div><span class="preview-caption">SA TABI NG TINDAHAN</span>';
  else if (selectedGame === 'taguan') art.innerHTML = '<div class="preview-wall"></div><div class="preview-bush"></div><span class="art-kid one"></span><span class="preview-search">⌕</span><span class="preview-caption">TAHAN… MAY TAYA.</span>';
  else art.innerHTML = '<div class="preview-hands"></div><span class="art-kid one"></span><span class="art-kid two"></span><span class="art-kid three"></span><span class="preview-caption">ISA PANG TAAS!</span>';
  document.querySelectorAll<HTMLButtonElement>('[data-game]').forEach(button => { const current = button.dataset.game === (selectedGame === 'chess' ? 'dama' : selectedGame); button.classList.toggle('selected', current); button.setAttribute('aria-pressed', String(current)); });
  $('#play-button').innerHTML = `${scene?.active === selectedGame ? 'Restart ' : 'Play '}${item.title} ${icon('arrow')}`;
  refreshProfile();
}

function setupGame(id: GameId) {
  if (id === 'snake' || id === 'impact') {
    if (!phoneUnlocked || ['snake', 'impact'].includes(scene.active)) { closeModal(); scene.hub(); toast('The phone is back in the barangay at a different spot. Find it to play again.'); return; }
    closeModal(); scene.start(id);
  } else if (id === 'piko' || id === 'tumbang') {
    const piko = id === 'piko';
    openModal(`<div class="eyebrow">${piko ? 'SILANGANG KANTO - WITH WENDY' : 'BAGONG LARUAN - WITH ERIC'}</div><h2 id="modal-title">${piko ? 'Tara, Piko tayo!' : 'Tumbang Preso!'}</h2><p>${piko ? 'Toss a pamato into the numbered square. Aim by tapping the court or using the slider. Start the meter and tap again in the gold zone. Then time one-foot and two-foot landings out and back, skipping the marker.' : 'Aim a tsinelas at the tin can, start the power meter, then tap to throw. Knock the can down, retrieve your slipper, and return behind the line. The guard must reach and reset the fallen can before tagging.'}</p><p>${piko ? 'Eight courses, three chances. Space means one foot; D means two feet. The next square lights up. You can study the route before starting each course.' : 'Three rounds, with one throw and one guard turn each. Use Retrieve to run out and back, or tap the court to choose a route. When guarding, Reset can / Chase Eric moves you toward the current objective. One point for a successful hit and retrieval, or a legal tag as guard.'}</p><label class="field-label" for="street-difficulty">DIFFICULTY</label><select id="street-difficulty" class="opponent-select"><option value="easy">Easy - guides and generous timing</option><option value="normal">Normal - tighter timing and faster guard</option><option value="hard">Hard - precise timing, no trajectory guide</option></select><button id="street-start" class="primary-button">Play ${GAMES[id].title}</button><p class="fine-print">LARO neighborhood adaptations. Completed games save records and earn coins. Leaving early earns none.</p>`);
    const select = $<HTMLSelectElement>('#street-difficulty'); select.value = profile.difficulty;
    $('#street-start').onclick = () => { profile.difficulty = select.value === 'hard' ? 'hard' : select.value === 'normal' ? 'normal' : 'easy'; persist(); closeModal(); scene.start(id); };
  } else if (id === 'lubid') {
    openModal(`<div class="eyebrow">TALON. BILIS. ULIT! · ${profile.difficulty.toUpperCase()}</div><h2 id="modal-title">Tara, Luksong Lubid!</h2><p>Weng and Ferdie turn the rope. Tap the court, Jump, or Space to jump immediately. Keep going beyond 100 for a new record. Three rope hits end the run; Finish lets you collect early.</p><p>Tap as the rope comes down toward your feet. One tap makes one jump; holding does not repeat. A tap just before landing is briefly buffered. Speed is capped, with smooth fast/slow variations after 50 clears. Earn 1 coin per 2 jumps, capped at 100 coins per run. Your best score saves after each clear.</p><button id="lubid-start" class="primary-button">Start jumping</button>`);
    $('#lubid-start').onclick = () => { closeModal(); scene.start('lubid'); };
  } else if (id === 'jolen') {
    openModal(`<div class="eyebrow">TUTOK. TIMING. TIRA!</div><h2 id="modal-title">Tara, Jolen tayo.</h2><p>Fifteen marbles in a chalk circle. Knock them out to collect them. Most marbles wins. From Normal onward, knocking the opposing shooter into the hole wins instantly. Normal uses a fixed hole; harder games randomize its position for each match.</p><p>Your shooter stays where it lands. Aim, tap Tira to start the fast power bar, then tap again to shoot. Turns alternate after every shot.</p><label class="field-label" for="jolen-difficulty">YOUR OPPONENT</label><select id="jolen-difficulty" class="opponent-select">${(Object.keys(JOLEN_OPPONENTS) as DamaDifficulty[]).map(level => `<option value="${level}">${DAMA_LEVELS[level].label} · ${JOLEN_OPPONENTS[level].name}</option>`).join('')}</select><button id="jolen-start" class="primary-button">Play Jolen</button>`);
    const select = $<HTMLSelectElement>('#jolen-difficulty'); select.value = profile.jolenDifficulty;
    $('#jolen-start').onclick = () => { if (isDamaDifficulty(select.value)) profile.jolenDifficulty = select.value; persist(); closeModal(); scene.start('jolen'); };
  } else if (id === 'chess') {
    openModal(`<div class="eyebrow">THE SAME WOODEN TABLE</div><h2 id="modal-title">Tara, Chess tayo.</h2>${tableOptions('chess')}<p>White moves first. Select a piece, then a highlighted square. Protect your king and finish with checkmate.</p><label class="field-label" for="chess-difficulty">CHESS BOT</label><select id="chess-difficulty" class="opponent-select"><option value="easy">Easy - learning the moves</option><option value="normal">Normal - looks one reply ahead</option><option value="hard">Hard - deeper beginner challenge</option></select><button id="chess-bot" class="primary-button">Play against the bot</button><button id="chess-local" class="secondary-button">Two players - pass-and-play</button><p class="fine-print">Castling, en passant, promotion, checkmate, and draws are included. Bot matches earn coins and separate chess records. Friendly pass-and-play has no rewards. Leaving ends the match. Your saved Dama match stays available.</p>`);
    bindTableOptions();
    const select = $<HTMLSelectElement>('#chess-difficulty'); select.value = profile.chessDifficulty;
    select.onchange = () => { profile.chessDifficulty = select.value === 'hard' ? 'hard' : select.value === 'normal' ? 'normal' : 'easy'; persist(); };
    $('#chess-bot').onclick = () => { closeModal(); scene.start('chess', { mode: 'bot' }); };
    $('#chess-local').onclick = () => { closeModal(); scene.start('chess', { mode: 'local' }); };
  } else if (id === 'dama') {
    const saved = savedDama();
    openModal(`<div class="eyebrow">TAKE A SEAT</div><h2 id="modal-title">Tara, Dama tayo.</h2>${tableOptions('dama')}<p>Gold moves first. Backward captures, flying kings, and mandatory longest capture chains.</p><label class="field-label" for="dama-difficulty">YOUR OPPONENT</label><select id="dama-difficulty" class="opponent-select">${damaOptions()}</select><p id="dama-opponent-hint" class="fine-print"></p>${saved ? `<button id="resume-dama" class="primary-button">Resume saved match</button>` : ''}<button id="dama-bot" class="${saved ? 'secondary' : 'primary'}-button"></button><button id="dama-local" class="secondary-button">Two players · pass-and-play</button><p class="fine-print">A new match replaces the unfinished saved match. Resuming keeps that match’s opponent. Pass-and-play is a friendly mode with no coins or records.</p>`);
    bindTableOptions();
    const select = $<HTMLSelectElement>('#dama-difficulty'); select.value = profile.damaDifficulty;
    const showOpponent = () => { $('#dama-bot').textContent = `Play against ${DAMA_LEVELS[profile.damaDifficulty].opponent}`; $('#dama-opponent-hint').textContent = DAMA_LEVELS[profile.damaDifficulty].hint; };
    select.onchange = () => { if (isDamaDifficulty(select.value)) profile.damaDifficulty = select.value; persist(); showOpponent(); };
    showOpponent();
    if (saved) $('#resume-dama').onclick = () => { closeModal(); scene.start('dama', { resume: true }); };
    $('#dama-bot').onclick = () => { closeModal(); scene.start('dama', { mode: 'bot' }); };
    $('#dama-local').onclick = () => { closeModal(); scene.start('dama', { mode: 'local' }); };
  } else if (id === 'tinik') {
    openModal(`<div class="eyebrow">ISA PANG TAAS! · ${profile.difficulty.toUpperCase()}</div><h2 id="modal-title">Ready for a brave jump?</h2><p>Six heights, changing run-up speeds, and a different takeoff point each round. Press Space or Jump in the green zone. Hard mode uses a small notch after height two.</p><button id="tinik-challenge" class="primary-button">Challenge · three chances</button><button id="tinik-practice" class="secondary-button">Practice · unlimited retries</button><p class="fine-print">Change difficulty above the game cards. Practice keeps the full guide and awards no coins or records.</p>`);
    $('#tinik-challenge').onclick = () => { closeModal(); scene.start('tinik'); };
    $('#tinik-practice').onclick = () => { closeModal(); scene.start('tinik', { practice: true }); };
  } else { closeModal(); scene.start(id); sound('emote'); }
}
function tableOptions(active: 'dama' | 'chess') { return `<div class="table-options" role="group" aria-label="Game at the Dama table"><button type="button" data-table-game="dama" aria-pressed="${active === 'dama'}">Dama</button><button type="button" data-table-game="chess" aria-pressed="${active === 'chess'}">Chess</button></div>`; }
function bindTableOptions() { document.querySelectorAll<HTMLButtonElement>('[data-table-game]').forEach(button => { button.onclick = () => setupGame(button.dataset.tableGame as 'dama' | 'chess'); }); }
function damaOptions() { return (Object.keys(DAMA_LEVELS) as DamaDifficulty[]).map(id => `<option value="${id}">${DAMA_LEVELS[id].label} · ${DAMA_LEVELS[id].opponent}</option>`).join(''); }
document.querySelectorAll<HTMLButtonElement>('[data-game]').forEach(button => { button.onclick = () => { selectedGame = button.dataset.game as GameId; updateGameCard(); }; });
$('#finish-lubid').onclick = () => scene.finishRun();
$('#activity-action').onpointerdown = event => { if (scene.active === 'lubid') { event.preventDefault(); scene.action(); } };
$('#activity-action').onclick = event => { if (scene.active !== 'lubid' || event.detail === 0) scene.action(); };
function openPhone() {
  if (!phoneUnlocked) return;
  openModal('<div class="eyebrow">A SECRET IN YOUR POCKET</div><h2 id="modal-title">You found a pocket phone!</h2><p>A chunky old handset, a green screen, and two little games. After you finish or leave a phone game, it returns to a different spot in the barangay. Find it again for another session. Reloading also changes its location.</p><button id="phone-snake" class="primary-button">Play Snake</button><button id="phone-impact" class="secondary-button">Play Orbit Patrol</button><p class="fine-print">High scores and earned coins save on this device. Use the phone button to reopen this menu until you play. Afterwards, the handset returns to the map.</p>');
  for (const id of ['snake', 'impact'] as const) $('#phone-' + id).onclick = () => { selectedGame = id; closeModal(); updateGameCard(); play(); };
}
$('#pocket-phone').onclick = openPhone;

function play() {
  if ($('#game').dataset.ready !== 'true') return;
  const active = scene.active !== 'hub' && ['ready', 'playing'].includes($('#game').dataset.phase || '');
  if (active) {
    openModal(`<div class="eyebrow">FRESH START</div><h2 id="modal-title">Start another game?</h2><p>${scene.active === 'dama' ? 'Your unfinished Dama match is saved. Choosing a new Dama match replaces it.' : 'Your current round will end without a reward.'}</p><button id="confirm-restart" class="primary-button">Start a new round</button><button id="cancel-restart" class="secondary-button">Keep playing</button>`);
    $('#confirm-restart').onclick = () => { closeModal(); setupGame(selectedGame); };
    $('#cancel-restart').onclick = closeModal;
  } else setupGame(selectedGame);
}
$('#play-button').onclick = play;
$('#nav-play').onclick = () => {
  openModal(`<div class="eyebrow">TARA, LARO TAYO</div><h2 id="modal-title">An afternoon of play.</h2><div class="game-menu">${PUBLIC_GAMES.map(id => `<button class="game-menu-card" data-menu-game="${id}"><strong>${GAMES[id].title}</strong><span>${GAMES[id].description}</span><small>Play ${GAMES[id].title} →</small></button>`).join('')}</div>`);
  document.querySelectorAll<HTMLButtonElement>('[data-menu-game]').forEach(button => { button.onclick = () => { selectedGame = button.dataset.menuGame as GameId; closeModal(); updateGameCard(); play(); }; });
};
$('#nav-hub').onclick = () => {
  if (scene.active === 'hub') return;
  openModal(`<div class="eyebrow">TAKE A BREATHER</div><h2 id="modal-title">Head back outside?</h2><p>${scene.active === 'dama' ? 'Your unfinished Dama match is saved. Resume it from the Dama setup whenever you like.' : 'This round will end without a reward.'}</p><button id="confirm-home" class="primary-button">Return to the barangay</button><button id="cancel-home" class="secondary-button">Keep playing</button>`);
  $('#confirm-home').onclick = () => { closeModal(); scene.hub(); }; $('#cancel-home').onclick = closeModal;
};
$('#emote-button').onclick = () => scene.emote();
$('#sound-button').onclick = () => { profile.muted = !profile.muted; persist(); if (!profile.muted) sound('emote'); };

function guide() {
  if (selectedGame !== 'patintero') {
    const pages: Record<NewGameId, string> = {
      piko: '<p>Wendy hosts eight pamato courses in the east lane. Tap a square to aim, or adjust the aim slider. Start the toss meter and release in the gold zone. The marker must land inside the target chalk square. Hop out and back, skipping the pamato square. Use Space or One foot for a single square, and D or Two feet for paired squares. A pair containing the marker becomes a one-foot landing. The next landing is highlighted. Early, late, and incorrect-foot landings each cost a chance, as does a missed toss. Three mistakes end the game. Easy shows a throw guide and generous timing, Normal tightens timing, and Hard removes the trajectory, narrows timing further, and adds a second out-and-back lap on courses five through eight. Clear all eight courses to earn 60 / 80 / 100 coins; a completed loss earns 10. Best completed courses save with your records.</p>',
      tumbang: '<p>Eric hosts three rounds with rotating thrower and guard roles. Aim and time the power of your tsinelas throw. Hit the tin can to knock it down; it tips, spins and rolls with the impact. Retrieve the slipper and return behind the safety line to score one point. More power sends the slipper farther, making retrieval riskier. Use Retrieve for an automatic out-and-back route, or tap the court to move. The guard must reach the fallen can, wait for it to settle, and reset it before tagging. A tag counts only outside the safety line while the can is upright, and earns the guard one point. Reset can / Chase Eric follows your guard objective; tapping the ground lets you choose a route. Turns end on a return, tag, or 22-second retrieval limit. Most points after three throws and three guard turns wins. Difficulty changes guide visibility, the bot throwing accuracy, running speed, and reset time. Wins earn 60 / 80 / 100 coins, draws 20, and losses 10.</p>',
      chess: '<p>Open the Dama table and choose Chess. White moves first. Select a piece, then a highlighted destination. Moves that leave your king in check are forbidden. Castling requires a clear, safe path and an unmoved king and rook. En passant is available only immediately after the opposing pawn advances two squares. A pawn reaching the last rank lets you choose queen, rook, bishop, or knight.</p><p>Checkmate wins. Stalemate, insufficient material, threefold repetition, and fifty moves by each side without a pawn move or capture end in a draw. These draws are automatic in this digital version. Choose a beginner bot at Easy, Normal, or Hard, or play a friend on the same device. Bot wins earn 60 coins, draws 20, and losses 10; pass-and-play awards none. Leaving ends your current chess match. Your unfinished Dama save is kept separately.</p>',
      lubid: '<p>Endless rope jumping. Tap the court, Jump, or Space to lift your feet before the rope crosses. Holding never auto-jumps; a tap within 75 ms of landing is buffered.</p><p>The rope speeds up to a cap of about 94 / 97 / 100 RPM on Easy / Normal / Hard. From 50 clears it smoothly shifts between faster and slower rhythms. Reach 100, then keep going: there is no final jump.</p><p>Your best score saves after every clear. Three hits end the run, or choose Finish to collect early. Rewards are 1 coin per 2 clearances, capped at 100 per run and awarded once on completion. Leaving through another menu saves the best score but earns no coins. Pause freezes the rope and your jump.</p>',
      snake: '<p>Find the phone in the barangay, then use its keypad, arrows, WASD, or swipe to steer. Eat food for 10 points and grow longer. Wrap through the edges and avoid your own body. Reversing directly is not allowed. The snake gets faster as it grows. Earn 2 coins per food, up to 30 per finished game. Leaving early earns none.</p>',
      impact: '<p>Orbit Patrol is an original monochrome space shooter. Use arrows, WASD, or the phone pad to move and hold Space or Fire to shoot. Destroy incoming ships and beat firing bosses and loop into faster waves. A collision or an enemy crossing the left edge costs one of three lives. Earn 1 coin per 25 points, up to 40 per finished game. Leaving early earns none.</p>',
      jolen: '<p>Collect the most of the 15 target marbles by knocking them completely outside the chalk circle.</p><ol class="rules-list"><li>You and the bot alternate shots, even after scoring.</li><li>Each shooter stays where it lands. Your character walks beside it before your next shot.</li><li>Tap or drag on the court to aim, or use the direction slider. Tap Tira (or Space) to start the power meter. Tap again to lock the strength and shoot.</li><li>The meter rises to full in 0.6 seconds and bounces back. Cancel lets you aim again.</li><li>Targets must cross the whole chalk line to score. Shooter marbles never score, but can collide and move each other.</li><li>Outside the circle is playable. A shooter leaving the dirt court is placed at its nearest edge. Once all targets are collected, the higher score wins.</li></ol><p>Five opponents use the same physics. Easy has no hole and shows a longer aim guide. Normal has a fixed hole; Hard, Expert and Extreme randomize the hole once per match and hide marble guide rings. Hit the opposing shooter into the hole to win immediately, regardless of collected marbles. Your own shooter and target marbles cannot trigger this win. Wins earn 60–100 coins by difficulty; a finished loss earns 10. Leaving early earns none. Escape pauses aiming, power, and motion.</p>',
      dama: `<p>LARO’s Filipino-style preset: an 8×8 board, twelve pieces per side, and Gold moves first.</p><ol class="rules-list"><li>Ordinary pieces step diagonally forward, but can capture forward or backward.</li><li>Captures are mandatory. Choose a sequence that takes the most pieces, and finish every jump with the same piece.</li><li>Captured pieces remain blockers until the complete sequence ends. Equal-length routes are your choice.</li><li>Kings fly along clear diagonals. Each capture jumps one opponent and lands on an empty square beyond it.</li><li>A piece becomes a king only if it ends its complete turn on the far rank.</li><li>Win when the opponent has no pieces or legal moves. Threefold repetition or 40 full moves without a capture or ordinary-piece move is a draw.</li></ol><p>Choose Easy with ${CHARACTERS.mamaShoni}, Normal with ${CHARACTERS.audrey}, Hard with ${CHARACTERS.mj}, Expert with ${CHARACTERS.ferdie}, or Master with ${CHARACTERS.tatayEfren}. You can also pass the device between two people. An unfinished match saves automatically. Bot wins earn 60 coins, draws 20, and losses 10. Friendly pass-and-play has no rewards.</p>`,
      taguan: `<p>${CHARACTERS.audrey} counts for 10 seconds. Use that time to hide, then survive a 75-second search.</p><ol class="rules-list"><li>Move with WASD, arrows, touch buttons, or by clicking the ground.</li><li>Hold Shift / Takbo to sprint. Sprinting uses energy and makes noise.</li><li>Press E or Crouch to move quietly. Shrubs, laundry, and bamboo conceal you; buildings, crates, and barrels block sight. Crouching in the open does not make you invisible.</li><li>The awareness meter fills when ${CHARACTERS.audrey} can see you. Break sight around a wall and relocate.</li><li>${CHARACTERS.audrey} investigates sounds and remembers where she last saw you, but cannot see through buildings. She must reach you to catch you.</li></ol><p>Easy mode shows her sight cone. Normal and Hard increase her speed, sight, and memory. Surviving earns 60 / 80 / 100 coins on Easy / Normal / Hard; a finished caught round earns 10. No transformation, disguise, or weapons.</p>`,
      tinik: '<p>Two neighborhood kids raise their hands and feet into a growing obstacle. Your run-up is automatic.</p><ol class="rules-list"><li>Watch your feet approach the takeoff zone. Speed and obstacle position change at each height.</li><li>Press Space or Jump once. Your jump follows a predictable arc.</li><li>Clear the whole obstacle and land to advance to the next height.</li><li>Touch the hands and lose a chance. Three misses end a challenge.</li><li>Clear all six heights to win. Practice gives unlimited retries without coins or records.</li></ol><p>Hard uses a small takeoff notch after height two; Practice keeps the full guide. A challenge win earns 60 / 80 / 100 coins on Easy / Normal / Hard, plus 10 per remaining chance. A finished attempt earns 10 plus 5 per cleared height. Escape pauses the run-up and jump.</p>',
    };
    openModal(`<div class="eyebrow">THE NEIGHBORHOOD RULEBOOK</div><h2 id="modal-title">Tara, ${GAMES[selectedGame].title}!</h2>${pages[selectedGame]}<button id="guide-close" class="primary-button">Got it. Let’s play.</button>`);
    $('#guide-close').onclick = closeModal;
    return;
  }
  openModal(`<div class="eyebrow">THE NEIGHBORHOOD RULEBOOK</div><h2 id="modal-title">Tara, Patintero!</h2><p>A childhood classic: runners cross a chalk court while guards defend its lines. This is a solo practice adaptation.</p><ol class="rules-list"><li><strong>Get across.</strong> Reach the green strip at the top of the court.</li><li><strong>Make it home.</strong> Turn around and reach the bottom strip to win.</li><li><strong>Watch the guards.</strong> Three move across horizontal lines; one guards the center line.</li><li><strong>You have three chances.</strong> A tag sends you home and resets your crossing. The clock keeps ticking.</li></ol><div class="guide-keys"><span><kbd>WASD</kbd> / <kbd>↑ ↓ ← →</kbd> Move</span><span><kbd>SHIFT</kbd> Sprint · uses energy</span><span>Click or tap the ground to walk</span><span><kbd>SPACE</kbd> Wave · <kbd>ESC</kbd> Pause</span></div><p class="fine-print">A full trip earns 50 coins + 10 for each remaining chance. A finished practice attempt earns 10 coins. Leaving early earns none.</p><button id="guide-close" class="primary-button">Got it. Let’s play.</button>`);
  $('#guide-close').onclick = closeModal;
}
$('#guide-button').onclick = guide; $('#rules-button').onclick = guide;
$('#avatar-button').onclick = () => {
  openModal(`<div class="eyebrow">A FAMILIAR FACE</div><h2 id="modal-title">Make yourself at home.</h2><form id="avatar-form"><label class="field-label" for="nickname">YOUR NICKNAME</label><input id="nickname" maxlength="16" required autocomplete="nickname" /><fieldset class="avatar-genders"><legend class="field-label">YOUR CHARACTER</legend>${(['boy', 'girl'] as const).map(gender => `<button type="button" class="avatar-choice" data-avatar-gender="${gender}" aria-pressed="${profile.gender === gender}"><canvas aria-hidden="true"></canvas><span>${gender === 'boy' ? 'Boy' : 'Girl'}</span></button>`).join('')}</fieldset><span class="field-label">YOUR FAVORITE SHIRT</span><div class="swatches">${COLORS.map((color, index) => `<button type="button" class="swatch ${profile.color === index ? 'selected' : ''}" data-color="${index}" style="--swatch:${color}" aria-label="${['Sunflower', 'Ocean', 'Guava', 'Calamansi'][index]} shirt" aria-pressed="${profile.color === index}"><canvas aria-hidden="true"></canvas></button>`).join('')}</div><button class="primary-button" type="submit">Save my avatar ${icon('arrow')}</button></form><div id="wardrobe-host"></div>`);
  $<HTMLInputElement>('#nickname').value = profile.name;
  let selected = profile.color, gender: AvatarGender = profile.gender;
  const repaint = () => {
    document.querySelectorAll<HTMLButtonElement>('button[data-avatar-gender]').forEach(button => { const value = button.dataset.avatarGender as AvatarGender; button.classList.toggle('selected', value === gender); button.setAttribute('aria-pressed', String(value === gender)); paintCharacterPreview(button.querySelector('canvas')!, value, COLORS[selected], 0, 0, profile.wardrobe.equipped); });
    document.querySelectorAll<HTMLButtonElement>('[data-color]').forEach(button => { const color = Number(button.dataset.color); button.classList.toggle('selected', color === selected); button.setAttribute('aria-pressed', String(color === selected)); paintCharacterPreview(button.querySelector('canvas')!, gender, COLORS[color], 0, 0, profile.wardrobe.equipped); });
  };
  document.querySelectorAll<HTMLButtonElement>('button[data-avatar-gender]').forEach(button => { button.onclick = () => { gender = button.dataset.avatarGender as AvatarGender; repaint(); }; });
  document.querySelectorAll<HTMLButtonElement>('[data-color]').forEach(button => { button.onclick = () => { selected = Number(button.dataset.color); repaint(); }; });
  repaint();
  mountWardrobe($('#wardrobe-host'), profile, () => { const saved = persist(); scene.updateAvatar(); repaint(); return saved; });
  $('#avatar-form').onsubmit = event => { event.preventDefault(); const name = $<HTMLInputElement>('#nickname').value.trim(); if (!name) { $<HTMLInputElement>('#nickname').setCustomValidity('Please enter a nickname.'); $<HTMLInputElement>('#nickname').reportValidity(); return; } profile.name = name; profile.color = selected; profile.gender = gender; persist(); scene.updateAvatar(); closeModal(); toast('Looking good! Your avatar is saved.'); };
  $('#nickname').oninput = () => $<HTMLInputElement>('#nickname').setCustomValidity('');
};
$('#settings-button').onclick = () => {
  openModal(`<div class="eyebrow">JUST THE WAY YOU LIKE IT</div><h2 id="modal-title">A little fine-tuning.</h2><label class="setting-row" for="difficulty">Street games<select id="difficulty"><option value="easy">Easy · learn the rhythm</option><option value="normal">Normal · a real challenge</option><option value="hard">Hard · quick and precise</option></select></label><label class="setting-row" for="settings-dama-difficulty">Dama opponent<select id="settings-dama-difficulty">${damaOptions()}</select></label><label class="setting-row" for="sound-enabled">Game sounds<input id="sound-enabled" type="checkbox" ${profile.muted ? '' : 'checked'} /></label><label class="setting-row" for="vibration-enabled">Failure vibrations<input id="vibration-enabled" type="checkbox" ${profile.vibration ? 'checked' : ''} /></label><p class="fine-print">Vibration depends on your device and browser.</p><p class="fine-print">Dama, Tagu-taguan, and jumping difficulty changes apply to new matches. Saved Dama matches keep their opponent. Higher street-game difficulties earn more coins.</p><button id="save-settings" class="primary-button">All set</button><div id="save-tools"></div>`);
  mountSaveTools($('#save-tools'), profile, () => scene.active === 'hub', () => { persist(); scene.updateAvatar(); closeModal(); toast('Progress restored: coins, clothes, avatar, records, and saved Dama match.'); });
  $<HTMLSelectElement>('#difficulty').value = profile.difficulty;
  $<HTMLSelectElement>('#settings-dama-difficulty').value = profile.damaDifficulty;
  $('#save-settings').onclick = () => { const level = $<HTMLSelectElement>('#difficulty').value; profile.difficulty = level === 'hard' ? 'hard' : level === 'normal' ? 'normal' : 'easy'; const damaLevel = $<HTMLSelectElement>('#settings-dama-difficulty').value; if (isDamaDifficulty(damaLevel)) profile.damaDifficulty = damaLevel; profile.vibration = $<HTMLInputElement>('#vibration-enabled').checked; profile.muted = !$<HTMLInputElement>('#sound-enabled').checked; persist(); closeModal(); };
};
$('#quick-settings').onclick = () => ['piko', 'tumbang', 'chess'].includes(selectedGame) ? setupGame(selectedGame) : selectedGame === 'jolen' ? setupGame('jolen') : $('#settings-button').click();
$('#about-button').onclick = () => {
  openModal(`<div class="eyebrow">ROOTED IN FILIPINO PLAY</div><h2 id="modal-title">About LARO</h2><div class="tphilo-logo about-logo"><img src="./tphilo-mark.svg" alt="tphilo games emblem" width="70" height="70" /><div class="tphilo-wordmark">tphilo<span>games</span></div></div><div class="about-credits"><strong>tphilo games</strong><p>developed by Sab</p><p id="about-version">Version ${GAME_VERSION}</p><p>Six neighborhood classics and two hidden pocket games. Made for one more round.</p><p class="fine-print">Offline edition · Progress is saved on this device.</p></div><button id="about-close" class="primary-button">Back to playing</button>`);
  $('#about-close').onclick = closeModal;
};
function resume() { paused = false; scene.setPaused(false); $('#pause-button').setAttribute('aria-label', 'Pause game'); closeModal(); }
function pause() {
  if (dialog.open || $('#game').dataset.ready !== 'true') return;
  paused = true; scene.setPaused(true); $('#pause-button').setAttribute('aria-label', 'Resume game');
  openModal('<div class="eyebrow">SANDALI LANG</div><h2 id="modal-title">Take your time.</h2><p>The neighborhood can wait. Your round is paused.</p><button id="resume-button" class="primary-button">Back to playing →</button>');
  $('#resume-button').onclick = resume; $('#close-modal').onclick = resume;
  dialog.addEventListener('close', () => { paused = false; scene.setPaused(false); $('#close-modal').onclick = closeModal; $('#pause-button').setAttribute('aria-label', 'Pause game'); }, { once: true });
}
$('#pause-button').onclick = () => paused ? resume() : pause();
document.addEventListener('visibilitychange', () => { if (document.hidden && !dialog.open) pause(); });
const playScreen = new PlayScreen($('#game-display'), $('#fullscreen-button'), () => { scene.resetInput(); fitGameViewport(game); }, open => { screenMenuOpen = open; scene.resetInput(); });
$('#play-menu').onclick = () => playScreen.toggleMenu();
$('#fullscreen-button').onclick = () => { void playScreen.toggle(); };
$('#exit-play-screen').onclick = () => { void playScreen.exit(); };
document.querySelectorAll<HTMLButtonElement>('[data-screen-nav]').forEach(button => { button.onclick = () => { playScreen.closeMenu(); $<HTMLButtonElement>(`#${button.dataset.screenNav}`).click(); }; });
const touchPad = new TouchPad($('#touch-pad'), (x, y) => scene.setTouch(x, y));
$('#touch-run').onpointerdown = event => { event.preventDefault(); $('#touch-run').setPointerCapture(event.pointerId); $('#touch-run').classList.add('held'); scene.setSprint(true); };
const stopTakbo = () => { $('#touch-run').classList.remove('held'); scene.setSprint(false); };
$('#touch-run').onpointerup = stopTakbo; $('#touch-run').onpointercancel = stopTakbo; $('#touch-run').onlostpointercapture = stopTakbo;
window.addEventListener('blur', () => { touchPad.reset(); document.querySelectorAll('.held').forEach(button => button.classList.remove('held')); scene.resetInput(); });
refreshProfile();

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register('./sw.js').then(async registration => {
      await navigator.serviceWorker.ready;
      if (registration.active) $('#save-status').textContent = storageAvailable ? 'Saved locally · ready to play offline' : 'Offline ready · progress saving unavailable';
    }).catch(() => { $('#save-status').textContent = 'Local play ready · offline cache unavailable'; });
  });
}
