# Architecture: Doppel

Version 3. Contracts and policy: [FRD.md](FRD.md). Gate ledger: [GATES_REPORT.md](GATES_REPORT.md).

## 1. System

```text
Browser: local recipient book + proposed draft
    | exact continuity and revision
    v
packages/sdk + packages/widget ---- POST /api/check ---- ChainReader
    |                                                   | Solami RPC/Data API
    | merged evidence, coverage, draft binding           | public RPC fallback
    v                                                   v
Reference payment app <-------------------------- packages/engine
    | mainnet: prepare/analyze only                      ^
    | devnet: final instruction check -> wallet          |
                                                        |
Local worker: configured watch set -> backfill -> Solami stream
    | normalized events, checkpoints, findings -> local SQLite
    | optional authenticated snapshot upload
    v
Free hosted snapshot store -> GET /api/monitor -> Monitor UI
```

## 2. Stack and packages

| Layer | Choice |
|---|---|
| Language/workspaces | TypeScript, pnpm workspaces, shared schemas |
| Web | Next.js App Router, Tailwind, Radix/shadcn primitives, Lucide; existing UI_SPEC tokens |
| Engine | Pure deterministic TypeScript; no I/O, implicit clocks or hidden provider state |
| Sources | Typed JSON-RPC and documented Solami adapters; official maintained Solana client package/version verified before adoption |
| SDK/widget | Framework-neutral check coordinator and a small React component |
| Recipient storage | Browser IndexedDB, versioned schema and explicit import/export; no sync/backend identity |
| Worker | Node process on builder's PC; documented Yellowstone client or Mirage WebSocket |
| Worker persistence | Local SQLite with checkpoints, evidence and bounded captures; verify Windows-compatible free driver |
| Hosted snapshots | Optional no-card free Postgres, server-side credentials, Drizzle if helpful; not required by core Check |
| Verification | Vitest for deterministic/integration fixtures; a browser runner for signing-boundary and critical UI flows |
| Deployment | Free host/default subdomain within applicable terms/quotas; local worker |

Do not install a paid service to satisfy a framework preference. Confirm hosting terms and no-charge limits at G8.

## 3. Repository layout

```text
apps/web/                 Recipient book, Check, Prepare, Monitor, Method pages and API
apps/worker/              Focused watch loop and capture/recovery
packages/engine/          Similarity, evidence, continuity, policy
packages/sources/         RPC, Solami, normalizers, replay
packages/sdk/             Draft binding, freshness, cancellation, combined result
packages/widget/          Embeddable React pre-send component
tools/harness/            Guarded devnet/local fixtures
fixtures/                 Source manifests, development/holdout cases, bounded captures
docs/                     Measured evaluation, integration guide, operational notes
_build_plan/              This specification
README.md LICENSE .env.example
```

## 4. Data contracts

Publish concrete Zod/TypeScript schemas at M0; names below define the intended boundary.

```ts
type Draft = {
  cluster: 'mainnet-beta' | 'devnet';
  sender: string;
  recipientId: string | null;
  recipientRevision: number | null;
  destination: string;
  asset: 'SOL' | string; // validated canonical mint for this cluster
  amountRaw: string;     // integer, no JS floating point money
};

type TransferEvent = {
  id: string; // cluster + signature + outer/inner instruction path
  cluster: string;
  signature: string;
  slot: number;
  instructionPath: string;
  blockTime: number | null;
  observedAt: number;
  fromOwner: string | null;
  toOwner: string | null;
  sourceTokenAccount?: string;
  destinationTokenAccount?: string;
  asset: string;
  amountRaw: string;
  decimals: number;
  resolution: 'resolved' | 'unsupported' | 'unresolved';
};

interface ChainReader {
  readHistory(request: HistoryRequest): Promise<HistoryEnvelope>;
}
interface TransferSource {
  start(request: WatchRequest, onEvent: (e: TransferEvent) => void): Promise<void>;
  stop(): Promise<void>;
}
```

`HistoryEnvelope` contains normalized events and FRD coverage/origin metadata. No method returns an empty list on timeout. The source must distinguish no observed events from no data.

Engine entry points: `validateAddress`, `compareAddresses`, `evaluateContinuity`, `extractEvidence`, `evaluatePattern`, `evaluatePolicy`. Rule version/config and evaluation time/cutoff are explicit arguments. Return structured facts/reason codes with referenced event IDs; UI translates them into prose.

## 5. History discovery and normalization

### Bounded loader

1. Validate cluster/address and supported mint allowlist. Do not rely on token symbols.
2. Prefer a documented indexed owner-history API if it demonstrably returns the necessary SOL and token transfers with provenance. Verify pagination and historical retention.
3. RPC fallback obtains owner-address signatures **and** signatures for discovered supported token accounts. Incoming SPL transfers may not mention the owner wallet in transaction account keys.
4. Paginate signatures and fetch transaction details through one tier-aware request queue. Merge/dedupe before parsing; avoid separate redundant loaders for counterparties and dust.
5. Parse supported outer/inner System Program and token transfer instructions; resolve account keys, token ownership and mint from transaction metadata/account state when valid. Owner at the event time matters; current ownership is not always historical truth.
6. Exclude failed movements. Do not infer payments from fees/rent/net balances alone. Record unsupported instructions or unresolved owners as coverage gaps.
7. Return bounded results plus range/count/limit metadata and cache provenance.

