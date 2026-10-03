# M3 — Solami mainnet data and focused monitor

Target: 6–9 Oct. Depends on local pipeline readiness; actual sponsored features require G1. Cost: $0. Do not purchase access if entitlement fails.

## Access gate

1. Builder reviews referral signup/payment conditions, activation trigger, overages and expiry.
2. Activate only when implementation is ready. Record actual UTC activation/expiry and effective capabilities in G1. Never enter payment details or top up.
3. Ask about free judging-period access and the live + historical security-demo format. Local work can continue while awaiting responses.

## Build

1. Read current Solami docs. Implement meaningful history through verified RPC/Data API capabilities. Finish sponsor portion of G3 with actual data.
2. Choose Yellowstone or Mirage, based on documented filters/client behavior. Implement one transport, not both for appearances.
3. Run a five-minute capability probe on a bounded watch set: supported event rate, bytes if available, parser results, latency definition, memory and filter/replay limits.
4. Build 1–5 wallet monitor with history seeding, token-account discovery, event ordering/dedupe, SQLite checkpointing, bounded capture and gap recovery.
5. Implement retry/replay or RPC backfill with explicit gaps when recovery is incomplete.
6. Build Monitor UI and optional authenticated free hosted snapshot path. Core Check remains independent of hosted storage.

## Verify

- G6: one-hour run within configured memory/storage limits; meaningful supported transfer processing, not only slot heartbeats.
- Restart/reconnect, duplicate events, multi-transfer signatures and gap handling tested with real observations plus labelled replay tests.
- If no suspicious event occurs, report zero; do not fabricate or stage a mainnet attack.
- Monitor identifies watch scope, backfill state, coverage, provisional/finalized semantics and stale heartbeats correctly.
- Solami outage/fallback is visible. Trial failure blocks sponsor readiness but not the core product.

Record G1, sponsor G3 and G6. Keep captures bounded and label source/mode. Report and await M4 approval.
