# MOLLY - a kid-friendly spooky 3D game

Open `index.html` in Chrome (double-click works, no server, no internet needed).
Click **Start**, then click the game to capture the mouse.

**Controls:** W A S D / arrow keys walk (Shift = hurry), mouse looks, **E** or click uses things,
**H** hint, **M** sound on/off, **Esc** pause. Piano: click keys or press 1-7.

Debug: open `index.html?debug` -> shows fps/creep, and `window.__molly` can jump around
(`__molly.startLevel(4)`, `__molly.teleport(x,z,yaw)`, `__molly.setCreep(0.8)`, `__molly.solve()` (finishes the current level), `__molly.scare()`).
More hooks: `__molly.settle()` (jump the creepy look to its final value right now), `__molly.dread()` (current dread `k`), `__molly.setScale(v)` (try a `CREEP_SCALE` live), `__molly.run('lightsOut')` (play a scripted scare: `lightsOut`, `fakeOut`, `eyes`, `mirrorWrite`, `hallLights`, `dolls`), `__molly.glitch()`, `__molly.api().openSecret()` (open this level's secret door), `__molly.secrets()` / `__molly.resetSecrets()`.

## Files
- `index.html`, `style.css` - page, HUD, menus
- `audio.js` - all sounds + music (WebAudio, nothing to download)
- `build.js` - procedural canvas textures, materials, geometry helpers, `B.bake` (merges meshes to few draw calls)
- `realistic.js` - photographic textures (`Tex.*`), PBR materials (`Mat.*`), reflection environment; falls back to the old procedural look if `img/textures.js` is missing
- `img/textures.js` - embedded JPEG textures as data URIs (`window.TEX`), so no loader/CORS problems from `file://`
- `models.js` - Molly doll, Mom, furniture, toys and props (loaded after build.js)
- `dread.js` - everything that makes it creepier as the creep level rises (post-processing grade, dying lights, portraits, writing on walls, Molly peeking, scripted scares, sounds); loaded after `game.js`
- `secrets.js` - hidden rooms, golden buttons, squeaky toys, the B-O-N-K key combo, the 'Secrets x/5' counter (see **Secrets** below)
- `game.js` - engine: walking, collisions, creep system, Molly AI, jumpscare, save, level loading
- `levels/intro.js` (toy store), `level1.js` (house), `level2.js` (factory), `level3.js` (mirror maze), `level4.js` (the school), `ending.js`

## How the scary part works
`G.creep` goes from 0 (cozy) to 1 (very spooky). It rises with time and with puzzle progress.
It drives fog, light flicker, colours, sounds, how often Molly moves and how close she gets.
Molly only moves when she is NOT on screen. After a grace period she starts walking closer; if you keep
looking at her she freezes, and after a few seconds she gives up and vanishes. If she reaches you: jumpscare + restart level.

## The creepier part (dread.js) - and the `CREEP_SCALE` knob
At the top of `game.js`: `const CREEP_SCALE = 1.0;`  It scales every NEW creepy effect that switches on when the creep level rises:
- `1.0` = the intended spookiness (default). `0` = the new visual/scripted effects are off (no colour grade, no dying lights, no peeking Molly, no scripted scares; the old game remains). `1.4` = extra scary. (`__molly.setScale(0.5)` tries a value without editing the file.)
- Each level also has its own multiplier `dread:` in its definition (house 0.9, factory 1.0, maze 1.12, school 1.25) and an optional `look: { expo, con, amb, kill }` (how much the picture darkens, how deep the shadows get, how much ambient light is removed, what share of the lamps may die).
- The friendly start is untouched: at creep 0 (the toy store and the first 2.5 minutes of the house, `ease: { hold: 150 ... }`) every new function returns early and the extra post-processing pass is not even run.
What it adds once creep rises (all smooth, nothing strobes, the screen is never black or unplayable - the 3-second "lights out" keeps about 12% light):
- **Look:** cold desaturated colour grade, deeper shadows, heavier vignette, slight colour-split / grain / VHS tear on pulses, deeper fog, lamps that die one by one (spluttering first), sickly red emergency light in the factory and school, the sun turns into slow moonlight with long moving shadows, a faint glow on things you can press E on (puzzles stay readable).
- **Things that watch you:** a portrait in each level whose eyes follow you and whose smile grows; toys that turn to face you when you are not looking; doors that creep open by themselves (only while unseen); writing that appears on walls and, in the maze, on the mirrors ("PLAY WITH ME", "I SEE YOU", "MY TURN", "STAY WITH ME", "DON'T BLINK"); Molly's photo peeking from hall ends, behind furniture, in windows and in the mirrors; a single quick "glitch" frame where she is suddenly closer (never a strobe).
- **Molly:** stands at the edge of your vision, turns away or tilts her head, creeps a little closer while you are not looking, sometimes appears silently only if you turn too late. She still cannot catch you while a panel is open, the grace period and the 2.4 s stare-away rule are unchanged.
- **Scripted moments** (once each, at a creep threshold; see `D.script` in each `Dread.levelN`): `fakeOut` (heart racing, sudden silence, a slam, running steps - and nothing is there), `lightsOut` (3 s of near darkness with a giggle and a whisper, Molly at the edge of the light when it returns), `eyes`, `dolls`, `mirrorWrite`, `hallLights`.
- **Sound** (all through the existing compressor, same loudness cap): detuned drone and tension throb, heartbeat that follows how close she is, far off-key slowed music box, giggle echoes, whispers, breath, creaks, door slams, static bursts, footsteps that copy yours a moment late, sudden silence before a scare.
- **Jumpscare:** same cap on loudness, but with a zoom punch, shake, VHS/scanline tear on her face and a short sting. No gore, no blood, no violence.

## Secrets (none is needed to finish the game; none changes a puzzle, answer, hint or save)
There are **5 golden buttons** (one in the toy store, one in each level). The counter **Secrets x/5** is in the bottom-right corner and is saved in the browser (`localStorage` key `molly_secrets`; if storage is blocked the game just forgets it). Find all 5 and the final "To be continued" card says: *You found all the secrets! Molly smiles... for now.* Reset with `__molly.resetSecrets()` or by deleting the key.
Secret doors slide open once and stay open; each secret room is a dead end that is open on the door side, so you can never get locked in.
- **Toy store:** the golden button sits on the very top of the left shelf on the back wall (look up from the aisle, it twinkles). The big yellow squeaky duck on the left display table can be honked with E.
- **Level 1, the house:** the tall bookshelf on the west wall of the living room (next to the floor lamp, left of the piano) -> press E "Look at the bookshelf": it slides aside and shows a hidden clubhouse. The golden button is on the red cushion on the stool. Squeaky duck: against the north wall of the living room, between the piano and the big plant.
- **Level 2, the factory:** the painting on the north wall (right of the middle, under the MOLLY TOY FACTORY sign; its eyes follow you) slides sideways -> a secret workshop with the golden button on the workbench (on the red drum), a drawing of "MOLLY v1" and the scrawled **"Made by Alizay"**. Squeaky duck: under the table by the north wall at the east end.
- **Level 3, the mirror maze:** turn around at the start: the painting on the mirror wall right behind where you spawn slides away with the mirror -> a tiny alcove with the golden button on a pedestal and **"Made by Alizay"** on the back wall. Squeaky duck: in the short side corridor straight north of the first junction (the dead end that teleports you back is one step further, the duck is safe to reach from the junction).
- **Level 4, the school:** in the library (door on the south side of the hall), the plain bookshelf at the north-west end of the west wall (no SHELF label) rolls aside -> the old lost-and-found closet with the golden button on the stool and **"Made by Alizay"**. Squeaky duck: far east end of the library, in the pocket between the E shelf and the plant.
- **Silly Molly:** press **B**, **O**, **N**, **K** one after the other (not typing in a panel) and a nurse-hat Molly pops up and honks.
- The 'Made by Alizay' signature is also on the end card. Secrets that are already found stay found (the button is gone when you come back).
Technical: the closed secret rooms are not drawn (hidden group) until opened, and no extra lights are added, so fps is unchanged.

## Photosensitivity / safety notes
Every NEW flash or glitch is a single decaying pulse (no strobing; the game's original light flicker is unchanged), the 'lights out' keeps some light, loud sounds are capped by the same compressor as before, and there is no gore or violence anywhere. The post-processing pass (`dread.js`, one full-screen shader with 4x MSAA) is skipped completely at creep 0 and for `CREEP_SCALE = 0`.

## How to add a level (for Alizay)
1. Copy `levels/level4.js` (or `level3.js`) to `levels/level5.js` and change `id: 5`.
2. Add `<script src="levels/level5.js"></script>` to `index.html` (before `levels/ending.js`), and in `game.js` change the `G.completeLevel` save line (`def.id + 1 > 4 ? 1 : ...`) to the new last level number.
3. Fill in the level. It registers itself like this:

```js
LEVELS.push({
  id: 5, name: 'The Attic',
  music: 'lullaby',              // 'home' | 'lullaby' | 'calm' | 'store' | null
  creepBase: 0.5,                // starting scariness 0..1
  creepTime: 360,                // seconds until time alone makes it very scary
  grace: 80,                     // seconds before Molly can catch you
  ease: { hold: 150, ramp: 300, floor: 0 }, // friendly start: creep is capped at `floor` for `hold` s, then eases up over `ramp` s
  dangerAt: 0.55,                // creep level at which she can catch you
  card: '<small>LEVEL 5</small><h2>THE ATTIC</h2>',   // title card shown before the level
  build(L, G) {
    // L = the level. Useful helpers:
    L.floor(x1,z1,x2,z2, material, tile)      L.ceil(...)
    L.wall(x1,z1,x2,z2, {h, mat, matA, matB}) L.wallGaps(x1,z1,x2,z2, [[from,to]])   // walls (solid) with doorways
    L.box(w,h,d, mat, x,y,z, solid)           L.solid(x1,z1,x2,z2)                    // collision boxes
    L.furn(object3d, x, z, rotY, w, d)        // place furniture + collision
    L.lamp(x,y,z, color, intensity, dist)     // light that flickers when creepy
    L.interact({x,y,z,r,label,onUse,enabled}) // things you can press E on
    L.trigger({x,z,r,onEnter})                // walk-in zones (e.g. the exit: G.completeLevel())
    L.door({x,z,w,axis}) ; L.shifter(obj,{x,z}) // doors, and toys that move when creepy
    L.event(0.4, () => {...})                 // runs once when creep reaches 0.4
    L.spots = [{x,z},...]                     // places Molly can appear
    L.spawn = {x,z,yaw}; L.ambient = new THREE.HemisphereLight(...); L.ambBase = 1;
    L.fog0 = [color, density]; L.fog1 = [color, density];  // cozy fog -> creepy fog
    L.hint = () => 'text for the H key';  L.progress = () => 0..1;  L.update = (dt, t) => {...};
  },
  start(L, G) { G.setObjective('...'); G.say('...'); }
});
```
Helpers in `G`: `say`, `toast`, `setObjective`, `setInventory`, `openPanel/closePanel` (menus like the piano),
`bumpCreep`, `completeLevel`, `isSeen`. A panel opened with `G.openPanel(el, { typing: true, onKey(e) {...} })` also receives the letters E and M (normally E closes the panel and M mutes), which the school keypad needs. Models: `Build.*`, textures: `Tex.*`, materials: `Mat.*`, sounds: `Snd.*`.
Levels run in id order; after the last level the game plays the ending.

## Puzzle answers (spoilers!)
- **House:** tune = keys **3 5 6 4 5 1** (E G A F G C = yellow, blue, purple, green, blue, red). Clues: sunflower painting (living room) #1 yellow; fridge note (kitchen) #2 blue; family photo (hallway) #3 La = purple; green letter F block (playroom) #4; Teddy's tag (bedroom) #5 = same as #2; Home Sweet Home sign (by front door) #6 Do = red. Music box (bedroom) plays it.
- **Factory:** blueprint pages (office back-left + beside the gate). Order: left leg, right leg, body, left arm, right arm, head, nurse hat. Use the console at the start of the long belt.
- **School (level 4):** the exit door keypad wants **DOLL**. Four riddles (blackboard in Classroom 1 = #1, blackboard in Classroom 2 = #2, note taped to a hallway locker = #3, note on the library reading table = #4). Each answer is a thing named in exactly one library book title; the code letter is the FIRST letter of that title, in riddle order:
  - #1 "I have a face but no eyes... I hang on the wall" = **CLOCK** -> *Dong! The Clock Strikes Thirteen* (Shelf A) = **D**
  - #2 "I have 88 keys... Mom plays me" = **PIANO** -> *Old Piano, Sing Me Home* (Shelf B) = **O**
  - #3 "I keep you dry when the sky is crying... open like a flower" = **UMBRELLA** -> *Lost Umbrella of Larkspur Lane* (Shelf C) = **L**
  - #4 "I show your face but never speak... copy every move" = **MIRROR** -> *Look Who's in the Mirror* (Shelf D) = **L**
  - Decoy books (wrong: funny/spooky quip + tiny creep bump): wristwatch, hourglass, calendar, violin, drum, harp, accordion, raincoat, parasol (sun, not rain), window, photo album, glass slipper, ... Shelf E is fillers (Molly's Hide and Seek book = a bigger bump). Wrong keypad codes bump the creep a little too (creep is capped by the level's ease, so it never jumps early).
  - Creepy extras (driven by creep): flickering fluorescent tubes (two die later), school bell, rattling lockers and doors, clock hands that spin, "PLAY WITH ME" written in chalk on the hall chalkboard, whispers. Starts spookier than level 1 (creep 0.2 rising toward 0.5+), danger from 0.55.
  - Layout: one flat floor. West end = start, long locker hallway, Classroom 1 and 2 (doors on the north/left side), Library (door on the south/right side), exit double doors with a keypad at the east end.
- **Mirror maze:** start going north. Turns at junctions: Left, Left, Right (note 1), then Straight, Right, Left, Straight (follow GOLD arrows; pink lie, note 2). Wrong turns teleport back to the start.

## Realistic look (how it works)
- Photo textures (oak floor, rose wallpaper, ceramic tile, rusty steel, plaster/concrete/fabric detail) are tinted per use, with bump maps, roughness and a small procedural reflection environment (`Build.initEnv`). One real shadow-casting sun per level (`G.setupSun`, refreshed ~10x/second), film grain + vignette in `style.css`.
- Sources and tools: `../graphics/realistic/` (`raw/` generated full-res images, `final/` tileable textures, `tools/`). Rebuild the embedded file with `python3 ../graphics/realistic/tools/build_textures_js.py`.
- Photo characters: `B.molly()` / `B.mom()` automatically become upright camera-facing billboards when `sprite_molly_stand` / `sprite_mom_stand` (+ optional `_wave`, `molly_sit`, `molly_tilt`, `molly_scare`) exist in `final/`. Generate with `tools/gen.py` + `tools/jobs.json`, cut out with `tools/make_sprites.py`, then run `build_textures_js.py`. Until then the improved 3D Molly and Mom are used (the ending always uses the 3D Molly so her eyes can turn).
