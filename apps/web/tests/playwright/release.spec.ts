import { expect, test } from "@playwright/test";
const ADDRESS = "4yfu48qwim7hGzD3Nphzd2A6ThydzysfKi4wBPFSgnhY";

test("mobile keyboard address-book flow, visible focus, reduced motion, and import preview", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/recipients");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Skip to content" })).toBeFocused();
  await page.keyboard.press("Enter");
  const name = page.getByRole("textbox", { name: "Recipient name", exact: true });
  await name.focus(); await page.keyboard.type("Keyboard recipient");
  expect(await name.evaluate((element) => getComputedStyle(element).outlineStyle)).toBe("solid");
  await page.keyboard.press("Tab"); await page.keyboard.type(ADDRESS);
  await page.keyboard.press("Tab"); await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "Review recipient", exact: true })).toBeFocused();
  await page.keyboard.press("Enter");
  await page.getByRole("button", { name: "Confirm this record" }).focus(); await page.keyboard.press("Enter");
  await expect(page.getByText("Real network · Confirmed by you · version 1")).toBeVisible();
  const exported = { version: 1, exportedAt: 1, recipients: [{ id: "imported", cluster: "devnet", address: ADDRESS,
    label: "Imported recipient", confirmationStatus: "confirmed", confirmationMethod: "old", confirmedAt: 1,
    revision: 1, createdAt: 1, updatedAt: 1, addressHistory: [] }] };
  await page.getByLabel("Preview an address-book file").setInputFiles({ name: "book.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify(exported)) });
  await expect(page.getByText("Review the import below. Nothing has been saved yet.")).toBeVisible();
  await expect(page.locator("article")).toHaveCount(1);
  await page.getByRole("button", { name: "Import reviewed records" }).click();
  await expect(page.locator("article")).toHaveCount(2);
  await expect(page.getByText("Test network · Needs confirmation · version 1")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByLabel("Preview an address-book file").setInputFiles({ name: "bad.json", mimeType: "application/json", buffer: Buffer.from("not json") });
  await expect(page.getByText(/Could not read this address-book file/)).toBeVisible();
});

test("public API rejects invalid/oversized inputs and exposes an honest provider status", async ({ request }) => {
  const invalid = await request.post("/api/check", { data: { cluster: "devnet", sender: "bad", destination: "bad", asset: "SOL" } });
  expect(invalid.status()).toBe(400);
  const large = await request.post("/api/check", { data: { value: "x".repeat(9000) } });
  expect(large.status()).toBe(413);
  const status = await (await request.get("/api/status")).json();
  expect(status.provider).toBe("public-rpc"); expect(status.solamiIntegration).toBe("rpc_configurable_stream_pending");
});

test("provider failure gives a useful result without losing a saved-recipient mismatch", async ({ page }) => {
  await page.goto("/recipients");
  await page.getByLabel("Recipient name", { exact: true }).fill("Payee");
  await page.getByLabel("Full receiving address", { exact: true }).fill(ADDRESS);
  await page.getByRole("button", { name: "Review recipient", exact: true }).click();
  await page.getByRole("button", { name: "Confirm this record" }).click();
  await page.route("**/api/check", (route) => route.fulfill({ status: 429, json: { error: "rate_limited", message: "Too many checks. Wait a minute and try again." } }));
  await page.goto("/");
  await page.getByRole("textbox", { name: "Your wallet address", exact: true }).fill(ADDRESS);
  await page.getByRole("combobox", { name: "Who are you trying to pay?", exact: true }).selectOption({ index: 1 });
  await page.getByRole("textbox", { name: "Address you are about to pay", exact: true }).fill("4yfuQCL4fnNfSbBgqFcPTFn5GGZABDaEFQLhGpwjizcY");
  await page.getByRole("button", { name: "Check address", exact: true }).click();
  await expect(page.getByText(/History could not be loaded. Your saved-address comparison still works/)).toBeVisible();
  await expect(page.getByText(/Different from your saved recipient. Get the address again/)).toBeVisible();
});

test("public fallback notice is visible without opening technical details", async ({ page }) => {
  await page.route("**/api/check", (route) => route.fulfill({ json: { events: [], coverage: {
    status: "partial", wallet: ADDRESS, cluster: "mainnet-beta", origin: "chain", mode: "historical",
    provider: "public-rpc (fallback)", ruleVersion: "0.1", checkedAt: Date.now(), requestedFrom: null,
    requestedTo: null, observedFrom: null, observedTo: null, lastEvaluatedSlot: null,
    requestedTransactionCount: 40, fetchedTransactionCount: 0, tokenAccountDiscovery: "partial",
    unsupportedEventCount: 0, unresolvedEventCount: 0, limitReason: "transaction_cap", cacheAgeSeconds: 0,
    warnings: ["Primary access denied; browser fixture only."],
  } } }));
  await page.goto("/");
  await page.getByRole("textbox", { name: "Your wallet address", exact: true }).fill(ADDRESS);
  await page.getByRole("textbox", { name: "Address you are about to pay", exact: true }).fill(ADDRESS);
  await page.getByRole("button", { name: "Check address", exact: true }).click();
  await expect(page.getByText(/Using public Solana RPC because the primary provider/)).toBeVisible();
  await expect(page.getByText("Some history could not be checked.", { exact: true })).toBeVisible();
});
