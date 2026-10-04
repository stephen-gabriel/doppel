# Doppel

Check that your next payment goes to the recipient you intended.

M2 takeover: real Ed25519 keys, strict transaction inspection, sign-only wallet integration and explicit devnet broadcasting. Mainnet stays read-only. Solami is not activated.

## Quickstart

Mainnet checking needs **no API key, no account and no funds**.

```bash
pnpm install
pnpm --filter @doppel/web dev
```

Open http://localhost:3000 and use **Check an address**. History reads go to public Solana mainnet-beta RPC — `PUBLIC_RPC_URL`, defaulting to `https://api.mainnet-beta.solana.com`. There is nothing to configure and nothing to buy.

Requires Node 24.13+ and pnpm 10.18.2. Full setup, tests and walkthroughs are below.

## Status

- Disposable keys use `Keypair.generate()` (64-byte secret). The earlier invalid encoded-secret address was discarded and never funded.
- Wallet boundary inspects a compiled `Transaction`, not a descriptive object.
- Proposed destination is independent of the saved recipient selector.
- Real-browser tests cover recipient persistence, mismatch, in-flight edits, expiry, cross-tab changes, partial-history acknowledgment and serialized wallet requests. The injected signing provider in automated tests is a controlled double, not an installed wallet extension.
- Reference policy revision 0.2: an exact confirmed recipient with partial history can proceed only after explicit acknowledgment for that check. Coverage stays partial and pattern may stay unknown. Unavailable/unresolved history and suspicious findings still block. Edits, cancellation, recheck or expiry clear acknowledgment.
- Wallets sign only. Doppel verifies the returned message/signatures, rechecks the current draft and recipient, and submits only to an observed devnet RPC. Account creation and unvalidated extras are rejected; wallet-added compute settings have the bounded exception below. Devnet USDC requires existing associated token accounts; the app does not create them.
- Installed-Phantom SOL walkthrough passed: builder observed blocked mismatch and successful payment; independent devnet RPC confirmed 0.001 SOL transferred with a 0.00008 test SOL fee. G4/G5 pass for this workflow. See `fixtures/g5-confirmed-devnet-transfer.json`. Live USDC execution, other wallets and Solami live streaming remain unverified.
- A verified mainnet monitor capture is bundled for hosted judging: 25 mainnet transactions fetched with no failed requests, 216 parsed events, 17 retained, last observed slot 303463012. Zero poisoning findings were detected for that wallet, which is the honest result rather than a fabricated alert.

## Setup

Requires Node 24.13+ and pnpm 10.18.2. See [release/setup guidance](docs/RELEASE_GUIDE.md), [SDK integration](docs/INTEGRATION.md), and the [frozen-rule evaluation report](docs/EVALUATION_REPORT.md).

```bash
pnpm install
pnpm test
pnpm typecheck
pnpm lint
pnpm test:e2e
pnpm --filter @doppel/web dev
```

For the Next app, put required local settings in `apps/web/.env.local` or process environment; the worker CLI uses process environment. Root `.env` is not automatically loaded by either path here. `.env.example` documents the options. Do not put keys in source control.

## Devnet walkthrough

1. Save and independently confirm a Test network recipient in Address book (`/recipients`).
2. Open Test a payment (`/prepare`), which defaults to devnet, and connect a wallet supporting `connect` and `signTransaction` (Phantom/Solflare injected provider).
3. Select the recipient and independently paste the receiving address. Enter ordinary decimal SOL/USDC amounts, such as `0.001 SOL`; conversion to raw units is exact, never rounded.
4. Check. If eligible partial history is returned, read the limits and explicitly acknowledge them. Verify full recipient/asset/amount before requesting the signature.
5. Doppel signs, verifies and broadcasts via devnet, then displays the confirmed signature. No mainnet send path exists. Use only faucet-funded devnet assets.

