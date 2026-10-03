import { expect, test, type Page } from "@playwright/test";

const SENDER = "5LbwC1ewY3Sca7T8CwzX9wsjvwMAHbdRo6SCQL8j7EWc";
const REAL = "4yfu48qwim7hGzD3Nphzd2A6ThydzysfKi4wBPFSgnhY";
const SPOOF = "4yfuQCL4fnNfSbBgqFcPTFn5GGZABDaEFQLhGpwjizcY";
const GENESIS = "EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG";

async function seedRecipient(page: Page) {
  await page.goto("/recipients");
  await page.getByPlaceholder("Label").fill("Grant");
  await page.getByPlaceholder("Full address").fill(REAL);
  await page.getByRole("combobox", { name: "Network", exact: true }).selectOption("devnet");
  await page.getByRole("button", { name: "Review recipient", exact: true }).click();
  await page.getByRole("button", { name: "Confirm this record" }).click();
  await expect(page.getByText("Test network · Confirmed by you · version 1")).toBeVisible();
}

async function prepare(page: Page) {
  await page.goto("/prepare");
  await page.getByRole("combobox", { name: "Network", exact: true }).selectOption("devnet");
  await page.getByRole("textbox", { name: "Your sending wallet", exact: true }).fill(SENDER);
  await page.getByRole("combobox", { name: "Who are you trying to pay?", exact: true }).selectOption({ index: 1 });
  await expect(page.getByRole("textbox", { name: "Address you are about to pay", exact: true })).toHaveValue("");
  await page.getByRole("textbox", { name: "Address you are about to pay", exact: true }).fill(REAL);
}

async function mockHistory(page: Page, options: { status?: string; unresolved?: number; delay?: number } = {}) {
  await page.route("**/api/check", async (route) => {
    const body = route.request().postDataJSON() as { sender: string; cluster: string };
    if (options.delay) await new Promise((resolve) => setTimeout(resolve, options.delay));
    await route.fulfill({ json: { events: [], coverage: {
      status: options.status ?? "partial", wallet: body.sender, cluster: body.cluster,
      origin: "synthetic", mode: "replay", provider: "Playwright fixture", ruleVersion: "0.1",
      checkedAt: Date.now(), requestedFrom: null, requestedTo: null, observedFrom: null, observedTo: null,
      lastEvaluatedSlot: 1, requestedTransactionCount: 40, fetchedTransactionCount: 1,
      tokenAccountDiscovery: "partial", unsupportedEventCount: 0, unresolvedEventCount: options.unresolved ?? 0,
      limitReason: "closed_accounts_not_discovered", cacheAgeSeconds: 0,
      warnings: ["Synthetic browser fixture; closed token accounts not discovered."],
    } } });
  });
}

async function installSigningProvider(page: Page) {
  await page.addInitScript(({ sender }) => {
    const calls: number[][] = [];
    Object.assign(window, { __walletCalls: calls });
    // Same connect/signTransaction surface as the injected wallet, no custom app bypass.
    const publicKey = { toBase58: () => sender };
    Object.assign(window, { solana: {
      publicKey,
      connect: async () => ({ publicKey }),
      signTransaction: async (transaction: { serializeMessage: () => Uint8Array }) => {
        calls.push(Array.from(transaction.serializeMessage()));
        throw new Error("test_wallet_declined");
      },
    } });
  }, { sender: SENDER });
  await page.route("**/api/genesis?cluster=devnet", (route) => route.fulfill({ json: {
    endpoint: "https://api.devnet.solana.com", genesisHash: GENESIS, observed: true,
  } }));
  await page.route("https://api.devnet.solana.com/**", async (route) => {
    const { id, method } = route.request().postDataJSON() as { id: string; method: string };
    let result: unknown;
    if (method === "getLatestBlockhash") result = { context: { slot: 1 }, value: { blockhash: REAL, lastValidBlockHeight: 100 } };
    else if (method === "getGenesisHash") result = GENESIS;
    else if (method === "getBalance") result = { context: { slot: 1 }, value: 10_000_000 };
    else if (method === "getFeeForMessage") result = { context: { slot: 1 }, value: 5000 };
    else if (method === "getAccountInfo") result = { context: { slot: 1 }, value: null };
    else if (method === "getMinimumBalanceForRentExemption") result = 890880;
    else throw new Error(`Unexpected browser RPC: ${method}`);
    await route.fulfill({ json: { jsonrpc: "2.0", id, result } });
  });
}

const signButton = (page: Page) => page.getByRole("button", { name: "Approve test payment in wallet" });
const acknowledge = (page: Page) => page.getByRole("checkbox", { name: /I independently confirmed/ });

