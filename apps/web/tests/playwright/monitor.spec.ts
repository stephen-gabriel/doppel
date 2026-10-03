import { expect, test } from "@playwright/test";
import { DEMO_STEPS, DEMO_WALLETS } from "../../../worker/src/demo.ts";
import type { MonitorSnapshot } from "@doppel/engine";

function snapshot(): MonitorSnapshot {
  const evidence = DEMO_STEPS.slice(0, 2).flatMap((step) => step.type === "event" ? [step.event] : []);
  return {
    version: 1, sessionId: "browser-test", source: { cluster: "mainnet-beta", origin: "synthetic", mode: "replay", provider: "browser test replay" },
    state: "completed", startedAt: Date.now() - 10000, heartbeatAt: Date.now(), watchCount: 1,
    assets: ["SOL"], historyWindowHours: 48, coverage: "partial",
    warnings: ["Synthetic test, not live chain traffic."],
    metrics: { received: 5, retained: 4, duplicates: 1, ignored: 0, evicted: 0, reconnects: 1,
      restarts: 0, lastSlot: 120, cursor: 7, processingSamples: 5, processingMeanMs: 2 },
    gaps: [{ id: 1, reason: "Synthetic disconnect recovered", openedAt: Date.now() - 1000, recoveredAt: Date.now() }],
    findings: [{ id: "example", wallet: DEMO_WALLETS[0]!, destination: evidence[0]!.fromOwner!,
      label: "suspected_poisoning", ruleVersion: "0.1", detectedAt: Date.now(), evidence }],
  };
}

test("Monitor is offline without a worker and explains how to start replay", async ({ page }) => {
  await page.route("**/api/monitor", (route) => route.fulfill({ json: { status: "offline" } }));
  await page.goto("/monitor");
  await expect(page.getByText("Monitor offline", { exact: true })).toBeVisible();
  await expect(page.getByText("pnpm --filter @doppel/worker replay", { exact: true })).toBeVisible();
  await expect(page.getByText("Live chain monitoring", { exact: true })).toHaveCount(0);
});

test("replay findings are labelled, inspectable on mobile and turn stale when the worker disappears", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  let online = true;
  await page.route("**/api/monitor", (route) => route.fulfill({ json: online
    ? { status: "available", snapshot: snapshot() } : { status: "offline" } }));
  await page.goto("/monitor");
  await expect(page.getByText("Synthetic replay · not live mainnet", { exact: true })).toBeVisible();
  await page.getByText(/Suspected lookalike pattern ·/).click();
  await expect(page.getByText(/first 4 and last 1 characters match/)).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  online = false;
  await expect(page.getByText("Worker offline or stale — last captured snapshot", { exact: true })).toBeVisible({ timeout: 10000 });
  await expect(page.getByText("Live chain monitoring", { exact: true })).toHaveCount(0);
});

test("old heartbeat cannot appear live even if upstream claims available", async ({ page }) => {
  const old = snapshot(); old.source = { cluster: "mainnet-beta", origin: "chain", mode: "live", provider: "test" };
  old.state = "running"; old.heartbeatAt = Date.now() - 60000;
  await page.route("**/api/monitor", (route) => route.fulfill({ json: { status: "available", snapshot: old } }));
  await page.goto("/monitor");
  await expect(page.getByText("Worker offline or stale — last captured snapshot", { exact: true })).toBeVisible();
  await expect(page.getByText("Live chain monitoring", { exact: true })).toHaveCount(0);
});

test("judging mode presents durable captures as historical and leaves address checks usable", async ({ page }) => {
  const captured = snapshot(); captured.source = { cluster: "mainnet-beta", origin: "chain", mode: "historical", provider: "Solami capture (browser fixture)" };
  captured.state = "stopped"; captured.heartbeatAt = Date.now() - 86400000;
  await page.route("**/api/monitor", (route) => route.fulfill({ json: { status: "captured", capturedAt: captured.heartbeatAt,
    message: "Live monitoring is unavailable. These are previously captured mainnet observations, not current activity.", snapshot: captured } }));
  await page.goto("/monitor");
  await expect(page.getByText("Captured mainnet observations · not live", { exact: true })).toBeVisible();
  await expect(page.getByText(/Capture exported:/)).toBeVisible();
  await expect(page.getByText("Live chain monitoring", { exact: true })).toHaveCount(0);
  await page.getByRole("navigation", { name: "Primary", exact: true }).getByRole("link", { name: "Check an address" }).click();
  await expect(page.getByRole("textbox", { name: "Your wallet address", exact: true })).toBeVisible();
});

test("deployed monitor serves the real bundled mainnet capture with no worker running", async ({ page, request }) => {
  const payload = await (await request.get("/api/monitor")).json();
  expect(payload.status).toBe("captured");
  expect(payload.snapshot.source.origin).toBe("chain");
  expect(payload.snapshot.source.cluster).toBe("mainnet-beta");
  expect(payload.snapshot.source.mode).toBe("historical");
  expect(payload.snapshot.state).toBe("stopped");
  expect(payload.snapshot.metrics.retained).toBeGreaterThan(0);
  expect(payload.snapshot.metrics.lastSlot).toBeGreaterThan(0);
  await page.goto("/monitor");
  await expect(page.getByText("Captured mainnet observations · not live", { exact: true })).toBeVisible();
  await expect(page.getByText("Live chain monitoring", { exact: true })).toHaveCount(0);
});
