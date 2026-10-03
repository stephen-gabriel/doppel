# UI specification: Doppel

Version 3. Preserve the existing visual identity; change the experience to recipient continuity and evidence-backed payment checks.

### Builder-feedback revision: guided first use (2 Oct)

The builder found the original Check terminology confusing. This feedback is real builder usability evidence, not external customer validation. Current navigation copy is **Check an address**, **Address book**, **Test a payment**, **Monitor**, **How it works**; underlying routes stay the same.

- Network choices read **Real network · read-only** and **Test network · devnet**, with a short explanation that mainnet-beta is Solana's real network name. Checks work now and do not move money.
- Check labels: **Your wallet address**, **Who are you trying to pay?**, **Address you are about to pay**, **What would you send?** Each has explanatory help. Saved recipient is optional on Check; sending requires a confirmed record.
- Separate, explicitly labelled matching/lookalike examples make no network requests and never populate real form values. Empty fields show guidance, not unrelated sample addresses presented as the user's comparison.
- Test a payment defaults to devnet. Enter ordinary decimal SOL/USDC amounts, with exact integer conversion, validation and human-readable final review. No raw-unit entry in the main form.
- Explain that only the sender needs advance test SOL for a SOL transfer. Preflight reads estimate fees and minimum new-account funding before signing; show actionable messages without changing the requested amount. USDC's extra token-account requirements are explained separately.
- Result summaries use ordinary language. Technical source/coverage metadata and transaction history are expandable. Missing/unknown history remains explicit; never hide it behind friendly copy.
- Mainnet has a read-only explanation instead of a disabled pretend-send button. Monitor clearly says it is not running yet.

These revised labels/defaults supersede older literal copy in the detailed layouts below.

## 1. Intent

A calm tool for the moment someone asks “is this the recipient I intended?” The central visual remains the **Twin Panel**: full addresses aligned, matching edges highlighted, differences exposed. It explains evidence, not an unsupported safety score.

Main paths: save a recipient, check a destination, inspect evidence, prepare a payment. Monitoring demonstrates the supporting pipeline. No global threat map, live-attack theatre or decorative KPI dashboard.

## 2. Tokens and typography

| Token | Hex | Use |
|---|---|---|
| `midnight` | `#10142A` | Page background |
| `ink` | `#181D38` | Panels |
| `raised` | `#20264A` | Inputs and notes |
| `line` | `#2E3562` | Borders |
| `text` | `#ECEFFB` | Primary text |
| `muted` | `#A3AAD0` | Secondary text |
| `iris` | `#8F9CFF` | Brand, focus, matching characters |
| `on-iris` | `#0D1030` | Text on primary buttons |
| `match` | `#52D6A5` | Exact saved-address match only; never general safety |
| `review` | `#F2B84B` | Review/incomplete evidence |
| `pause` | `#FF7A7A` | Recipient mismatch or suspected poisoning |

Use Bricolage Grotesque 400/500/600 for UI/headings; JetBrains Mono for addresses and code, loaded through the framework's documented font API. Sentence case. Body 16/26, secondary 14/22, heading 32/38, hero 48/54 (mobile 34/40). No tiny evidence text.

4px spacing grid; max width 1120px; side padding 20 mobile/32 desktop. Buttons/inputs at least 44px tall. Radius 12 for controls/rows, 20 for panels. Three surfaces: Panel, Row, Note. Subtle borders; no glassmorphism, animated backgrounds or stacked shadows.

## 3. Navigation

| Route | Purpose |
|---|---|
| `/` | Check with optional saved recipient and evidence result |
| `/recipients` | Local recipient book and address-change history |
| `/prepare` | Reference pre-send integration; prominent network mode |
| `/monitor` | Focused watch-set operation and findings |
| `/method` | Method, supported scope, evaluation, limits, SDK/API example |

Header: logo/name, Check, Recipients, Prepare, Monitor, Method; GitHub link; compact provider/network status. Collapse to accessible mobile navigation. Footer states: “Doppel checks recipient continuity and poisoning patterns. It does not verify identity or guarantee safety.”

