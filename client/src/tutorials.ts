import type { GameId } from './games/types';

export type TutorialStep = { title: string; text: string; keys: string };
export const TUTORIALS: Record<GameId, TutorialStep[]> = {
  piko: [
    { title: 'Toss the pamato', text: 'Tap the numbered target to aim. Start the meter, then release when it reaches the gold zone. The pamato must land inside the chalk square.', keys: 'Tap to aim · Space or Toss' },
    { title: 'One square, one foot. Two squares, two feet.', text: 'Skip the pamato square. A single highlighted square needs One foot. A highlighted pair needs the blue Two feet button. If the pamato occupies half a pair, use one foot.', keys: 'Gold: One foot / Space · Blue: Two feet / D' },
    { title: 'Land in the gold zone', text: 'Start hopping when you are ready. Time each landing in the gold zone; the next landing lights up after your jump. Go out and back. Three mistakes end the game.', keys: 'Watch the meter, then choose your feet' },
  ],
  tumbang: [
    { title: 'Aim and knock the can down', text: 'Tap to aim or use the direction slider. Start the power meter, then tap Throw. Easy shows a full guide, Normal half, and Hard one eighth. More power sends your tsinelas farther.', keys: 'Tap / aim slider · Space to throw' },
    { title: 'Walk, pick up, or put down', text: 'Use WASD, arrows, the touch pad, or tap the ground to choose a route. Stand near your tsinelas and choose Pick up. Put it down any time to stop the guard. The guard moves only while the thrower holds it.', keys: 'Move freely · E / Pick up / Put down' },
    { title: 'Race to three points', text: 'Knock the can down and bring the tsinelas behind the line for one point. The guard must reset the can before tagging outside the safe line. Alternate roles with Eric; the first to three points wins.', keys: 'Hold = guard moves · Put down = guard stops' },
  ],
  chess: [
    { title: 'You play the ivory pieces', text: 'White starts at the bottom and moves first. Tap a piece, then one of its highlighted destinations. Ivory and dark green drawings stay distinct on phones.', keys: 'Tap a piece, then a highlighted square' },
    { title: 'Protect your king', text: 'Moves that leave your king in check are blocked. Pawns advance forward and capture diagonally; a pawn reaching the far edge can become a queen, rook, bishop, or knight.', keys: 'The turn label tells you when you are in check' },
    { title: 'Finish with checkmate', text: 'Trap the opposing king to win. Castling and en passant follow normal chess rules. Stalemate and the listed draw conditions end the match. Pass-and-play is a friendly mode.', keys: 'Bot or two players at the Dama table' },
  ],
  dama: [
    { title: 'Choose a gold piece', text: 'Gold moves first. Select a piece and then a highlighted diagonal destination. Ordinary pieces step forward; kings travel along clear diagonals.', keys: 'Tap a piece, then a highlighted square' },
    { title: 'Take the longest capture', text: 'Captures are required. Choose a route that captures the most pieces and finish every jump with the same piece. Ordinary pieces can capture backward too.', keys: 'Follow the glowing capture route' },
    { title: 'Become a king and win the table', text: 'End a turn on the far rank to crown your piece. Win when the opponent has no pieces or legal moves. Your unfinished Dama match saves automatically.', keys: 'Gold starts · Bot or pass-and-play' },
  ],
  patintero: [
    { title: 'Read the crossing', text: 'Four guards move along the chalk lines. Start at the bottom of the court and look for a gap before crossing a line.', keys: 'WASD / arrows · touch pad · tap a destination' },
    { title: 'Cross, then come home', text: 'Reach the far checkpoint before returning to the starting side. A tag sends you back and costs a heart; three tags or the timer ends the round.', keys: 'Cross every line and return safely' },
    { title: 'Save your sprint for a gap', text: 'Hold Shift or Takbo for a short sprint. The sprint bar recovers when you slow down. Pause whenever you need a break.', keys: 'Shift / Takbo · Escape / Pause' },
  ],
  taguan: [
    { title: 'Find cover while Audrey counts', text: 'Move behind walls, crates, bamboo, laundry, or hedges during the countdown. A real obstacle between you and the seeker helps break sight.', keys: 'Move with arrows / WASD / touch pad' },
    { title: 'Crouch and break sight', text: 'Use Crouch to move quietly. Crouching in the open does not hide you. Sprinting makes noise; watch the awareness indicator and change hiding places.', keys: 'E / Crouch · Shift / Takbo' },
    { title: 'Survive the search', text: 'Audrey investigates what she sees and hears. If spotted, turn a corner and break her line of sight. Survive the search timer to win.', keys: 'Keep an escape route · Escape pauses' },
  ],
  tinik: [
    { title: 'Watch the run-up', text: 'Your character runs automatically toward the hands-and-feet obstacle. The takeoff position and speed change at each height.', keys: 'Watch your feet approach the marked zone' },
    { title: 'Jump at the right moment', text: 'Tap Jump or press Space as your feet reach the takeoff zone. One press makes one jump. An early or late takeoff can touch the obstacle.', keys: 'Jump / Space' },
    { title: 'Clear six heights', text: 'Land safely to raise the obstacle. Challenge gives three chances. Practice gives unlimited retries without coins or records.', keys: 'Choose Practice to learn the timing' },
  ],
  lubid: [
    { title: 'Watch the rope approach your feet', text: 'Weng and Ferdie turn the rope. Tap Jump, the court, or Space to start a jump immediately.', keys: 'Tap court / Jump / Space' },
    { title: 'One tap, one jump', text: 'Holding the button does not repeat jumps. Tap just before the rope reaches your feet. A well-timed tap near landing can queue your next jump.', keys: 'Listen or watch for the rope rhythm' },
    { title: 'Keep going or collect early', text: 'The rope gets faster up to a limit and changes rhythm after 50 clears. Three hits end the run. Finish lets you collect early; rewards cap at 100 coins.', keys: 'Finish to collect · Escape pauses' },
  ],
  jolen: [
    { title: 'Aim from your shooter marble', text: 'Tap or drag on the dirt court, or use the aim slider. Knock the fifteen small marbles completely outside the chalk circle to collect them.', keys: 'Tap / drag / aim slider' },
    { title: 'Time the fast power meter', text: 'Tap Tira to start the power bar. Tap again to release the shot. You and the bot alternate shots; your shooter stays where it lands.', keys: 'Tira, then Tira again · Space also works' },
    { title: 'Collect more than your neighbor', text: 'Most marbles wins. From Normal onward, a direct hit that knocks the opposing shooter into the hole wins immediately. Pause freezes aiming and motion.', keys: 'Aim carefully near the hole' },
  ],
  snake: [
    { title: 'Start the pocket game', text: 'Tap the green screen or press Enter to begin. In normal view, the phone also has a Start key.', keys: 'Tap screen / Enter' },
    { title: 'Eat, grow, and turn', text: 'Use arrows, WASD, swipes, or the directional pad. Eat food to grow. Edges wrap around; reversing straight into yourself is not allowed.', keys: 'Arrows / WASD / swipe / pad' },
    { title: 'Avoid your own tail', text: 'The snake gets faster as it grows. Your high score and earned coins save after a finished game. Find the phone again for another session.', keys: 'Escape / Pause · no reward for leaving early' },
  ],
  impact: [
    { title: 'Launch Orbit Patrol', text: 'Tap the green screen or press Enter to begin. You have three lives; escaped enemies and collisions cost a life.', keys: 'Tap screen / Enter' },
    { title: 'Move and fire together', text: 'Move with the left directional pad, WASD, or arrows. Hold Fire or Space with your other hand to shoot while dodging.', keys: 'Left pad + hold Fire · WASD + Space' },
    { title: 'Defeat the boss and loop', text: 'A boss arrives after each wave. Dodge its shots and keep firing. Defeating it restores a life, up to three, and starts another wave.', keys: 'Move + fire · Escape pauses' },
  ],
};

