import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); vi.resetModules(); });
describe("server-owned provider configuration", () => {
  it("missing Solami configuration uses public reads and reports fallback, without exposing credentials", async () => {
    vi.stubEnv("MAINNET_PROVIDER", "solami"); vi.stubEnv("SOLAMI_RPC_URL", "");
    const { historyProviderStatus } = await import("../src/lib/history-provider.ts");
    expect(historyProviderStatus().activeProvider).toBe("public-rpc (fallback)");
    expect(historyProviderStatus().primaryConfigured).toBe(false);
  });
  it("reports configured standard RPC separately from unverified streaming", async () => {
    vi.stubEnv("MAINNET_PROVIDER", "solami"); vi.stubEnv("SOLAMI_RPC_URL", "https://rpc.solami.dev/provider-issued-secret-path");
    const { historyProviderStatus } = await import("../src/lib/history-provider.ts");
    expect(historyProviderStatus().primaryConfigured).toBe(true);
    expect(JSON.stringify(historyProviderStatus())).not.toContain("provider-issued-secret-path");
    expect(historyProviderStatus().solamiIntegration).toContain("pending_live_verification");
  });
  it("refuses an unrelated primary URL and keeps public fallback available", async () => {
    vi.stubEnv("MAINNET_PROVIDER", "solami"); vi.stubEnv("SOLAMI_RPC_URL", "https://solami.dev.attacker.example/key");
    const { historyProviderStatus } = await import("../src/lib/history-provider.ts");
    expect(historyProviderStatus().primaryConfigured).toBe(false);
  });
});
