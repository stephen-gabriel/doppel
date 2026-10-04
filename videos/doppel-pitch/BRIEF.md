# BRIEF

## Intent

- **Deliverable:** 2-minute founder pitch video (MP4, 1920x1080, 30fps) for the Colosseum Crypto World's Fair submission form's "Pitch video" slot.
- **Workflow:** `/general-video` — custom multi-scene narrated composition. Not a launch promo, not a topic explainer.
- **Separate from** `videos/doppel-demo` (the <=3min product-demo video). This one argues; that one shows.

## Audience

Colosseum judges reviewing the product submission. They score founder-market fit, insight, product + execution, potential market size, founder communication, and viability. The field copy says: "introduce yourselves, tell us what you're building, and tell us why you're the people to build it. We're interested in how you think and communicate."

## Message

Wallet history is attacker-writable, so history is not proof. Verification has to come from a channel the attacker cannot write to.

## Hard constraints

- **Maximum 2 minutes.** Target 118s to stay inside the cap.
- **Founder does not appear on camera and does not use their own voice.** Narration is synthetic TTS. This is a stated production choice, not a disclosure item.
- **Public** video, hosted on YouTube.
- No fabricated traction, users, revenue, or attack telemetry. Zero-traction is stated explicitly and on screen.
- Mainnet is read-only. No mainnet funds, no mainnet signing, anywhere in the piece.
- Deterministic only: no `Date.now()`, no `Math.random()`, no network fetches.

## Run shape

Narration is generated per line, measured with ffprobe, and laid end to end with a fixed breath gap so every scene cut lands on a real speech boundary. Scene visibility is toggled by the scene timeline, not by opacity alone. BGM is an original locally synthesized bed, carved against the whole narration group.

## Proof assets

Real captured UI from the deployed app is reused as scene plates: `twin-match.png`, `twin-mismatch.png`, `recipients.png`, `prepare-mismatch.png`, `result-mismatch.png`, `blocked-button.png`, `payment-form.png`, `prepare-match.png`, `home.png`, `method.png`. No mockups.

## Out of scope

- Any mainnet transaction.
- Any claim that Solami gRPC streaming is live (`/api/status` reports it as pending; the video does not contradict that).