## 4. Check page

Headline: **Check the recipient before you send.**

Subhead: “Compare a destination with your saved recipient and inspect suspicious lookalike activity.”

```text
Sender wallet       [full address]
Saved recipient     [optional selector]
Destination         [full address] [Paste]
Asset               [SOL / USDC]
[Check recipient]

Twin Panel: Saved/previously paid address vs proposed destination
Continuity: Exact match / Recipient mismatch / Not selected / Unconfirmed
Pattern: Suspected poisoning / Resemblance only / No pattern found / Unknown
Coverage: Checked range, assets, fetched count, partial-history warning
Evidence timeline: dated, directional, linked events
Next action: specific to the combined result
```

Desktop: form 5/12, comparison/result 7/12. Mobile: form then result; no layout jump on success. Example stays explicitly labelled and never populates a real result silently. Use valid sourced public or synthetic addresses with origin labels.

Loading communicates the actual stage, such as discovering token accounts or fetching a bounded page. Never say “reading your entire history.” Cancellation and partial results are visible.

## 5. Recipient book

- Local list: label, full-address detail, cluster, confirmation state, revision and date.
- Add flow: enter -> review full address/source -> explicitly confirm.
- “Confirmed by you” means a saved user assertion. Helper text: “Doppel has not verified this person's identity.”
- Edit shows old/new addresses and invalidates drafts using the previous revision. No direct overwrite from a detected match.
- Import preview shows duplicates and validation failures; imported records start unconfirmed.
- Export and remove are explicit actions. Explain that local data stays in this browser and can be lost when cleared.
- No wallet connection needed to save/check public addresses. Labels/notes remain local.

## 6. Prepare page and widget

Display selected recipient, destination, asset, raw-to-human amount, sender and network. The widget shows the same independent result dimensions as Check.

Mainnet banner: **Mainnet analysis — no transaction will be sent.** The end action is “Review preparation,” not a fake Send button.

Devnet banner: **Devnet test payment.** Enable the wallet-request action only after policy permits, final transaction validation succeeds, and the user reviews the full destination, asset and amount. An invalidated/stale check returns to Checking/Review. There is no mismatch override button in the reference app.

For an otherwise eligible exact confirmed recipient with partial history, show an unchecked acknowledgment: “I independently confirmed this exact recipient and understand that some historical activity was not checked.” Keep partial coverage/unknown pattern visible after checking it. Clear acknowledgment on draft/record edits, recheck, cancellation and expiry. This control never appears as a bypass for unresolved transfers, unavailable history or suspicious findings. Connect the signing wallet explicitly; show a successful transfer only after devnet confirmation.

When devnet uses a harness-created SPL mint, display “Test token” and its mint details instead of a USDC brand/claim.

Show detected alternatives as evidence, not a “replace with safe address” shortcut. Recipient changes go through the saved-record confirmation workflow.

## 7. Evidence components

| Component | Requirements |
|---|---|
| TwinPanel | Two clearly labelled full addresses, matching edges, differing middle and plain-text summary; support asymmetric matches |
| AddressDiff | Case-sensitive, non-overlapping highlights; 4+1 rendered correctly; copy returns unchanged raw address; wraps on mobile |
| ContinuityBadge | Exact saved-address match is green; mismatch red; no recipient/unconfirmed neutral/amber; text/icon always present |
| PatternBadge | “Suspected poisoning,” never “Confirmed attacker” from heuristics |
| CoverageNote | Assets/range/count/limit/provider/cache age; partial and unavailable remain prominent |
| EvidenceTimeline | Actual ordering and direction, amounts, signatures/instruction references; absent block time shown as unknown |
| SourceBadge | Cluster plus Live/Historical/Replay/Synthetic as appropriate; provider separate |
| DraftStatus | Checking, stale, changed, paused, review, ready for confirmation; binds to current draft |
| Error/Empty | Distinguish no observations from failed lookup |

