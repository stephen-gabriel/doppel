# Doppel — demo narration

Voice: local Kokoro `af_heart`, English, speed 0.9. One continuous take, placed at 1.0s.
Claims are limited to what the build actually does. No live-attack or customer claims.

---

These two Solana addresses are not the same.

Same first four characters. Same last one. Everything that a wallet shows you, matching.

That is address poisoning. An attacker sends you a worthless dust transfer from a lookalike
address, so it lands in your history. Later, you copy from that history, and pay the attacker.

Doppel checks the recipient before you sign.

Paste the address you are about to pay. Doppel reads real mainnet history over public RPC.
No wallet connection, no funds, no signature.

When you have paid someone before, Doppel compares that saved recipient against the address
in front of you right now.

Here the first four and last one characters match, and everything between them does not.
Doppel shows the difference, explains the evidence, and blocks the request.

The signing button stays disabled. The wallet is never asked.

Replace it with the address you actually confirmed, and the check clears. On devnet, the
payment goes through normally.

Doppel also monitors saved recipients. This is real captured mainnet history, labelled as
historical, never shown as live activity. For this wallet it reports zero findings, which is
the honest result.

Doppel is open source, and it runs on free public RPC with no API key.

Check the recipient before you sign.
