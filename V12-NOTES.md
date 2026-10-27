# v12: presenter mode
- Open it with the screen button (top right, under the mode bar) or press P. Exit with Esc or P. The URL hook `?present=N` opens it at step N.
- 12 steps: the assembled image, head, chest, belly, legs, feet, then Babylon, Medo-Persia, Greece, Rome and the divided kingdoms, then the stone.
- Next: → ↓ PageDown Space Enter (clickers send PageDown/PageUp). Previous: ← ↑ PageUp Backspace. Home and End jump to the first and last step.
- B or . blanks the screen to black; N toggles narration between Auto and Off (the presenter speaks). The setting is remembered, and the user's own narrator choice comes back on exit.
- Hidden while presenting: codex, tablet, quiz, tales, the statue switcher, corner controls, the History card, evidence and timeline, and hints.
- History steps use the new history.goTo(i): an eased camera move with no autoplay.
- Test: node shootpr.mjs [regex] (server on :9013).

## History beasts (Daniel 7), per Victor's redline
- Only the current empire's beast shows: lion for Babylon, bear for Medo-Persia, leopard for Greece, the fourth beast for Rome, and the fourth beast again for the divided era. It rests in front of the statue's feet on the far edge of the map, half on the platform (world -2, top, 36), at 1.65× its normal world size in every era, about the on-screen size of the earlier top-right version.
- It slides in from the east along the map's far edge and leaves to the west, curving outward (bow 34) so the path never crosses the statue or plinth. Each slide takes 1.9 s with a cubic ease, and the next beast follows 0.5 s later on wall-clock time. While it moves, the beast faces the way it travels; at rest it turns three-quarters to the camera. The active beast keeps the warm self-glow and the spot that follows it.
- It works in presenter History steps too. Leaving History puts the beasts back beside the statue.
- Test: node shootbeasts.mjs [regex]; the `window.__slideK` hook freezes the slide for screenshots.

## Hunyuan tales (furnace, tree)
- models/tales/tale_furnace.glb: 75K triangles, 1.6 MB. models/tales/tale_tree.glb: 99K triangles, 1.8 MB. Base colour is 2K WebP; normal and metal/roughness are 1K WebP; meshopt compressed.
- They lazy-load when a tale or the tales list opens, the camera comes within 520, or History reaches the Babylon era. `?lowtales` keeps the low-poly versions, which stay in place as stand-ins until each model arrives.
- Positions: furnace (-330, -480), tree (430, -660). The low-poly den stays at (380, -580). The tale camera stands at 300 for these two.
- Thinner, warmer fog on them (0.45 for the furnace, 0.35 for the tree) plus a warm emissive. The tree keeps its glow sprites and gets a point light; the furnace gets a fire light.
- Test: node shoottales.mjs [regex].

## Mobile pass
- Breakpoints: portrait at max-width 600px; landscape at max-height 450px. The LOD statue was already automatic on narrow or touch screens.
- Portrait: a compact mode bar at the top with the title under it, icon-only tool buttons, a hidden scrub label row, History cards as a bottom sheet above compact controls, full-width tale, quiz, codex and evidence panels, and smaller presenter text.
- Landscape: a single-row toolbar, a narrow History card with no relief image, a two-column quiz with no illustration and the close button top right, and full-height tale and codex panels.
- Exploded description callouts hide on phones; the names stay. Touch screens get larger hit areas on timeline marks.
- Test: node shootmobile.mjs <tag> [regex] at 390×844 and 844×390.

(The exploded-view Daniel 7 toggle and beast lineup were removed at Victor's request; the existing beast icons on the callouts cover it.)