Only the sending wallet needs devnet SOL in advance for a SOL payment. The app checks the sender's balance, estimates the fee and checks minimum funding for a brand-new receiver before requesting a signature. It never silently increases the amount. USDC tests additionally require test USDC and existing token accounts.

## Start without funds

Open Check an address (`/`). The matching/lookalike examples make no RPC requests and do not fill or alter your real form. For your own check, enter **Your wallet address**, optionally select **Who are you trying to pay?**, then paste **Address you are about to pay**. Checking requires no funds, fees or wallet connection. **Real network · read-only** means Solana mainnet-beta; “beta” is the network's name, not a restriction on checking it.

If your dev server is already running, PowerShell can reuse it for isolated browser tests:

```powershell
$env:PLAYWRIGHT_REUSE_SERVER='1'; pnpm test:e2e
```

The signing-only integration currently targets injected provider APIs, not every Wallet Standard wallet. Phantom documents this method as a legacy injected API that may change; unsupported providers are rejected instead of silently switching to wallet-managed broadcasting. See https://docs.phantom.com/solana/sending-a-transaction . The builder's installed Phantom SOL flow has been verified; other providers are not yet verified.

Phantom may add compute-unit limit/price instructions when signing. The devnet wallet boundary permits only these two exact instruction types, at most once each, with no account operands. Compute units must be 1–1,400,000; a nonzero price requires an explicit unit limit. Priority fee is rounded up with integer arithmetic and capped at 100,000 lamports (0.0001 test SOL). The final RPC-estimated total fee is capped at 120,000 lamports (0.00012 test SOL) and sender funding is rechecked. These devnet-only caps accommodate the builder-observed 75,000-lamport Phantom priority fee; they do not authorize mainnet spending. Original payment instructions, account permissions, payer and blockhash must remain identical. The app-built transaction inspector still rejects arbitrary extras. Real Phantom end-to-end confirmation remains pending until the builder retries.

Free live harness probe (generates disposable keys in memory, prints no secrets; sends one devnet SOL transfer only if faucet funding and all checks succeed):

```bash
node --experimental-strip-types tools/harness/tests/devnet-verification.sample.ts
```

Gate evidence is reproducible from this repository: `pnpm test` (142 tests), `pnpm typecheck`, `pnpm lint`, `pnpm test:e2e` (18 browser tests) and `pnpm --filter @doppel/web build` all pass, and `apps/web/src/data/monitor-capture.json` records a real public-RPC mainnet capture. Synthetic history/provider tests are not live-chain or extension validation.

## Budget

Target $0. Hard cap $2 total and $0.50 upfront per transaction. No purchases are required for the current milestone.

## Local Monitor (M3 preparation)

Requires Node **24.13+** for the verified built-in `node:sqlite` runtime (currently emits an experimental-feature notice). No cloud database, new paid dependency or API key is needed.

Keep the site running, then open another terminal in the project root:

```powershell
pnpm --filter @doppel/worker replay
```

Open **http://localhost:3000/monitor**. The page polls the worker through `/api/monitor`. The worker binds **127.0.0.1:4318** only and exposes read-only `/snapshot`; it is not a public remote service. The bundled replay uses one synthetic wallet cohort, a payment/lookalike pair, duplicate delivery, two transfers sharing a signature, and a simulated disconnect/recovery. Every result is explicitly synthetic replay, not live mainnet.

- SQLite lives in `worker-data/synthetic-monitor.sqlite` (ignored by source control).
- Retains up to 1,000 relevant events and a 48-hour event-time window by default. Eviction creates a visible coverage gap. Findings are recomputed against retained evidence, including late arrivals.
- A completed replay stays completed. Restart resumes its durable cursor without incrementing delivery/finding counts again. Dataset/watch/rule configuration changes require a separate DB.
- To run once and exit: `pnpm --filter @doppel/worker replay --once`.
- To replay from the beginning without deleting old evidence, set a fresh filename before starting:

```powershell
$env:WORKER_DB_PATH='worker-data/replay-second.sqlite'
pnpm --filter @doppel/worker replay
```

