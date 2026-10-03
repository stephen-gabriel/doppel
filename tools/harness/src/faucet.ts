import { assertDevnetEndpoint, assertObservedDevnetGenesis, fetchRpcGenesis } from "./cluster.ts";

export async function requestAirdrop(
  endpoint: string,
  publicKey: string,
  lamports = 1_000_000,
  fetchImpl: typeof fetch = fetch,
): Promise<{ ok: boolean; signature?: string; error?: string; source: string }> {
  assertDevnetEndpoint(endpoint);
  try {
    assertObservedDevnetGenesis(await fetchRpcGenesis(endpoint, fetchImpl));
    const response = await fetchImpl(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "requestAirdrop",
        params: [publicKey, lamports],
      }),
      signal: AbortSignal.timeout(20_000),
    });
    if (!response.ok) return { ok: false, error: `faucet_http_${response.status}`, source: endpoint };
    const payload = (await response.json()) as { result?: string; error?: { message: string } };
    if (payload.error) {
      return { ok: false, error: payload.error.message, source: endpoint };
    }
    if (!payload.result) {
      return { ok: false, error: "airdrop_empty_result", source: endpoint };
    }
    return { ok: true, signature: payload.result, source: endpoint };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "airdrop_failed",
      source: endpoint,
    };
  }
}

export async function tryFreeFaucets(
  publicKey: string,
  lamports = 1_000_000,
): Promise<{ ok: boolean; signature?: string; error?: string; source: string }> {
  const endpoints = [
    process.env.DEVNET_RPC_URL ?? "https://api.devnet.solana.com",
    "https://api.devnet.solana.com",
  ];
  let last: { ok: boolean; signature?: string; error?: string; source: string } = {
    ok: false,
    error: "no_faucet_attempted",
    source: "",
  };
  for (const endpoint of [...new Set(endpoints)]) {
    last = await requestAirdrop(endpoint, publicKey, lamports);
    if (last.ok) {
      return last;
    }
  }
  return last;
}