Current token-account enumeration does not discover all closed historical accounts. The fallback must state this limitation. Unknown ownership, unsupported extensions or incomplete history must not produce a fully covered result.

Asset identities are cluster-specific. Mainnet USDC uses its verified canonical mint. Devnet uses a documented issuer devnet mint if available, or a harness-created six-decimal test token clearly labelled “Test token,” never represented as real USDC. Test-token scenarios prove SPL transfer handling, not mainnet USDC integration; G3 separately requires actual mainnet USDC read evidence.

Default initial budget: 100 unique transactions total across the merged supported sources, configurable depth and time window, bounded by a measured request/deadline budget. Show cap reached and allow incremental work. `complete_within_scope` requires that the explicitly requested scope was resolved, not merely that 100 requests succeeded.

### Performance

Start with conservative configurable Free queue (observed limit 5 RPS; reverify), reserving capacity for health/check traffic. Pro's advertised 200 RPS is not a requirement to saturate it. Retry transient failures with bounded backoff, respect rate-limit responses, and coalesce concurrent reads.

Cache history by cluster/wallet/assets/range/provider with a short TTL and declared age. Cache engine results by evidence revision and rule version. SDK draft binding additionally includes amount, asset and recipient revision. Display cold scan progress; no five-second cold promise.

## 6. Recipient storage

Store `id`, cluster, full address, label, confirmation status/method/time, revision, created/updated timestamps and local address-change history. Browser-local data is user-editable and is not tamper-proof or synced. Provide export/import preview and clear-device warning. Imported records require fresh confirmation.

Keep labels and notes out of network requests and telemetry. Send only required public address/context fields. Exact continuity can still run when the provider is down; chain coverage then becomes unavailable and the reference signing policy pauses.

## 7. Pre-send boundary

1. Canonicalize the draft and selected recipient revision. Generate a deterministic fingerprint; this is correlation, not an authorization signature.
2. Start a cancellable check. Combine local continuity with network evidence. Ignore responses for a superseded draft.
3. Reference default freshness is 30 seconds; recheck after expiry or any draft/recipient revision change. Display evidence age separately from result age.
   Partial-history acknowledgment is kept only in the coordinator for that result; it is not a permanent preference. Cached data age reduces the remaining freshness allowance.
4. On confirmation, compare the current fingerprint, recipient revision, policy and freshness again.
5. Mainnet mode ends at analysis/preparation. Devnet verifies the connected wallet/network and RPC genesis identity against documented expected devnet configuration.
6. Build only supported direct transfers. Decode/inspect the actual unsigned transaction before wallet request: sender, source and destination token-account ownership/mint, amount and cluster must match the draft. Current reference scope requires existing token accounts and rejects all extra instructions, including account creation and compute-budget changes. Adding ATA creation later requires a separate validated flow.
7. Recheck after any rebuild or change. No async response may enable signing for a different draft.
8. Connect an injected signing wallet, match its public key to the checked sender, and request `signTransaction` only. Verify unchanged message and valid signatures, revalidate after approval, and broadcast/confirm through the explicitly checked devnet RPC. Never let wallet-selected network settings choose the broadcast endpoint. Re-read the recipient record before signing/submission; do not trust only a stale component snapshot.

Installed-Phantom compatibility amendment: the post-wallet boundary may accept newly inserted ComputeBudget `SetComputeUnitLimit` (exact 5-byte encoding) and `SetComputeUnitPrice` (exact 9-byte encoding), no duplicates/account operands/other types. Unit limit 1–1,400,000; nonzero price requires explicit limit; ceil(units × microLamports / 1,000,000) must not exceed 10,000 lamports. Final RPC total fee must not exceed 20,000 lamports, and sender must cover the original SOL transfer plus final fee (or token-transfer fee). Strip these validated additions only for semantic comparison; submit the unchanged signed transaction. The only added account may be the readonly nonsigner ComputeBudget program; original account permissions, payment instruction bytes/order/accounts/programs, payer and blockhash remain exact. SDK/app-built inspection remains strict. This amendment supersedes the blanket rejection of wallet-added compute-budget settings, not rejection of other extra instructions.

Fee-cap revision after installed Phantom feedback: replace the initial 10,000/20,000-lamport caps above with **100,000 priority / 120,000 total lamports** (0.0001 / 0.00012 test SOL), displayed from the same constants used by validation. This devnet-only bound accommodates the observed 75,000-lamport priority fee. The USD budget and mainnet read-only restrictions remain unchanged; no automatic cap escalation is allowed.

This is application-level protection. The SDK cannot constrain an unrelated malicious app or edits made outside its integration. A local confirmed contact does not prove identity or defeat a compromised browser.

