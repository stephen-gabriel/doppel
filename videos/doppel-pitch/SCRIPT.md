# SCRIPT — Doppel pitch (1:56)

One narration line per scene, so every visual cut lands on a real speech boundary.
Lines are measured at build time (`scripts/build-narration.mjs`); scene timings in
`index.html` are copied from `assets/vo/timeline.json`. Do not hand-edit durations.

Rendered length 116.000s (3480 frames @ 30fps). Narration ends at 112.867s, leaving
3.133s of end card. Voice `af_heart` at speed 0.9.

| # | Scene | Start | Dur | Narration | Visual |
|---|-------|------:|----:|-----------|--------|
| 01 | `hook` | 0.000 | 2.99 | Anyone can put an address into your wallet history. | Single statement under a brand rule. |
| 02 | `mechanic` | 3.840 | 11.80 | An attacker grinds a vanity address matching the first and last characters of someone you've paid. Then sends worthless dust, so the fake appears in your history, right next to the real one. | Two mono rows (matched / mismatched) built from type, not screenshots. Only the differing middle glyph lights red. |
| 03 | `wait` | 16.080 | 2.58 | Now it just has to wait for you to copy it. | One line, held, with a blinking caret. |
| 04 | `why-now` | 19.120 | 18.45 | Vanity address generation used to be theoretical. Grinding services made it a commodity. And copying from history became how most people send a repeat payment. Solana base58 addresses are case-sensitive and unchecksummed. Easy to miss one character. | Three-beat stack, then a mono sample address whose single wrong glyph lands on the narration's last beat. |
| 05 | `insight` | 38.600 | 10.39 | Here's what I noticed. Wallet history is attacker-writable. Anyone can send you dust and place an address there. So transaction history isn't proof of anything. | The turn. Statement scales up. |
| 06 | `principle` | 49.510 | 4.18 | Verification has to come from somewhere the attacker can't write to. | Single principle card. |
| 07 | `product` | 54.140 | 14.34 | Doppel keeps an address book of recipients you independently confirmed. When you enter an address to pay, it compares against that book and shows you exactly which characters match and which differ, before your wallet is asked to sign. | Three proof beats beside a `prepare-mismatch.png` plate. |
| 08 | `blocked` | 68.920 | 2.86 | Unresolved history? The payment is blocked. | `blocked-button.png` + `result-mismatch.png`. |
| 09 | `safety` | 72.230 | 7.04 | Mainnet is strictly read-only. No funds, no signing, no risk. The only write path is a devnet demo. | Three status chips above a `prepare-match.png` plate. |
| 10 | `ships` | 79.720 | 10.84 | It ships three ways. A reference web app. An SDK and widget you can drop into your own product. And a monitor that watches your saved recipients for new activity. | Three cards (web / SDK / monitor) above a `monitor.png` plate. |
| 11 | `why-me` | 91.010 | 11.65 | I built this solo. I found it by paying attention to something most wallets treat as trustworthy. I designed the threat model, the verification model, and every safety boundary. | Statement beside a `home.png` plate. |
| 12 | `close` | 103.110 | 9.26 | It's early. Zero users, zero revenue. But every repeat payment makes this risk real for someone. And the check costs nothing to run. | Logo lockup + `doppel-tau.vercel.app`. |

## Delivery notes

- Scene 05 has a deliberate 1.1s breath before "Wallet history is attacker-writable". It is the turn of the whole video and must not read at the same rate as the lines around it.
- Scene 08 is a single short card by design — do not merge it into 07. It runs 3.31s (68.920 → 72.230).
- Every screenshot is a real capture of the shipped product at `doppel-tau.vercel.app`. No mockups, no stock imagery.
- Zero traction is stated on screen in scene 12, not buried. Colosseum's guidance is to say so plainly and show engineering evidence instead.
- Scenes 09 and 10 size their plate to the capture's own 2880x2000 aspect so `object-fit: contain` fills the box with no letterboxing. Changing either box width without matching the aspect reintroduces dead margins.