test("partial history stays partial; acknowledgment permits actual serialized wallet request; edits invalidate it", async ({ page }) => {
  await mockHistory(page); await installSigningProvider(page); await seedRecipient(page);
  await page.reload();
  await expect(page.getByText("Test network · Confirmed by you · version 1")).toBeVisible();
  await prepare(page);
  await page.getByRole("button", { name: "Connect my test wallet" }).click();
  await page.getByRole("button", { name: "Check payment details", exact: true }).click();
  await expect(acknowledge(page)).toBeVisible(); await expect(signButton(page)).toBeDisabled();
  await acknowledge(page).check();
  await expect(page.getByText("Some payment history is missing.", { exact: true })).toBeVisible();
  await expect(page.getByText("History check incomplete. We cannot rule out lookalike activity.", { exact: true })).toBeVisible();
  await expect(signButton(page)).toBeEnabled();
  await signButton(page).click();
  await expect(page.getByText("test_wallet_declined")).toBeVisible();
  const calls = await page.evaluate(() => (window as unknown as { __walletCalls: number[][] }).__walletCalls);
  expect(calls).toHaveLength(1); expect(calls[0]!.length).toBeGreaterThan(50);
  await page.getByRole("textbox", { name: "Address you are about to pay", exact: true }).fill(SPOOF);
  await expect(page.getByText("Different from your saved recipient. Reconfirm the receiving address.")).toBeVisible();
  await expect(signButton(page)).toBeDisabled();
  await page.getByRole("textbox", { name: "Address you are about to pay", exact: true }).fill(REAL);
  await expect(signButton(page)).toBeDisabled();
});

test("expiry without edits and cancellation clear the acknowledged check", async ({ page }) => {
  await page.clock.install(); await mockHistory(page); await seedRecipient(page); await prepare(page);
  await page.getByRole("button", { name: "Check payment details", exact: true }).click();
  await acknowledge(page).check(); await expect(signButton(page)).toBeEnabled();
  await page.clock.fastForward(31_000);
  await expect(signButton(page)).toBeDisabled();
  await expect(page.getByText(/Limited history acknowledged for this check only/)).toHaveCount(0);
  await page.getByRole("button", { name: "Check payment details", exact: true }).click();
  await acknowledge(page).check();
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(signButton(page)).toBeDisabled();
});

test("late lookup after edits cannot enable signing; unavailable and unresolved coverage cannot be acknowledged", async ({ page }) => {
  await mockHistory(page, { delay: 600 }); await seedRecipient(page); await prepare(page);
  const request = page.waitForRequest("**/api/check");
  await page.getByRole("button", { name: "Check payment details", exact: true }).click(); await request;
  await page.getByRole("textbox", { name: "Address you are about to pay", exact: true }).fill(SPOOF);
  await page.waitForTimeout(800);
  await expect(signButton(page)).toBeDisabled(); await expect(acknowledge(page)).toHaveCount(0);
  await page.getByRole("textbox", { name: "Address you are about to pay", exact: true }).fill(REAL);
  await page.unroute("**/api/check"); await mockHistory(page, { status: "unavailable" });
  await page.getByRole("button", { name: "Check payment details", exact: true }).click();
  await expect(page.getByText("Payment history could not be loaded.", { exact: true })).toBeVisible();
  await expect(acknowledge(page)).toHaveCount(0);
  await page.unroute("**/api/check"); await mockHistory(page, { unresolved: 1 });
  await page.getByRole("button", { name: "Check payment details", exact: true }).click();
  await expect(page.getByText("Some payment history is missing.", { exact: true })).toBeVisible();
  await expect(acknowledge(page)).toHaveCount(0); await expect(signButton(page)).toBeDisabled();
});

test("recipient changed in another tab invalidates an approved draft", async ({ page, context }) => {
  await mockHistory(page); await seedRecipient(page); await prepare(page);
  await page.getByRole("button", { name: "Check payment details", exact: true }).click();
  await acknowledge(page).check(); await expect(signButton(page)).toBeEnabled();
  const other = await context.newPage(); await other.goto("/recipients");
  await other.getByRole("button", { name: "Change address" }).click();
  await other.getByPlaceholder("New full address").fill(SPOOF);
  await other.getByRole("button", { name: "Review new address" }).click();
  await expect(page.getByText("Different from your saved recipient. Reconfirm the receiving address.")).toBeVisible();
  await expect(signButton(page)).toBeDisabled(); await other.close();
});

