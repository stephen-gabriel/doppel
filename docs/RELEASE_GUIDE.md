# Release preparation (not a deployed release)

## Reproducible local setup

Verified workspace runtime: Node 24.13.0, pnpm 10.18.2. Pin via the root packageManager field. From a fresh source checkout:

```powershell
pnpm install --frozen-lockfile
pnpm typecheck
pnpm lint
pnpm test
pnpm --filter @doppel/web build
pnpm --filter @doppel/web dev
```

Playwright needs its Chromium browser installed: `pnpm exec playwright install chromium`. Then `pnpm test:e2e` starts a dev server; to reuse your running port-3000 server, set `$env:PLAYWRIGHT_REUSE_SERVER='1'` first. No wallet extension or live RPC is used by browser regression fixtures.

Run the replay worker separately as documented in the root README. CLI options come from process environment, not automatically from root `.env`. Next local server configuration belongs in `apps/web/.env.local` or process environment. Never use `NEXT_PUBLIC_` for a provider secret.

A full fresh-copy installation has not yet been independently executed. Existing-workspace frozen-lockfile/install, build and tests are recorded separately. Do not call this a clean-clone pass until performed.

## Current provider behavior

Check defaults to public Solana RPC. A standard-RPC primary can now be configured with `MAINNET_PROVIDER=solami` and the exact authenticated `SOLAMI_RPC_URL` supplied by the provider dashboard. No authentication scheme is guessed; a standalone SOLAMI_API_KEY does not configure RPC. Only HTTPS solami.dev/subdomain primary URLs are accepted. Live account/auth/endpoint behavior still requires G1 verification; streaming remains unimplemented. `/api/status` reports configuration separately from verified operation. Defaults: public 5 requests/second per reader instance, 20-second overall deadline, up to 100 transactions, cache 30 seconds/100 entries.

### Hosted judging after primary access expires

- The primary gets a six-second request budget. Auth/quota/network failures or unavailable responses trigger public-RPC fallback. A one-minute cooldown avoids retrying a known failing primary on every check; later requests probe it again. Ordinary bounded/partial history alone does not trigger failover.
- Check and Prepare visibly identify fallback results. Partially read primary evidence is retained instead of disappearing; incomplete/conflicting results stay partial/review. Primary error details and authenticated endpoint are not exposed. If public RPC also fails, explain the unavailable history; the local saved-address comparison still works and signing stays guarded.
- Browser-local address book and public-devnet execution are independent of Solami.
- Monitor can serve a **build-bundled historical mainnet snapshot**, even when the worker is offline or the deployed runtime restarts. No database or live subscription is needed to display that saved evidence. Capture date, original heartbeat, historical mode and stopped state are explicit.
- The bundled file `apps/web/src/data/monitor-capture.json` holds a **real captured mainnet snapshot**, exported from a live public-RPC run (origin `chain`, cluster `mainnet-beta`, mode `historical`, state `stopped`). It is not live activity and the UI says so. This feature does not manufacture a completed live integration.

After a verified mainnet run, save the worker's `/snapshot` JSON using your operator workflow. Export it with:

```powershell
node --experimental-strip-types apps/worker/src/export-capture.ts path/to/verified-snapshot.json path/to/new-capture-bundle.json
```

Review provenance and contents, then replace `apps/web/src/data/monitor-capture.json` with the export and redeploy. The exporter refuses synthetic/replay/non-mainnet/empty snapshots and refuses to overwrite an existing output file. These checks enforce declared metadata, not independent chain truth: operator provenance review is still required. The bundle is a point-in-time export, not automatic serverless file persistence or a claim of current coverage.

Expiry behavior is regression-tested with controlled provider failures; actual Solami expiry and public deployed network reachability still need verification. Public RPC has no uptime/coverage guarantee. This protects product usability, not a guarantee of judging outcome.

API input is bounded to 8 KB and validated strictly. Instance-local throttle: 10 checks per minute per forwarded-address key; at most 4 active history checks per instance. This is best-effort abuse control, not a distributed limit or authentication. A client-controlled forwarding header is not trusted identity, and serverless replicas can multiply provider load. Shared/global enforcement remains future hosting work.

Cancellation propagates to the reader; aborted queued requests are removed so later checks do not stall. Partial/unavailable provider responses remain visible and never become complete safety results. The free-mode failure browser test exercises HTTP 429 with preserved local mismatch.

## No-charge hosting preparation

Reviewed https://vercel.com/docs/plans/hobby on 2 Oct 2026:
- Hobby is free; usage exhaustion generally pauses features rather than purchasing extra usage.
- Hobby is limited to **non-commercial personal use**. Do not assume every startup/business deployment qualifies. Confirm eligibility for this personal hackathon demo with the host; if it does not qualify, ask for sponsor support or choose a verified suitable free host rather than buying Pro.
- No paid plan/trial, domain, database or payment method has been enabled here.

Candidate Vercel setup, only after account/terms verification:
1. Import the eventual public Git repository (repo creation/push still requires builder instruction).
2. Root directory `apps/web`, Next.js preset, Node 24.x. Include workspace files outside the root as required by Vercel monorepo settings.
3. Install from repository root with `pnpm install --frozen-lockfile`; build web with `pnpm --filter @doppel/web build` from root or `pnpm build` in the app root. Confirm actual working directory in build logs.
4. Use the default free subdomain. Configure only required server environment variables; no secrets in browser bundles.
5. Leave `MONITOR_LOCAL_ENABLED=0`. Hosted functions cannot access the worker on your PC. The public Monitor must show offline until a hosted snapshot solution is implemented.
6. Check the public site logged out, mobile routes, public RPC availability/limits, HTTP errors, and mainnet read-only behavior. Record URL and measurements in G8.

**No hosting account or deployment URL is configured/verified yet.** G8 remains open. Solami own-key startup, trial-expiry behavior and hosted live availability cannot be claimed before M3 live integration.

## Submission prerequisites still open

Sponsor judging-key clarification (builder-pasted Telegram): Civa replied “We will use our key for judging” when another entrant asked about Pro expiry before review. Make the repo runnable with reviewer-supplied credentials; never require our trial key. This addresses the judging credential dependency, not uptime of our hosted demo.

Three independent hosting needs: (1) website/API host, (2) a worker runtime supporting a persistent outbound stream and its checkpoint storage, (3) Solami access for that worker's key. A free worker host can solve (2), but cannot extend (3). Candidate free hosts must be verified for long-lived connections, sleeping/restart behavior, storage persistence, quotas and no mandatory billing. Scheduled/webhook operation could be a separate adaptation if a host cannot run this Node/SQLite process continuously; do not call scheduled polling a live stream. Public web-to-worker connectivity/hosted snapshots also still require implementation.

G1 sponsor access, G3 live USDC/provider coverage, G6 live stream/recovery and stability, independent historical evaluation/G7, actual deployment/clean setup/G8, submission forms/live availability/G9. See `EVALUATION_REPORT.md` for synthetic results and their limits. No external customers or revenue claimed.
