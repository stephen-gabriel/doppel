import { chromium } from '@playwright/test';
import { mkdir, writeFile, copyFile } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const out = (name) => path.join(root, 'assets', name);
await mkdir(path.join(root, 'assets'), { recursive: true });

const VICTIM = '5LbwC1ewY3Sca7T8CwzX9wsjvwMAHbdRo6SCQL8j7EWc';
const REAL = '4yfu48qwim7hGzD3Nphzd2A6ThydzysfKi4wBPFSgnhY';
const SPOOF = '4yfuQCL4fnNfSbBgqFcPTFn5GGZABDaEFQLhGpwjizcY';

const browser = await chromium.launch({ headless: true });
// Dedicated fresh profile; never touches the builder's saved recipients or wallet.
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 2 });
const page = await context.newPage();
const shot = async (name, locator) => {
  await page.evaluate(() => document.fonts.ready);
  await (locator ?? page).screenshot({ path: out(name) });
};

// 1. Home / Check an address
await page.goto('http://localhost:3000');
await shot('home.png');

// 2. Save a labelled sample recipient
await page.goto('http://localhost:3000/recipients');
await page.getByLabel('Recipient name', { exact: true }).fill('Ada · sample recipient');
await page.getByLabel('Full receiving address', { exact: true }).fill(REAL);
await page.getByRole('combobox', { name: 'Network', exact: true }).selectOption('devnet');
await page.getByRole('button', { name: 'Review recipient', exact: true }).click();
await page.getByRole('button', { name: 'Confirm this record' }).click();
await shot('recipients.png');

// 3. Prepare with a lookalike destination — the trap
await page.goto('http://localhost:3000/prepare');
await page.getByRole('textbox', { name: 'Your sending wallet', exact: true }).fill(VICTIM);
await page.getByRole('combobox', { name: 'Who are you trying to pay?', exact: true }).selectOption({ index: 1 });
const target = page.getByRole('textbox', { name: 'Address you are about to pay', exact: true });
await target.fill(SPOOF);
await page.evaluate(() => document.fonts.ready);

const twin = page.locator('section').filter({ has: page.getByText('Saved address for Ada · sample recipient', { exact: true }) }).last();
await shot('twin-mismatch.png', twin);
await twin.scrollIntoViewIfNeeded();
await shot('prepare-mismatch.png');
await shot('result-mismatch.png', page.locator('section[aria-live="polite"]'));

const button = page.getByRole('button', { name: 'Approve test payment in wallet' });
if (!(await button.isDisabled())) throw new Error('Mismatch must block signature request');
await shot('blocked-button.png', button);
await shot('payment-form.png', page.locator('form').first());

// 4. Correct recipient restores the match
await target.fill(REAL);
await page.evaluate(() => document.fonts.ready);
await shot('twin-match.png', twin);
await shot('prepare-match.png');

// 5. Monitor — bundled historical mainnet capture, no worker running
await page.goto('http://localhost:3000/monitor');
await page.getByText('Captured mainnet observations · not live', { exact: true }).waitFor();
await shot('monitor.png');
await shot('monitor-panel.png', page.locator('main'));

// 6. Method page — how the rule works
await page.goto('http://localhost:3000/method');
await shot('method.png');

// Brand + font assets straight from the running app
const fontRules = await page.evaluate(() => [...document.styleSheets].flatMap(sheet => {
  try { return [...sheet.cssRules].filter(r => r.cssText.startsWith('@font-face')).map(r => r.cssText); } catch { return []; }
}));
let fontIndex = 0;
for (const rule of fontRules) {
  const url = /url\(["']?([^)"']+)/.exec(rule)?.[1];
  if (!url || (!rule.includes('latin') && !rule.includes('Bricolage') && !rule.includes('JetBrains'))) continue;
  const response = await context.request.get(new URL(url, 'http://localhost:3000').href);
  if (response.ok()) await writeFile(out(`font-${fontIndex++}.woff2`), await response.body());
}
await writeFile(out('font-rules.json'), JSON.stringify(fontRules, null, 2));
await copyFile(path.resolve(root, '../../_build_plan/assets/doppel-logo.svg'), out('doppel-logo.svg'));

console.log(JSON.stringify({ ok: true, fonts: fontIndex, signingBlocked: true }));
await browser.close();