test("editing during transaction preparation never reaches the wallet", async ({ page }) => {
  await mockHistory(page); await installSigningProvider(page); await seedRecipient(page); await prepare(page);
  await page.route("**/api/genesis?cluster=devnet", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 500));
    await route.fulfill({ json: { endpoint: "https://api.devnet.solana.com", genesisHash: GENESIS, observed: true } });
  });
  await page.getByRole("button", { name: "Check payment details", exact: true }).click(); await acknowledge(page).check();
  const request = page.waitForRequest("**/api/genesis?cluster=devnet");
  await signButton(page).click(); await request;
  await page.getByRole("textbox", { name: "Amount (SOL)", exact: true }).fill("0.002");
  await expect(page.getByText("Draft changed before the wallet request.")).toBeVisible();
  expect(await page.evaluate(() => (window as unknown as { __walletCalls: unknown[] }).__walletCalls)).toHaveLength(0);
});

test("mainnet has no wallet action; Check drops evidence on sender change", async ({ page }) => {
  await page.goto("/prepare");
  await page.getByRole("combobox", { name: "Network", exact: true }).selectOption("mainnet-beta");
  await expect(signButton(page)).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Connect my test wallet" })).toHaveCount(0);
  await mockHistory(page); await page.goto("/");
  await page.getByRole("textbox", { name: "Your wallet address", exact: true }).fill(SENDER);
  await page.getByRole("textbox", { name: "Address you are about to pay", exact: true }).fill(REAL);
  await page.getByRole("button", { name: "Check address", exact: true }).click();
  await expect(page.getByText("Check finished. Review your result below.")).toBeVisible();
  await page.getByRole("textbox", { name: "Your wallet address", exact: true }).fill(SPOOF);
  await expect(page.getByText("No chain lookup yet.")).toBeVisible();
});

test("beginner examples need no wallet or network request and remain separate from real inputs", async ({ page }) => {
  let checks = 0;
  page.on("request", (request) => { if (request.url().endsWith("/api/check")) checks++; });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.getByText(/No wallet connection, SOL balance or transaction fee is needed/)).toBeVisible();
  await expect(page.getByText(/mainnet-beta.*You can check it now/)).toBeVisible();
  await page.getByRole("button", { name: "See a lookalike example" }).click();
  await expect(page.getByText(/first 4 and last 1 characters match/)).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Address you are about to pay", exact: true })).toHaveValue("");
  await page.getByRole("button", { name: "See a matching example" }).click();
  await expect(page.getByText("These addresses are identical.")).toBeVisible();
  expect(checks).toBe(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test("decimal entry sends exact raw units; bad precision and missing sender funds prevent signing", async ({ page }) => {
  await mockHistory(page); await installSigningProvider(page); await seedRecipient(page); await prepare(page);
  await expect(page.getByRole("heading", { name: "Only the sending wallet needs test SOL first" })).toBeVisible();
  await page.getByRole("textbox", { name: "Amount (SOL)", exact: true }).fill("0.0000000001");
  await expect(page.getByRole("button", { name: "Check payment details", exact: true })).toBeDisabled();
  await page.getByRole("textbox", { name: "Amount (SOL)", exact: true }).fill("0.001");
  const request = page.waitForRequest("**/api/check");
  await page.getByRole("button", { name: "Check payment details", exact: true }).click();
  expect((await request).postDataJSON().amountRaw).toBe("1000000");
  await acknowledge(page).check();
  await page.route("https://api.devnet.solana.com/**", async (route) => {
    const { method, id } = route.request().postDataJSON();
    if (method === "getBalance") await route.fulfill({ json: { jsonrpc: "2.0", id, result: { context: { slot: 1 }, value: 0 } } });
    else await route.fallback();
  });
  await signButton(page).click();
  await expect(page.getByText(/Your sending wallet has 0 test SOL/)).toBeVisible();
  expect(await page.evaluate(() => (window as unknown as { __walletCalls: unknown[] }).__walletCalls)).toHaveLength(0);
});

test("missing wallet and connection success are visible beside the Connect button", async ({ page }) => {
  await page.goto("/prepare");
  const connection = page.getByRole("region", { name: "Wallet connection" });
  await expect(connection.getByText("No compatible Solana wallet detected in this browser.")).toBeVisible();
  await connection.getByRole("button", { name: "Connect my test wallet" }).click();
  await expect(connection.getByText(/Install Phantom or Solflare in this browser/)).toBeVisible();
  await installSigningProvider(page); await page.reload();
  await connection.getByRole("button", { name: "Connect my test wallet" }).click();
  await expect(connection.getByText("Connected. Your sending address is filled in below.")).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Your sending wallet", exact: true })).toHaveValue(SENDER);
});
