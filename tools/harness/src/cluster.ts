import { Connection } from "@solana/web3.js";

export const HARNESS_CLUSTER = "devnet" as const;
export const EXPECTED_DEVNET_GENESIS =
  "EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG";

export type RpcIdentity = {
  genesisHash: string;
  endpoint: string;
  observed: boolean;
};

export function assertDevnetOnly(cluster: string): void {
  if (cluster !== "devnet") {
    throw new Error("Harness refuses non-devnet clusters.");
  }
}

export function assertDevnetEndpoint(endpoint: string, cluster: "devnet" | "local-test" = "devnet"): void {
  let parsed: URL;
  try {
    parsed = new URL(endpoint);
  } catch {
    throw new Error("Harness refuses invalid RPC URL.");
  }
  const host = parsed.hostname.toLowerCase();
  if (cluster === "local-test") {
    if (host !== "localhost" && host !== "127.0.0.1") {
      throw new Error("Local harness refuses non-local RPC endpoint.");
    }
    return;
  }
  const allowed = parsed.protocol === "https:" && !parsed.username && !parsed.password &&
    (host === "api.devnet.solana.com" || host.endsWith(".devnet.solana.com"));
  if (!allowed) {
    throw new Error("Harness refuses non-devnet RPC endpoint.");
  }
}

export async function fetchRpcGenesis(endpoint: string, fetchImpl: typeof fetch = fetch): Promise<RpcIdentity> {
  assertDevnetEndpoint(endpoint);
  const response = await fetchImpl(endpoint, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "getGenesisHash", params: [] }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error(`genesis_http_${response.status}`);
  const payload = (await response.json()) as { result?: string; error?: { message: string } };
  if (!payload.result) {
    throw new Error(payload.error?.message ?? "genesis_unavailable");
  }
  return { endpoint, genesisHash: payload.result, observed: true };
}

export function assertObservedDevnetGenesis(
  identity: RpcIdentity,
): void {
  if (!identity.observed) {
    throw new Error("Harness refuses an unobserved genesis hash.");
  }
  assertDevnetEndpoint(identity.endpoint);
  if (identity.genesisHash !== EXPECTED_DEVNET_GENESIS) {
    throw new Error("Harness refuses RPC whose observed genesis hash is not the configured devnet genesis.");
  }
}

export function connectionFor(endpoint: string): Connection {
  return new Connection(endpoint, "confirmed");
}
