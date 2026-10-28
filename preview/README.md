# The Great Image (Daniel 2:31–45): v9

Static site, no build step. Three.js 0.160 and GSAP are bundled in `vendor/` (importmap in `index.html`); only the Google Fonts load from the internet.

## Run (Windows)
1. Extract `daniel-statue-v9.zip`.
2. Open PowerShell in the `daniel-statue-v9` folder (the one that contains `index.html`):
       cd "$HOME\Downloads\daniel-statue-v9\daniel-statue-v9"   # adjust to where you extracted it
3. Start a local server:
       py -m http.server 8966
4. Open http://localhost:8966 and press Ctrl+F5.
It must be served over HTTP (ES modules don't load from file://). Mac/Linux: `python3 -m http.server 8966`.

## v9 changes
- Recorded ambience (data/audio, 96 kbps seamless loops): Abandoned Fields on the landing view, Haunted Temple in Exploded, "The story you're about to hear" over a quiet temple drone in History (ducked under narration). A distant horn plays every 45-120 s and at each empire handover. Sound is on by default and starts on your first click; the synthesized score is off, event sound effects stay. Credits are in the ⋯ menu (`src/v9.js`).
- History: play/pause, sound and narration icons sit together in the bottom-left corner, larger; narration on by default. The event card sits lower. The active empire's beast rises on its plinth.
- Codex lists the readings by method (historicist first) with no denominational label.
- Beast line icons redrawn (bear, leopard, fourth beast) and coloured to their empire names. Beast statues 20% larger and set further back. Callout type matches the site (Cinzel caps). Clay-tablet counts are easier to read. The sky's pinch (god-ray apex) is gone. The orbit hint shows once, briefly, under the nav.

## v7 changes
- Prophecy layer: Daniel 7 and 8 beasts (lion, bear, leopard, dreadful beast, ram, goat) as glowing gold seals in the section callouts (assembled: compact; exploded: full), and on the History timeline at each empire change. Click one to open its clay relief on a 3D clay tablet, linked to its statue section by a glowing line (`src/v7.js`, `data/beasts/`).
- Number codex: click a drifting cuneiform number (7, 10, 12, 42, 70, 1260, 2300) to pause and open its codex page: Seventh-day Adventist reading first, then preterist, futurist and dispensational readings with references (`data/v7.json`). Caught numbers are saved; the codex button reopens them.
- Guides in History: Historian, Daniel or Nebuchadnezzar each narrate the events in their own voice. "Narrate" reads them aloud with the browser's speech synthesis.
- Hidden tablet: six wedge-signs (ziggurat step, Ur on the map, end of the timeline, codex margin, beast tablet, above the head in exploded view). Progress is saved in localStorage.
- Share link copies a deep link to the current view (`?mode=history&year=-539&guide=daniel`, `?state=exploded`, `?state=focus&section=chest`, `&beast=bear`, `&codex=2300`). Snapshot downloads a letterboxed 1920px PNG.
- Callouts restyled as glowing seal linework with ring nodes and small-caps serif labels.

## v6 changes
- Far fewer drifting particles, mostly dark ash; rare cuneiform numerals (7, 10, 12, 42, 70, 1260, 2300) and formulas drawn as real Babylonian base-60 wedges (`src/glyphs.js`, no font download).
- All torches behind Babylon's walls; flicker almost gone.
- Exploded view: gilt linework callouts per section (`src/callouts.js`).
- Selected piece stays in the light cone, camera comes to it; other sections stay visible (55%).
- History: statue scaled to 74% so map and statue share the frame; tight spotlight + noise-edged soft dimming shader on inactive sections; empire change pulls the camera out to show both, then dives back; current-empire callout; banded empire spans on the timeline.
- Map dissolves into darkness outside the light (noise-warped radial alpha), with a soft tongue reaching back to the statue's feet.
- The Stone: anticipation, hard hit with shake/FOV punch/flash, varied chunks with gravity and drag, dust, chaff blown away on the wind; smoother, textured mountain.
- Click anywhere in History to play/pause; carved wedge frame glows when paused.
- Ziggurat platform (3 steps), braziers on the corners. Toned-down battle fire.
- Test URLs: `?state=exploded|focus&section=chest|stone&t=3.1`, `?mode=history&s=2&pull=1`, `&static`, `&glyphs`.

## Controls
- Drag to orbit and scroll to zoom. When idle, the camera drifts slowly.
- Hover a section to see its label. Click it to focus. Esc or the Return button goes back.
- In feet focus, "Separate the ten toes" fans the toes out and pulls their iron and clay segments apart.
- The top buttons are Assembled, Exploded, The Stone and Reset. The bottom timeline (Babylon to The Stone) highlights each section and shows its card.

## Test URLs (used by shoot.sh)
`?state=assembled|exploded|focus|toes|stone`, `&section=head|chest|belly|legs|feet`, `&t=<seconds into the stone sequence>` and `&static` (turns off idle drift).

## Files
- `src/scene.js`: renderer, storm-sky shader, environment map baked from the sky, lights, ground, blue walls and towers, ziggurat, kneeling figures, god rays, dust and bloom.
- `src/statue.js`: materials (tweak looks here) and the procedural sections. Each section is a Group with metadata and a pivot so it can rotate around its center.
- `src/textures.js`: canvas-generated relief, normal and roughness maps (bands, lamellar, winged bull, clay cracks, glazed bricks).
- `src/effects.js`: the stone, the mountain and the pre-sampled instanced shards.
- `src/transitions.js`: the Director state machine, camera presets, explode offsets and the stone timeline.
- `src/ui.js` and `style.css`: the overlay.
- `src/data.js`: kingdom metadata and KJV quotes.

## v3 changes
- The procedural statue is replaced by the Hunyuan 3D model (`models/statue_hd.glb`: 14.7 MB, 1.5M tris, 4K WebP PBR textures, meshopt-compressed). `models/statue_lod.glb` (3.9 MB, about 300k tris, 2K textures) loads on phones or with `?lod=low`. Use `?lod=high` to force HD.
- The model is split into 5 nodes: head_gold, chest_silver, belly_bronze, legs_iron and feet_clay. Cuts are at model heights 0.835, 0.595, 0.335 and 0.145 (out of 1.085) and are capped so each piece looks solid. Loader code is in `src/statueGLB.js`.
- three.js and gsap are vendored in `vendor/`, so the site no longer needs a CDN. Google Fonts are still loaded online.
- Screenshots: `npm i puppeteer-core && node shoot.mjs 8941`.
- The "ten toes" sub-explode is disabled because the scanned feet are one piece.

## v5 changes
- No horizon: black void, Babylon's walls as silhouettes lit from behind, ground and sky melt into one warm haze. Torches at many distances, ritual smoke wisps, four braziers by the statue.
- Lower hero camera; carved stone platform with broken paving fragments around the statue's base.
- Particles: half glowing embers, half dark ash.
- Fixed: the hidden history overlay was swallowing clicks on the Assembled/Exploded/Stone/History buttons. Every transition is tested in `test-modes.mjs`.
- Map: fired-clay relief texture (grain, cracks, pits, faint carved contours), lapis-inlaid seas and rivers with pyrite flecks, no frame (the edges crumble into the dark). Relief toned down (HS 9 → 7 plus peak compression and smoothing).
- POIs are small carved clay models with soft light pools and engraved labels; armies march in looser bands.
- Battles get fire, smoke and embers at the site (539 BC Babylon is marked `"fire": false` since the city was taken without a fight).
- Audio (`src/history/audio.js`) is fully synthesised with WebAudio, so there are no sample files and no licences. Each era has a pad, frame drum, and its own voice: lyre for Babylon, horns for Persia, aulos for Greece, brass and march drums for Rome. Battles add war drums, a horn, clashing metal, a crowd and fire.
- Event cards carry a generated clay bas-relief (`data/reliefs/`, prompts in `data/relief_prompts.json`) and an Evidence panel (`data/evidence.json`).
- The active kingdom's statue section glows and the others darken. The map stays on the ground in the statue view.
- Test scripts: `node shoot5.mjs <port>` (screenshots) and `node test-modes.mjs <port>` (mode transitions).

## v11 final feedback pass
See V11-NOTES.md ("Final v11 feedback pass"). Test: node shootfb.mjs [regex].
