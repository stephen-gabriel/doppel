import { describe, expect, it } from "vitest";
import {
  DEVNET_CIRCLE_USDC_MINT,
  MAINNET_USDC_MINT,
  isSupportedCheckAsset,
  poisoningHistoryAssets,
  resolveAsset,
} from "../src/assets.ts";

describe("asset identity", () => {
  it("treats native SOL as supported on every cluster", () => {
    expect(resolveAsset("mainnet-beta", "SOL").kind).toBe("sol");
    expect(isSupportedCheckAsset("devnet", "SOL")).toBe(true);
  });

  it("accepts only the verified mainnet USDC mint on mainnet", () => {
    const resolved = resolveAsset("mainnet-beta", MAINNET_USDC_MINT);
    expect(resolved.kind).toBe("canonical_usdc");
    expect(resolved.displayLabel).toBe("USDC");
    expect(isSupportedCheckAsset("mainnet-beta", "USDC")).toBe(false);
    expect(resolveAsset("mainnet-beta", "USDC").kind).toBe("unsupported");
  });

  it("does not treat the mainnet USDC mint as canonical on devnet", () => {
    const resolved = resolveAsset("devnet", MAINNET_USDC_MINT);
    expect(resolved.kind).toBe("unsupported");
    expect(isSupportedCheckAsset("devnet", MAINNET_USDC_MINT)).toBe(false);
  });

  it("labels a non-canonical devnet mint as a test token, not USDC", () => {
    const mint = "So11111111111111111111111111111111111111112";
    const resolved = resolveAsset("devnet", mint);
    expect(resolved.kind).toBe("test_token");
    expect(resolved.displayLabel).toBe("Test token");
    expect(isSupportedCheckAsset("devnet", mint)).toBe(false);
  });

  it("lists SOL and canonical USDC for poisoning history independently of payment asset", () => {
    expect(poisoningHistoryAssets("mainnet-beta")).toEqual(["SOL", MAINNET_USDC_MINT]);
    expect(poisoningHistoryAssets("devnet")).toEqual(["SOL", DEVNET_CIRCLE_USDC_MINT]);
  });

  it("accepts Circle's documented devnet USDC mint on devnet only", () => {
    expect(resolveAsset("devnet", DEVNET_CIRCLE_USDC_MINT).kind).toBe("canonical_usdc");
    expect(resolveAsset("mainnet-beta", DEVNET_CIRCLE_USDC_MINT).kind).toBe("unsupported");
  });
});
