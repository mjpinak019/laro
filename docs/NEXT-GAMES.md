# LARO: neighborhood game designs

## Jolen circle game (implemented in alpha 0.7)

The circle variant replaces the earlier hole-in proposal. Fifteen targets
start inside a chalk circle. The player and bot take alternating shots with
their own larger shooter marbles. A target scores once its entire body exits
the circle. Shooters never score; their resting positions persist across
turns, and either shooter may move the other through collision. Characters
walk beside their shooter before aiming. Only leaving the rectangular dirt
court re-spots a shooter at the nearest edge. Collect all fifteen to end the
match; most collected wins.

Aim with a pointer or direction slider, then tap Tira to start a triangular
power meter that rises in 600 milliseconds. Tap again to lock strength and
release. Cancel returns to aiming. Bot shots show their aim, power timing,
rolling, and collisions. All movement pauses in dialogs or when the game is
paused. Fixed-step physics is shared with bot planning. Jolen uses its own
five difficulty levels and keeps the other street-game settings unchanged.

The dirt circle is beside the schoolyard. Weng is a new girl character;
Amor keeps her existing appearance and location. Cosmetic marble shops,
additional courts, and pass-and-play are future extensions.

## Earlier three-game milestone

Status: the first offline milestones are implemented in alpha 0.2: Dama
with a bot and pass-and-play, Tagu-taguan as a hider against a seeker bot,
and the six-height Luksong-tinik challenge with practice mode.
This document retains the original design direction; sections explicitly
marked later or future remain proposals. Dama practice undo, human-seeker
mode, and the save-sa-poste variant are not in the current build.
Round lengths, scoring, and difficulty values below are starting points
for playtesting rather than final balance decisions.

## Direction for the collection

Keep LARO's pixel-art barangay, human neighborhood characters, warm colors,
and modern movement. Each game should feel like another activity in the
same neighborhood. Patintero occupies the court; Tagu-taguan starts in the
alley; Luksong-tinik uses the schoolyard; Dama lives at a table beside the
sari-sari store.

Use Boomerang Fu as a reference for compact arenas, simple controls, short
rounds, immediate feedback, and quick rematches. Those qualities appear in
the developer's [official description](https://www.boomerangfu.com/).
LARO keeps its own characters, maps, pixel art, and game rules. The requested
Tagu-taguan concept has no transformation, prop disguise, or boomerang.

| Game | Main feeling | View | First offline mode | Relative effort |
| --- | --- | --- | --- | --- |
| Dama | A thoughtful match at the neighborhood table | Top-down board | Human vs bot; two people sharing the device | Lowest for a basic playable version |
| Tagu-taguan | Suspense, a narrow escape, then laughter | Slightly angled top-down arena | Human hider vs seeker bot | Highest: visibility, navigation, and fair AI |
| Luksong-tinik | Timing a jump and clearing one more height | Side view of the schoolyard | Solo height challenge with bot presenters | Medium: animation, timing, and clearance |

Recommended implementation order: Dama, Tagu-taguan, Luksong-tinik.
If the priority is a more exciting movement game, move Tagu-taguan ahead
of Dama; it is the stronger party-game expansion but the larger task.

## Tagu-taguan: “Huli ka!”

### The experience

The neighborhood is settling into late afternoon. A friend counts at the
poste while you slip behind the sari-sari store. The seeker rounds a
tricycle, spots you briefly, and gives chase. You duck around a wall,
break sight, and quietly move to another hiding place.

The player remains their normal avatar throughout. Hiding comes from real
cover, blocked sightlines, and quiet movement. A readable daytime palette
supports the atmosphere without requiring a dark screen.

### First playable loop

1. Enter a compact alley map with one seeker bot.
2. During a 10-second countdown, choose a hiding route. The seeker does not
   receive your location or path while counting.
3. Survive a 75-second search. The seeker patrols, notices visible movement,
   checks hiding places, and investigates sounds.
4. Being spotted starts a chase. Being spotted alone does not count as a
   catch: the seeker must make contact without an obstacle between you.
5. Break sight to escape. The seeker searches around the last place it saw
   you, rather than following your hidden position.
6. Survive until time runs out to win. A catch ends the solo round
   immediately, with a quick retry and no spectator wait.

Start with a single human hider and one seeker bot. After that is enjoyable,
add a human-seeker mode against three bot hiders. Later party modes can
rotate roles across short heats.

### Controls and feedback

- Move with WASD/arrows or touch controls.
- Hold Run for a brief sprint. It consumes energy and produces more noise.
- Toggle Crouch with E or a touch button. It reduces speed and noise;
  crouching alone does not hide you in an open area.