export function tutorialIllustration(id: GameId, step: number): string {
  const kid = (x: number, y: number, color = '#e9bf73') => `<g transform="translate(${x} ${y})"><circle cy="-24" r="10" fill="#dda97c"/><path d="M-10-28v-6h20v6" fill="#33483a"/><path d="M-12-14h24v22h-24z" fill="${color}"/><path d="M-7 8v13m14-13v13" stroke="#264b3d" stroke-width="7"/></g>`;
  const arrow = '<path d="M310 110h70m-18-14 18 14-18 14" fill="none" stroke="#f2c46d" stroke-width="5"/>';
  let art = '';
  if (id === 'piko') art = `<g fill="#b8ae84" stroke="#fff0c8" stroke-width="3"><path d="M190 40h70v40h-70zm-35 40h70v40h-70zm70 0h70v40h-70zm-35 40h70v40h-70z"/><path d="M190 160h70v40h-70z" fill="#e5c575"/></g><ellipse cx="225" cy="60" rx="9" ry="6" fill="#a36c5d"/>${kid(225, 180)}<rect x="20" y="155" width="125" height="38" rx="6" fill="#ecc47c"/><rect x="315" y="155" width="145" height="38" rx="6" fill="#76b9c4"/><text x="82" y="180">ONE FOOT</text><text x="388" y="180">TWO FEET</text>`;
  else if (id === 'tumbang') art = `<path d="M30 185h420" stroke="#fff0c8" stroke-width="4"/><path d="M225 48h30v47h-30z" fill="#c3cdb6" stroke="#385545" stroke-width="2"/><path d="M225 64h30v16h-30" fill="#ca855d"/>${kid(130, 155)}${kid(340, 80, '#83b5bd')}<path d="m145 130 75-42" stroke="#9a724e" stroke-dasharray="8 7" stroke-width="3"/><path d="M167 120h13v25h-13z" fill="#83b5bd"/><text x="240" y="220">${step === 0 ? 'AIM → THROW' : step === 1 ? 'HOLD: GUARD MOVES · DROP: GUARD STOPS' : 'FIRST TO 3 POINTS'}</text>`;
  else if (id === 'dama' || id === 'chess') {
    art = '<g transform="translate(135 15)">';
    for (let r = 0; r < 6; r++) for (let f = 0; f < 6; f++) art += `<rect x="${f * 35}" y="${r * 35}" width="35" height="35" fill="${(r + f) % 2 ? '#6e8968' : '#e4cfa0'}"/>`;
    art += `<circle cx="52" cy="157" r="12" fill="#fff4d5" stroke="#294b3a" stroke-width="2"/><circle cx="157" cy="52" r="12" fill="#17372f" stroke="#ebcf96" stroke-width="2"/><path d="m65 145 37-37m-15 0h15v15" stroke="#e6aa42" stroke-width="5" fill="none"/></g>`;
  } else if (id === 'patintero') art = `<g fill="none" stroke="#fff0c8" stroke-width="3"><path d="M80 30h320v170H80zM80 85h320M80 140h320M240 30v170"/></g>${kid(155, 168)}${kid(285, 70, '#7db4b5')}${arrow}`;
  else if (id === 'taguan') art = `<rect x="100" y="45" width="125" height="125" fill="#b58f68"/><path d="M90 45 160 10l75 35" fill="#9f6956"/>${kid(260, 150)}${kid(375, 90, '#83b5bd')}<path d="m355 100-70 55" stroke="#f0c778" stroke-width="3" stroke-dasharray="6 6"/><path d="M315 150h-55v-55" fill="none" stroke="#fff0c8" stroke-width="4"/>`;
  else if (id === 'tinik' || id === 'lubid') art = `<path d="M35 195h410" stroke="#fff0c8" stroke-width="3"/>${kid(110, 158)}${kid(340, 158, '#83b5bd')}${kid(230, 83)}<path d="${id === 'lubid' ? 'M110 155Q230 255 340 155' : 'M175 155h110m-100-20h90m-75-20h60'}" stroke="#b68e58" stroke-width="7" fill="none"/><path d="M180 90q45-100 95 0" stroke="#edc478" stroke-width="3" fill="none"/>`;
  else if (id === 'jolen') art = `<circle cx="245" cy="113" r="87" stroke="#fff0c8" stroke-width="4" fill="#b8a17b"/><g fill="#87bbb4" stroke="#39583f" stroke-width="2"><circle cx="220" cy="90" r="12"/><circle cx="260" cy="130" r="12"/><circle cx="277" cy="87" r="12"/></g><circle cx="105" cy="170" r="19" fill="#ebbf73"/><path d="m125 165 80-55" stroke="#705f42" stroke-width="3" stroke-dasharray="6 6"/>${arrow}`;
  else if (id === 'snake') art = `<rect x="90" y="28" width="300" height="175" fill="#a8b87c"/><path d="M145 145h100V85h50" fill="none" stroke="#284529" stroke-width="18"/><rect x="330" y="80" width="15" height="15" fill="#284529"/>`;
  else art = `<rect x="60" y="25" width="360" height="180" fill="#a8b87c"/><path d="m125 115 35-15v30z" fill="#284529"/><path d="M195 115h35m20 0h35" stroke="#284529" stroke-width="5"/><path d="M340 90h25v45h-25z" fill="#284529"/>`;
  return `<svg class="tutorial-picture" viewBox="0 0 480 240" role="img" aria-label="${TUTORIALS[id][step].title}"><rect width="480" height="240" rx="12" fill="#8ca37a"/><g font-family="monospace" font-size="13" text-anchor="middle" fill="#263f30">${art}</g></svg>`;
}