## 8. Focused worker

- Operator-owned config, maximum five wallets initially. Private Check submissions do not expand this set.
- Discover supported token accounts; subscribe to relevant wallet/token-account activity using documented server filters. Refresh discovery as necessary. Never infer server-side dust filtering exists without documentation.
- Seed history and buffer/reconcile live events at the backfill boundary; record slot cursors and coverage.
- Use one chosen stream transport. Do not implement both merely for prize coverage. Standard RPC WebSocket is not an equivalent full-transaction firehose.
- Prefer confirmed events where the source supports them. Otherwise mark provisional events, confirm/reconcile them and handle dropped forks; do not publish provisional suspicion as finalized fact.
- Persist normalized event IDs, evidence, gaps and checkpoint. Reconnect with bounded exponential backoff; use documented slot replay. If replay is unavailable/outside retention, RPC backfill the watch set. Mark an unresolved gap explicitly.
- Deduplicate by event ID, not signature alone; index all supported transfers from multi-transfer transactions.
- Limit per-wallet history/age and disk capture size. Evictions affect coverage. Do not drop random events while claiming relationships remain fully tracked.
- Default heartbeat interval 10 seconds; stale after 30 seconds plus a small configured transport allowance. Snapshot UI switches to stale/captured, never keeps a live badge indefinitely.

## 9. Persistence and hosted monitor

Local SQLite tables: `events`, `findings`, `checkpoints`, `coverage_gaps`, `heartbeats`. Persist full public addresses and event references as needed for deterministic re-evaluation. Redact personal labels; don't publish a searchable victim list. Truncation is display formatting, not anonymization.

The hosted monitor accepts authenticated, schema-validated snapshots only from the operator's worker. Shared-secret header, constant-time comparison where appropriate, body limits and timestamp/sequence checks. Use a verified free durable store for latest metrics and a bounded set of findings; no serverless local-file persistence assumptions.

The web UI polls cached snapshots at a modest interval instead of requiring indefinite serverless SSE connections. Do not expose write credentials or public arbitrary-watch endpoints. If no free store can be used, serve Monitor in the local runnable demo and label the deployed view as historical; keep the sponsor live-availability gate unresolved until a workable judging route is established.

Public monitor shows truncated addresses by default; case details offer full addresses/explorer references when necessary to inspect a sourced public incident. Explorer links can identify addresses; do not claim anonymity. Separate reported historical incidents from unreviewed automated findings.

## 10. Config

```dotenv
DEFAULT_CLUSTER=mainnet-beta
MAINNET_PROVIDER=solami
SOLAMI_API_KEY=
SOLAMI_RPC_URL=
SOLAMI_DATA_API_URL=
SOLAMI_STREAM_TRANSPORT=mirage
SOLAMI_STREAM_URL=
PUBLIC_RPC_URL=https://api.mainnet-beta.solana.com
DEVNET_RPC_URL=https://api.devnet.solana.com
EXPECTED_DEVNET_GENESIS_HASH=
RPC_RPS_LIMIT=5
CHECK_TTL_SECONDS=30
HISTORY_MAX_TRANSACTIONS=100
WATCH_MAX_WALLETS=5
WATCH_WALLETS=
DUST_SOL_MAX_LAMPORTS=5000
DUST_USDC_MAX_RAW=10000
PATTERN_WINDOW_HOURS=48
RULE_VERSION=0.1
WORKER_DB_PATH=
CAPTURE_MAX_BYTES=
MONITOR_INGEST_URL=
INTERNAL_SHARED_SECRET=
DATABASE_URL=
```

Set documented verified endpoints/genesis/mints at implementation; placeholders are not evidence. Never expose provider keys through public env prefixes. Cluster routes/providers are fixed by server config, not arbitrary user URLs. Explicitly log which non-secret mode/capabilities are active.

## 11. Verification and release

M3 local implementation: Node 24.13 `node:sqlite` (verified SQLite 3.50.4) with metadata, events, findings and gaps tables. Replay cursor and events commit in one transaction. Data stores bind to watch set, source/dataset identity and rule version. Worker uses bounded re-evaluation for late arrivals; epoch-based replay retention uses event timestamps instead of wall clock. Loopback-only HTTP `/snapshot` is proxied through Next `/api/monitor` with schema/body-size/timeout limits and production opt-in. No hosted storage or live adapter is implied by this local path. Live history prefill and actual reconnect/backfill remain pending G1/provider verification.

See G0–G9 in [GATES_REPORT.md](GATES_REPORT.md) and cases in EVALUATION. Necessary checks include normalization, bounded loader coverage, deterministic detection, recipient revisions, async races, signing boundary, cluster guard, duplicate/reconnect/gap handling and free-tier degradation.

Core site must remain usable without the worker. Own-key setup must run live; no silent fixture mode if credentials fail. Hosted provider fallback is explicitly labelled and cannot be presented as a Solami-backed result. Free quotas, trial expiry and actual judging access are release concerns, not assumed solved by recording a video.