- A small awareness indicator progresses from unnoticed to suspicious to
  spotted. Easy mode can also show the seeker's sight cone.
- A fully concealed player sees a faint outline of their own avatar and a
  clear “Hidden” label. A seeker cannot see hidden opponents' name tags,
  shadows, or outlines through cover.
- Footstep and suspicion effects have visual equivalents, so sound is
  useful without being required.

### Arena concept

Use one screen-sized map with two connected loops and multiple exits from
each hiding area. A short dead end can offer a risky hiding spot, but it
should be visually obvious. Avoid a single unbeatable bush or narrow
passage that lets a player circle forever.

```text
          REAR PASSAGE / SECOND ESCAPE ROUTE
     +-------------------+-------------------+
     | Sari-sari store   | Laundry courtyard |
     | blocks sight      | partial cover     |
     +------ gap --------+------ gap --------+
     | Tricycle + crates | Open plaza        |
     | short cover loop  | poste / start     |
     +------ gap --------+------ gap --------+
     | Garden / shrubs   | Side alley        |
     +-------------------+-------------------+
```

Solid walls block movement and sight. Shrubs provide concealment with
clearly marked edges; entering cover while visibly chased should not
instantly erase the seeker's memory. Decorative foreground props fade
when they would obscure the controlled avatar.

### Fair seeker AI

Use the states Count, Patrol, Investigate, Chase, and Search last seen.
Navigation uses the same blocked areas as the player. The bot receives
only visible targets, approximate sound events, and remembered locations.
Difficulty changes reaction delay, search thoroughness, and movement
skill; it does not grant sight through walls.

Search should cover the map over time, which pressures a camping player
to relocate without revealing their exact position. Remember recently
checked spots and break repeated patrol loops. A chase ends after a short
period without visual contact, followed by a local search.

### Later variant: “Save sa poste”

Once the hiding/chasing loop works, add a base-race variant as a named
LARO rule option. In the final 20 seconds, the poste becomes a safe exit.
Reaching it before being caught secures a win. Give the seeker patrol
objectives away from the base and test for base-camping exploits.
Keep this separate from the first survival mode so the rules remain easy
to learn. Traditional neighborhood rules vary; this is an explicit digital
adaptation, not a claim to one universal Taguan ruleset.

### First milestone and checks

One finished arena, one fair seeker, cover and visibility, countdown,
chase/escape, win/loss, pause, touch controls, and local scores. Test wall
occlusion, corner tags, hidden labels, bot navigation, and repeated rounds.
Track survival time and wins separately from Patintero records.

## Luksong-tinik: “Isa pang taas!”

### The experience

Enter a schoolyard with two seated neighborhood kids building the tinik
from their feet and hands. Your avatar takes a short run-up and jumps.
Clear it and they add another hand; brush it and you stumble, recover, and
try again. The human obstacle is central to its identity: it should not
look like a generic platformer with spikes.

