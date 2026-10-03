import { clusterEndpoint, FallbackChainReader, RpcChainReader, type ChainReader } from "@doppel/sources";

const readers = new Map<string, ChainReader>();
let mainnetFallback: FallbackChainReader | null = null;

function rate(value: string | undefined, fallback: number) {
  const number = Number(value ?? fallback);
  return Number.isFinite(number) && number > 0 && number <= 200 ? number : fallback;
}

function primaryEndpoint(): string | null {
  if (process.env.MAINNET_PROVIDER !== "solami") return null;
  try {
    // Use the exact authenticated RPC URL supplied by the provider's dashboard.
    // No invented query/header authentication scheme and no key exposed to the browser.
    const url = new URL(process.env.SOLAMI_RPC_URL ?? "");
    if (url.protocol !== "https:" || !(url.hostname === "solami.dev" || url.hostname.endsWith(".solami.dev"))) return null;
    return url.href;
  } catch { return null; }
}

export function historyProviderStatus() {
  const wantsSolami = process.env.MAINNET_PROVIDER === "solami";
  return {
    primaryConfigured: primaryEndpoint() !== null,
    configuredProvider: wantsSolami ? "solami-rpc" : "public-rpc",
    activeProvider: wantsSolami && (!primaryEndpoint() || mainnetFallback?.status().fallbackActive)
      ? "public-rpc (fallback)" : primaryEndpoint() ? "solami-rpc (not yet verified)" : "public-rpc",
    fallback: mainnetFallback?.status() ?? null,
    publicRpsLimit: rate(process.env.RPC_RPS_LIMIT, 5),
    solamiIntegration: "standard_rpc_configurable; stream_pending_live_verification",
  };
}

export function readerFor(cluster: "mainnet-beta" | "devnet"): ChainReader {
  const existing = readers.get(cluster); if (existing) return existing;
  const publicReader = new RpcChainReader({ endpoint: clusterEndpoint(cluster),
    provider: cluster === "devnet" ? "devnet-rpc" : "public-rpc", rpsLimit: rate(process.env.RPC_RPS_LIMIT, 5) });
  const endpoint = cluster === "mainnet-beta" ? primaryEndpoint() : null;
  let reader: ChainReader = publicReader;
  if (endpoint) {
    const primary = new RpcChainReader({ endpoint, provider: "solami-rpc", rpsLimit: rate(process.env.SOLAMI_RPC_RPS_LIMIT, 5) });
    mainnetFallback = new FallbackChainReader(primary, publicReader);
    reader = mainnetFallback;
  } else if (cluster === "mainnet-beta" && process.env.MAINNET_PROVIDER === "solami") {
    reader = { async readHistory(request, signal) {
      const result = await publicReader.readHistory(request, signal);
      return { ...result, coverage: { ...result.coverage, provider: "public-rpc (fallback)", warnings: [
        "Solami RPC is not configured with a valid provider URL. Using public Solana RPC; live monitoring is separate.", ...result.coverage.warnings,
      ] } };
    } };
  }
  readers.set(cluster, reader); return reader;
}
