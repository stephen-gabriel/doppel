import type { Cluster } from "./schemas.ts";

export const NATIVE_SOL_ASSET = "SOL";

export const MAINNET_USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
export const DEVNET_CIRCLE_USDC_MINT = "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU";

export type AssetKind = "sol" | "canonical_usdc" | "test_token" | "unsupported";

export type ResolvedAsset = {
  id: string;
  kind: AssetKind;
  decimals: number | null;
  cluster: Cluster;
  displayLabel: string;
};

export function canonicalUsdcMint(cluster: Cluster): string | null {
  if (cluster === "mainnet-beta") {
    return MAINNET_USDC_MINT;
  }
  if (cluster === "devnet") {
    return DEVNET_CIRCLE_USDC_MINT;
  }
  return null;
}

export function poisoningHistoryAssets(cluster: Cluster): string[] {
  const assets = [NATIVE_SOL_ASSET];
  const usdc = canonicalUsdcMint(cluster);
  if (usdc) {
    assets.push(usdc);
  }
  return assets;
}

export function resolveAsset(cluster: Cluster, assetId: string): ResolvedAsset {
  if (assetId === NATIVE_SOL_ASSET) {
    return {
      id: NATIVE_SOL_ASSET,
      kind: "sol",
      decimals: 9,
      cluster,
      displayLabel: "SOL",
    };
  }

  const usdc = canonicalUsdcMint(cluster);
  if (usdc !== null && assetId === usdc) {
    return {
      id: assetId,
      kind: "canonical_usdc",
      decimals: 6,
      cluster,
      displayLabel: "USDC",
    };
  }

  if (assetId === MAINNET_USDC_MINT && cluster !== "mainnet-beta") {
    return {
      id: assetId,
      kind: "unsupported",
      decimals: 6,
      cluster,
      displayLabel: "USDC mint (wrong cluster)",
    };
  }

  if (assetId === "USDC" || assetId.toLowerCase() === "usdc") {
    return {
      id: assetId,
      kind: "unsupported",
      decimals: null,
      cluster,
      displayLabel: "USDC symbol (not a mint)",
    };
  }

  if (cluster === "devnet" || cluster === "local-test") {
    return {
      id: assetId,
      kind: "test_token",
      decimals: null,
      cluster,
      displayLabel: "Test token",
    };
  }

  return {
    id: assetId,
    kind: "unsupported",
    decimals: null,
    cluster,
    displayLabel: "Unsupported mint",
  };
}

export function isSupportedCheckAsset(cluster: Cluster, assetId: string): boolean {
  const resolved = resolveAsset(cluster, assetId);
  return resolved.kind === "sol" || resolved.kind === "canonical_usdc";
}

export function isSupportedPaymentAsset(cluster: Cluster, assetId: string): boolean {
  return isSupportedCheckAsset(cluster, assetId);
}