The feet-and-hands obstacle is depicted in the Boy Scouts of the Philippines'
[Young Usa handbook](https://scouts.gov.ph/wp-content/uploads/2024/07/Young-Usa-Handbook.pdf).
The gameplay below is LARO's proposed solo adaptation.

### View and input

Use a side-view mini-game inside the existing LARO interface. The hub stays
top-down. A side view makes the jump arc and obstacle height much clearer
than trying to infer height from a top-down sprite overlap.

Start with an automatic short run-up and one Jump button (Space or touch).
The player chooses the takeoff moment. Each height has a predictable
run-up, jump arc, and generous readable takeoff zone. Higher stages narrow
the timing window and raise the obstacle gradually. Avoid button mashing
and avoid a jump whose outcome is just a hidden dice roll.

Only add a held-charge jump later if timing alone needs more depth. Do not
require both a power-meter input and a separate timing input in the first
version.

### First playable loop

1. Demonstrate the first low obstacle and explain the takeoff zone.
2. Begin the short run-up; the player presses Jump at the chosen moment.
3. Check the avatar's actual arc and body clearance at the obstacle.
4. On success, animate the landing and raise the obstacle one level.
5. On contact, spend one of three chances and replay the current height.
6. Clear six initial heights to complete the challenge, or finish when all
   three chances are spent. A practice option can offer unlimited retries.

Show helpful feedback: “Jump a little earlier” or “A little later,” with a
brief replay marker. Store best height and clean clears; define the height
as a game level rather than an unsupported real-world measurement.

### Polish and effort

Use anticipation, a clear airborne silhouette, a shrinking ground shadow,
landing dust, and cheering neighbors. Two seated characters need several
distinct feet/hand poses. Collision must follow the visible body and tinik,
not just a large rectangular sprite boundary. Support jump input buffering
and a small timing tolerance so the result feels fair.

The basic loop is smaller than Tagu-taguan, but its appeal depends heavily
on animation and feedback. A later team mode can explore role switching
and a captain/save rule after choosing the neighborhood rules to model.

## Dama: “Sa tabi ng tindahan”

### The experience

Walk to a wooden table beside the sari-sari store and choose an opponent.
The board becomes the main view, with the two neighborhood avatars at its
edges. Warm wood, contrasting pieces, clear move highlights, and small
slide/capture sounds make this feel like part of the barangay.

The basic playable board is the smallest of these three additions because
it does not require real-time movement, pathfinding, or network timing.
A strong bot and a correct rules engine still require deliberate work.

### Offline modes and interface

- Human versus a bot, starting with Easy and Normal.
- Two people passing the same device. This is offline local play.
- Tap/click a piece to show legal destinations, then choose a destination.
- Highlight mandatory captures and the continuation of a capture chain.
- Show whose turn it is, the last move, piece counts, and king status.
- Explain why a selected move is unavailable; do not silently ignore it.
- Offer restart, resign, pause/leave, and a local saved unfinished match.
- Offer undo in practice mode; competitive records exclude practice games.

### Proposed rules contract

Use a clearly labeled Filipino-style LARO preset, and settle its precise
rules before implementation. This is a proposed product specification,
not a declaration that every Filipino household plays identically.

| Item | Proposed LARO preset |
| --- | --- |
| Board | 8 by 8; 12 pieces per player on alternating playable squares |
| Ordinary movement | One diagonal step forward into an empty square |
| Ordinary captures | Diagonal jumps forward or backward |
| Required captures | Mandatory; choose a sequence capturing the most pieces |
| Multiple jumps | Complete the selected legal capture sequence |
| Kings | Flying kings, moving along clear diagonals in either direction |
| King captures | One opposing piece per diagonal jump, with legal empty landing squares beyond it |
| Promotion | At the end of a move/capture sequence if the piece ends on the far rank |
| Win | Opponent has no pieces or no legal moves |
| Draw | Threefold repetition, or 40 full moves without a capture or ordinary-piece move; these are explicit LARO defaults |

If the user's familiar Dama rules differ, change the preset explicitly.
Do not silently combine forward-only English-checkers men with flying
kings or switch capture priority halfway through implementation.
Board orientation, capture removal during chains, equal-length choices,
and promotion behavior need written examples in the final rules spec.

### Bot and first milestone

Build and test legal moves before making the bot clever. Easy can select
from valid moves with simple capture and safety preferences. Normal can
look ahead through a bounded game-tree search. Both use the exact same
legal-move generator as the human player, including complete capture
chains. Run longer searches outside the rendering thread and cap thinking
time so the board remains responsive.

First milestone: a full legal match, clear highlights, promotion and
captures, basic bot, same-device two-player mode, win/loss/draw, rematch,
and local match resume. Validate edge cases with small board positions:
backward captures, alternative king landings, mandatory longest chains,
blocked players, promotion, and repeated positions.

## Shared work before expanding

Keep the current offline-first approach. No new engine, account service,
database, or paid tool is needed for these concepts.

Introduce a game selector and separate game scenes rather than expanding
one scene into all four games. Share avatars, settings, pause/result UI,
audio, and input conventions. Give each game its own rules and records:
Patintero best time, Tagu-taguan survival, Luksong-tinik highest clear, and
Dama match outcomes. Preserve existing coins and records when adding the
new save format. Keep unfinished matches separate from completed rewards.

Continue bundling all assets locally and test disconnected reload for each
new game. Future online support can build on these clean rules, but it is
not part of the initial offline milestones.


## Alpha 0.3 expansion

Implemented a scrolling 1600 by 1000 barangay with an interactive Dama table,
a schoolyard entrance for Luksong-tinik, a garden entrance for Tagu-taguan,
and a minimap. Easy, Normal, and Hard apply across the games. Tagu-taguan
now has seven cover areas plus solid crates and barrels, with stronger
perception, search, and pursuit at higher settings. Luksong-tinik varies
run-up speed, obstacle height, and position; all eighteen stage/difficulty
combinations have verified takeoff windows. Hard reduces the visual guide
after height two, while Practice keeps it visible.