Truncate addresses only in compact lists. Full addresses must be available in the private check/recipient flow. Public monitor uses abbreviated rows and deliberate details. Explorer links are not anonymous.

## 8. Monitor page

Title: **Focused wallet monitor**. Show watch-set size, supported assets, history window and origin. No implication of all-Solana coverage.

Metrics: supported transfer events processed, last processed slot, heartbeat age, reconnects, gaps, backfill state and suspected findings. Only show latency statistics with measured definition and sample count; observation delay derived from block time is not precise network latency.

A feed item includes suspected pattern, pair diff, evidence references, review status and source. “Zero findings” is a valid result. A slot heartbeat proves connection health, not that transfer decoding works; show processed transfer evidence separately.

Worker stopped/expired trial -> stale/offline status and last observation time. Retained events become historical/captured. Polling is labelled polling. Historical case playback is in a separate labelled section, never animated into the live feed.

## 9. Required copy and states

| State | Copy/action |
|---|---|
| Exact continuity | “Matches the address you saved for this recipient.” |
| Mismatch | “This destination differs from your saved recipient. Reconfirm the address before continuing.” |
| Suspected pattern | “This address resembles a previous recipient and appeared in an incoming small transfer afterward.” Show only supported facts |
| Resemblance only | “These addresses resemble each other. We do not have enough evidence to classify the interaction as poisoning.” |
| No pattern | “No matching poisoning pattern found in the checked history.” |
| Empty history | “No supported transfers were found in this checked range. This does not establish recipient identity.” |
| Partial/unavailable | “History is incomplete. Doppel cannot finish this pattern check.” Explain what is missing |
| No recipient | “Select or confirm a recipient to check continuity.” |
| Provider fallback | “Using public RPC. Reads may take longer and coverage may differ.” |
| Changed draft | “Payment details changed. Check again before continuing.” |
| Suspected prior contact | “First observed in this checked history,” unless complete lifetime evidence supports a stronger statement |
| Invalid address | “This is not a valid 32-byte Solana address. Check for missing or extra characters.” |
| Rate limit | “Request limit reached. Retry after the indicated delay.” Preserve local inputs |

## 10. Motion and accessibility

One short edge-highlight transition when a new result arrives; skip with reduced motion. No video/composition deliverable is needed for UI motion. Controls have visible focus, keyboard order and descriptive labels; result updates use `aria-live="polite"`. Color never carries meaning alone.

Test 390px and desktop layouts, long base58 strings, keyboard dialogs, touch targets and error announcements. Verify WCAG AA contrast rather than assuming palette tokens guarantee it.

## 11. Assets

Reuse `assets/doppel-logo.svg` and `assets/favicon.svg`; their overlapping squares still fit the concept. Generate the eventual static social image from the actual Twin Panel and revised tagline. Meta title: “Doppel: check the recipient before you send.”

## 12. QA checklist

M4 local evidence: keyboard address-book create/confirm, visible input focus, accessible import preview, 390px no-overflow paths and reduced-motion mode exercised in Playwright. Computed palette text contrast minimum 5.79:1 across tested surfaces (AA). Full visual/screen-reader and deployed-site checks remain open; do not mark every item below complete from these partial checks.

- [ ] Existing brand tokens/fonts/logo applied consistently.
- [ ] Full-address and asymmetric comparison work on mobile.
- [ ] Continuity, pattern and coverage remain visibly independent.
- [ ] No generic safety badge or unsupported previous-payment claim.
- [ ] Local confirmation and address revision flow are explicit.
- [ ] Mainnet analysis and devnet execution are unmistakable.
- [ ] Changed/stale drafts cannot retain ready state.
- [ ] Partial, timeout, empty and invalid inputs are distinct.
- [ ] Monitoring scope, gaps, freshness and source are shown accurately.
- [ ] Historical/synthetic examples never masquerade as live findings.
- [ ] Keyboard, screen-reader status, contrast and reduced motion checked.
- [ ] 390px layout has no horizontal page overflow.
