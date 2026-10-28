# v11 work in progress (not packaged)
- Statue switcher: src/v11.js, statueGLB.js (STATUES, pickStatue, isUnlocked), style.css (end), i18n strings in data/i18n/{ru,es}.json
- Unlock: finishing the quiz sets localStorage dan2-unlock-classic=1 (src/v10.js finish()). Choice in dan2-statue. ?statue=classic forces it (testing).
- Swap: fade to black -> reload -> resume Assembled/Exploded/History (sessionStorage dan2-resume) -> fade in.
- Holes: /workspace/gt/v10/fill.py (cut_orig.npz -> cut.npz), then sect.py + ../pack.sh (now copies to v11/models).
- Tales camera: src/v10.js focusTale, D=360, from the front of the plain.
- Tests: node shoot11.mjs [regex] (server on :9011 from this folder)
- v11d statue (slot III "The Griffin Image", open by default, `?statue=v11d`): models/statue_v11d_hd.glb + statue_v11d_lod.glb.
  Pipeline in /workspace/gt/v11d (go.sh): proc.py (pedestal off, soles capped) -> fill.py -> headmask.py (colour) -> sect.py -> check.py -> paint.py (clay from texture) -> grade.py -> pack.sh.
  Cuts (0..1 of height): feet|legs 0.0866 and legs|belly 0.3281 = v10; kilt hem below 0.328 stays bronze; belly|chest follows the kilt top (0.482 back .. 0.508 front, v10 0.555); head = gold above y 0.893 inside the neck cylinder (bottom 0.793).
  Tests: node shoot11d.mjs [regex], node shoot11d-swap.mjs -> shots/v11d-*.png
- v11f statue (slot IV "The Lamassu Image", open by default, `?statue=v11f`; slot V = placeholder): models/statue_v11f_hd.glb + statue_v11f_lod.glb.
  Source: Hunyuan V3.1 GLB from /workspace/statue-v11f/front.jpg ('v11f take 1': lamassu beard, tall cap, hands on chest, patterned kilt, base block) -> /workspace/gt/v11f/w.glb.
  Pipeline in /workspace/gt/v11f (go.sh, copied from v11d): proc.py 0.0932 (pedestal top 0.0917 off, soles capped) -> fill.py -> headmask.py -> sect.py -> check.py (now also counts the _cap primitives) -> paint.py -> grade.py -> pack.sh (build11f.mjs; dump11f/tex11f/view11f.mjs in /workspace/gt).
  Cuts (0..1 of height): feet|legs 0.0866 and legs|belly 0.3281 = v10. The kilt is a closed shell fused to the thighs and the back pillar at its bottom plate, so there is an extra cut at the hem (KB, 0.288): legs + back pillar are capped there and everything from the hem up is bronze. Belly|chest = the kilt top, flat at 0.534 (v10 0.555), cut only across the torso (|x|<0.13) so the elbows, which dip just below it, stay silver.
  Head = gold texture inside a head volume (neck/hair cylinder above the collar, the side curls, the long beard down to 0.70, everything above the shoulder tops), cleaned with a morphological opening so the copper collar trim and frayed strands stay silver. Seam caps are earcut in the xz projection, not fans (fans poked out beside the beard). The beard's contact patch is steep, so instead of a cap it is part of the chest/head body, on a flat darkened metal texel block (parkb.json, painted by grade.py), because the site's cap shader puts a rim glow on steep caps.
  Feet: clay = the texture's own brown cracked clay x v10-style 3D noise (iron shows through in patches), with a pure-iron ankle band; muted grey-brown v11d clay tone.
  Tests: node shoot11f.mjs [regex], node shoot11f-swap.mjs (swap to slot IV) -> shots/v11f-*.png
- v11o statue (slot V "The Ziggurat Image", open by default, `?statue=v11o`; slot VI = placeholder): models/statue_v11o_hd.glb + statue_v11o_lod.glb.
  Source: Hunyuan GLB of 'v11o-2' (waist wings, hilt-style rod, stepped ziggurat backer with lion friezes) -> /workspace/gt/v11o/w.glb. Pipeline: /workspace/gt/v11o/go.sh.
  sep.py replaces proc.py: pedestal cut at model y 0.052; the backer is a thin slab fused to the figure's back, split off by the plane z=-0.011
  (in front of every step face) below y=0.868 (slab top; the head back above it stays with the head). Both sides capped (earcut of the clipped
  cross-sections). The figure's flat back gets each section's median texel; backer caps one slab texel.
  Rig: FL 0.0866 / LB 0.3281 (v10), KB hem plane (model 0.352) so the low front drape stays bronze, CB kilt top flat at model 0.605 (full width; elbows below it stay silver).
  Head = gold mask incl. long beard + side curls; beard contact patch = flat darkened silver block (as v11f). Feet: clay x noise mix, darker iron ramp (this texture's legs are pale).
  Backer: GLB node 'backer_stone' (unsliced, not a section, noPick). statueGLB.js scales from the 5 section nodes only; transitions.js eases it back 6 units in Exploded and hides it when the stone shatters the legs.
  zgrade.py: wings on the slab -> silver (muted so the key light doesn't blow them out), figure imprint left on the slab front -> stone.
- Loading screen (src/loader.js, style.css end): dark glazed-brick wall + rosette bands, clay tablet whose wedges bake as the model loads, fades out while the statue fades in.
  After a swap (sessionStorage dan2-resume) it shows only a small tablet over black; the swap click also shows the small tablet on the fade before reload. ?holdload=0.6 freezes it (tests).
  Tests: node shoot11o.mjs [regex] (loading, loading-mini, head-front, stone, back-34 added), node shoot11o-swap.mjs.

## Final v11 feedback pass
- Tales (furnace, tree, lions' den) moved much further out (furnace -440,-640 · den 380,-580 · tree 520,-760); the tale camera stays further back (D 560); the tree is lit and kept out of the fog with canopy glows so it reads from a distance.
- History: softer highlights (rougher metal, env and emissive down, softer key light); the statue stays at assembled size; music beds lowered and ducked harder under the narrator.
- The narrator menu shows in History only. Sound off now also mutes the narrator voice and TTS.
- The event card is bottom-anchored and grows upward. The evidence panel sizes to its content.
- Play/pause has a lit gold disc while playing, a breathing clay disc while paused and a Playing/Paused label.
- The clay-button stains are gone. The quiz close button sits under the tablet. There is no Bible text overlay in assembled/exploded (voiceover only).
