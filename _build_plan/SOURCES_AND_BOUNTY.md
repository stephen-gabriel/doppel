# Sources and bounty facts

Last research review: 2 October 2026. Sources support planning; account entitlements, integration behavior and submission-form fields require operational verification.

## 1. SOLAMI bounty supplied by the builder

The builder pasted these requirements in the planning conversation:

- Build a real-time Solana tool: examples include indexer, alert system, dashboard, dev tool and SDK.
- Solami must be the data path, with at least one product doing meaningful work.
- Available products listed: RPC/WebSockets, Yellowstone gRPC with server-side filters and slot replay, Mirage (Yellowstone over WebSocket), Blur decoded market data, Data API, webhooks and Beam transaction landing.
- Use Beam if the build sends as well as reads. Doppel's mainnet product is read-only; its devnet harness is test infrastructure. Confirm with the sponsor if any requirement is unclear.
- Public repository; runnable README with setup, environment variables and own-key instructions.
- Short 2–3 minute video/Loom running against live mainnet.
- A submission that does not run live is not judged.
- Judging: meaningful Solami usage, working demo, quality, usefulness and creativity.
- Surface metrics actually relevant to the product. Trade/volume metrics are examples, not mandatory for a security tool.

### Promotional access

Signup link supplied in the bounty: https://solami.dev/signup?ref=st-earn-sep-26

Advertised offer: **Pro free for seven days**, 2 unmetered gRPC streams, 1 TB Blur data and 200 RPC requests/second. These are sponsor-stated entitlements, not measured access in this project.

Before signup/activation, check payment/card conditions, overages, trigger time and UTC expiry. Do not start a paid plan or add prepaid funds. Prepare local work first. Record actual access at G1 and stream capabilities at G6.

Questions for sponsor (non-blocking for independent local work):

1. For our hosted demo, what free RPC/stream access remains after the trial? A personal Pro extension is optional, not a prerequisite for own-key judging (see clarification below).
2. Does a live-mainnet monitor/check plus separately labelled historical incident replay satisfy the security-demo expectation when no new attack occurs during recording?
3. What is the trial's exact activation/expiration behavior, and is payment information ever required?
4. Which history endpoints/retention and replay ranges are included for this key?

Do not assume answers or prize eligibility from an untested integration. The exact bounty listing URL, prize amounts and deadline were not included in the pasted requirements; obtain from the builder/form before final submission.

### Judging-key clarification from Solami Telegram

Source: conversation pasted by the builder; original message URL/date not supplied and not independently retrieved. Mike (Litmus) asked whether the referral Pro trial would be extended through submission and judging. Civa replied verbatim:

> We will use our key for judging

Operational interpretation: prepare the repository so reviewers can supply their own Solami key and run meaningful live-mainnet functionality. Do not require the builder's personal trial key to remain active for that judging setup. This does not promise a trial extension, continued Pro entitlement for our deployed site, or funding/hosting for our worker. It also does not waive the live-mainnet demo or working-software requirements.

Another builder-pasted conversation shows Civa replying “done” to Hickson's request to restore expired Pro access, followed by thanks. This supports case-by-case access assistance, not a guaranteed duration or universal extension policy.

Submission action: preserve a screenshot/permalink if obtainable, test setup with a replacement key before submission, document all required endpoints/permissions, and keep keys out of code and videos. Do not ask judges to share their key with us; they configure it in their own environment.

## 2. Official operational references

| Source | What it supports / limits |
|---|---|
| https://solami.dev/llms.txt | Product overview and documentation links; ordinary trial marketing differs from bounty offer; numeric snapshots can be stale |
| https://api.solami.dev/pricing | Public machine-readable pricing; observed Free 5 RPC RPS, zero WS/gRPC on review date; recheck before implementation |
| https://solami.dev/docs | Read current API reference; no endpoint/schema inferred solely from marketing |
| https://superteam.fun/earn/sponsor/solami | Confirms infrastructure sponsor identity and canonical website; listing content may require browser rendering |
| https://www.colosseum.org/worldsfair | Event date 12 Oct 2026, Solana ecosystem track and Public Good award existence |
| https://www.colosseum.org/hackathon | Startup judging factors and general submission/video guidance; final form is authoritative for specific fields |
| https://solana.com/docs | Verify RPC/client, account/token semantics, devnet genesis and transaction handling before coding |

Avoid confusing solami.dev with unrelated similarly named token websites. All provider requests use verified configured endpoints.

## 3. Research and competition

### Pine Analytics

https://pineanalytics.substack.com/p/solana-account-dusting-and-address

Published 24 April 2025. Reports Solana dusting/poisoning, the $2.91M November 2024 case and full addresses. Links a prior open-source scorer: https://github.com/jms1192/Poisoning_checker (MIT).

Use reported incidents as attributed evidence, not an independently verified ground-truth dataset. Separate domain-promotion dusting from targeted lookalike poisoning. The source's simplified `58^n` probability narrative is not an exact model of all Solana public-key encodings; don't repeat “statistically impossible” as a product guarantee.

### Blockaid

https://www.blockaid.io/blog/address-poisoning-the-growing-threat-draining-millions-from-crypto-users

Published 9 March 2026. Describes commercial defenses, attack automation, Solana poisoning bots and historical campaigns. The 628,000-to-3.4-million figures are in an Ethereum-led/multichain discussion, not verified Solana counts. No claim that existing protection only happens after a transfer.

### Solscan

https://info.solscan.io/address-poisoning-on-solana/

Published 22 June 2026. Documents address highlighting, personal labels, spam/low-value filters and full-address verification. These are existing alternatives. Explorer limitations do not imply all wallets lack prevention.

## 4. Claim discipline

| Allowed if supported | Unsupported wording to avoid |
|---|---|
| “Matches the address you confirmed” | “Identity verified” |
| “Suspected poisoning pattern in these events” | “Confirmed attacker” from a heuristic |
| “No pattern found in this checked range” | “Safe address” |
| “Observed in this history window” | “Brand-new wallet” without complete evidence |
| “N supported transfers processed for K watched wallets” | “All Solana attacks monitored” |
| “Built and tested with public evidence and devnet scenarios” | “Validated by customers” without participants |
| “Mainnet live analysis; separate devnet send demonstration” | “Mainnet transfer protected” from a devnet test |

Initial business demand, willingness to pay and integrations remain hypotheses. No contacts are needed to continue the build.