Worker options are environment variables: `MONITOR_MODE=replay`, `MONITOR_PORT=4318`, `REPLAY_INTERVAL_MS=1000`, `WORKER_DB_PATH`. The CLI does not auto-load `.env`. The web app and worker need the same port if changed. Bundled replay rejects custom `WATCH_WALLETS` rather than pretending to monitor them. Unsupported live modes fail explicitly.

Production web deployment defaults to the bundled historical mainnet capture; `MONITOR_LOCAL_ENABLED=1` is for a deliberately co-located local worker, not a way to reach the builder's PC from Vercel. Hosted snapshot ingestion/storage is not yet implemented.

**Still pending in M3:** G1 promotional access, verified Yellowstone/Mirage adapter, actual mainnet history prefill/owner discovery, real replay-window/backfill recovery, five-minute capability probe, and one-hour mainnet stability measurement. The local replay and simulated recovery do not satisfy those sponsor gates. Public Solami overview was checked, but its stream wire format and account entitlements have not been verified; no endpoints or filters were guessed.

## Hosted fallback for judging

The core remains usable independently of a Pro stream. Check supports a configured standard Solami RPC primary with public-mainnet RPC failover; missing configuration/access failures are visibly labelled. Provider downtime does not remove the local recipient comparison. Public RPC can also be limited/unavailable, in which case history is explicitly unknown.

### Optional: bring your own Solami RPC

You do not need this to use the app. Public RPC rate-limits aggressively (5 rps by default, `RPC_RPS_LIMIT`); if you have a Solami endpoint you can raise that.

| Variable | Purpose |
| --- | --- |
| `MAINNET_PROVIDER` | Set to `solami` to opt in. Any other value keeps public RPC. |
| `SOLAMI_RPC_URL` | The full authenticated HTTPS URL from the Solami dashboard. |
| `SOLAMI_RPC_RPS_LIMIT` | Requests per second for the primary. Default 5. |

Set these in `apps/web/.env.local` or the process environment. Two deliberate limits are worth knowing:

- **The URL host is restricted to `solami.dev`.** Any other host is ignored and the app stays on public RPC rather than sending traffic to an unvetted endpoint. A Helius or QuickNode key cannot be used in this slot.
- **It reports `solami-rpc (not yet verified)`.** No Solami account has been activated, so no endpoint or response shape has been confirmed. Treat this as configuration plumbing, not a validated integration.

Check what is actually live at any time:

```bash
curl -s http://localhost:3000/api/status
```

`provider` and `providerRouting` report the live provider and any active fallback; `solamiIntegration` currently reads `rpc_configurable_stream_pending`.

Monitor supports a reviewed historical mainnet snapshot bundled at deployment. Live/offline/captured states and capture dates are distinct. The bundle now contains a real capture taken from live mainnet public RPC (see `apps/web/src/data/monitor-capture.json`), forced to historical/stopped and never presented as live activity. It records zero poisoning findings for the observed wallet, which is the honest result; the synthetic replay is never substituted as mainnet evidence. See `docs/RELEASE_GUIDE.md` for configuration, capture export and limits.

Recreate or refresh the capture yourself (free public RPC, no API key):

```bash
node --experimental-strip-types apps/worker/src/capture-mainnet.ts <wallet> captures/mainnet-wallet.json 25
node --experimental-strip-types apps/worker/src/export-capture.ts captures/mainnet-wallet.json apps/web/src/data/monitor-capture.json
```

The exporter refuses synthetic/replay/non-mainnet input and will not overwrite an existing bundle. Public mainnet RPC rate-limits aggressively; the capture tool backs off on HTTP 429 so a capture is not silently truncated.

Solami's Civa said “We will use our key for judging” in the builder-pasted Telegram exchange. Judge-supplied credentials support repo-based review; this is separate from the hosted site's key. Trial not activated, live sponsor verification and deployment still pending.
