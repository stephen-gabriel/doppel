---
workflow: product-launch-video
flow: automation
storyboard: no
message: "Doppel catches a lookalike recipient before your wallet ever sees the transaction."
destination: hackathon-video
aspect: 1920x1080
language: en
length: 85s
angle: real-app-demo
narration: yes
---

## Intent
Full demo video for the Colosseum Crypto World's Fair submission. Real captured app UI,
restrained professional motion, fluent narration, subtle original music bed.
No generic AI-slop visuals. This supersedes the 24s style sample.

## Assets
- Local Doppel app at http://localhost:3000 — captured with Playwright in a fresh isolated context.
- assets/*.png — real UI plates (home, recipients, prepare, twin panel, monitor, method).
- ../../_build_plan/assets/doppel-logo.svg — existing brand mark.
- assets/music-original.wav — locally synthesized bed, reused from the sample.

## Scenes
1. Hook — two addresses that look identical.
2. The attack — dust arrives from a lookalike, then history autocompletes it.
3. Check an address — real mainnet read, no wallet, no funds.
4. Saved recipient continuity — Twin Panel mismatch.
5. Signing blocked — the button stays disabled.
6. Correct address — match restored, payment proceeds on devnet.
7. Monitor — captured mainnet evidence, honest offline/historical labelling.
8. Close — open source, runs on public RPC with no key.

## Customizations
Keep app typography legible via focused crops. Persistent "captured app UI" labelling on
product footage. English narration, local Kokoro TTS. No claim that sample activity is a
live mainnet attack. Zero findings in the bundled capture is stated honestly, not hidden.

## Notes
$0 production. No paid API, cloud render, stock licence or new transaction.
Devnet signature pufgEmeH… already confirmed; it is cited, not replayed as new.
