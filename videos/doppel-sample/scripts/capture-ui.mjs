import { chromium } from '@playwright/test';
import { mkdir, writeFile, copyFile } from 'node:fs/promises';
import path from 'node:path';
const root = path.resolve(import.meta.dirname, '..');
await mkdir(path.join(root, 'assets'), { recursive: true });
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 2 });
const page = await context.newPage();
// Dedicated fresh profile; never touches the builder's saved recipients or wallet.
await page.goto('http://localhost:3000/recipients');
await page.getByLabel('Recipient name', { exact: true }).fill('Ada · sample recipient');
await page.getByLabel('Full receiving address', { exact: true }).fill('4yfu48qwim7hGzD3Nphzd2A6ThydzysfKi4wBPFSgnhY');
await page.getByRole('combobox', { name: 'Network', exact: true }).selectOption('devnet');
await page.getByRole('button', { name: 'Review recipient', exact: true }).click();
await page.getByRole('button', { name: 'Confirm this record' }).click();
await page.goto('http://localhost:3000/prepare');
await page.getByRole('textbox', { name: 'Your sending wallet', exact: true }).fill('5LbwC1ewY3Sca7T8CwzX9wsjvwMAHbdRo6SCQL8j7EWc');
await page.getByRole('combobox', { name: 'Who are you trying to pay?', exact: true }).selectOption({ index: 1 });
const target = page.getByRole('textbox', { name: 'Address you are about to pay', exact: true });
await target.fill('4yfuQCL4fnNfSbBgqFcPTFn5GGZABDaEFQLhGpwjizcY');
await page.evaluate(() => document.fonts.ready);
const twin = page.locator('section').filter({ has: page.getByText('Saved address for Ada · sample recipient', { exact: true }) }).last();
await twin.screenshot({ path: path.join(root, 'assets/twin-mismatch.png') });
await twin.scrollIntoViewIfNeeded();
await page.screenshot({ path: path.join(root, 'assets/prepare-mismatch.png') });
const summary = page.locator('section[aria-live="polite"]');
await summary.screenshot({ path: path.join(root, 'assets/result-mismatch.png') });
const button = page.getByRole('button', { name: 'Approve test payment in wallet' });
if (!(await button.isDisabled())) throw new Error('Mismatch must block signature request');
await button.screenshot({ path: path.join(root, 'assets/blocked-button.png') });
await page.locator('form').first().screenshot({ path: path.join(root, 'assets/payment-form.png') });
await target.fill('4yfu48qwim7hGzD3Nphzd2A6ThydzysfKi4wBPFSgnhY');
await twin.screenshot({ path: path.join(root, 'assets/twin-match.png') });
await page.goto('http://localhost:3000');
await page.evaluate(() => document.fonts.ready);
await page.screenshot({ path: path.join(root, 'assets/home.png') });
const fontRules = await page.evaluate(() => [...document.styleSheets].flatMap(sheet => {
  try { return [...sheet.cssRules].filter(r => r.cssText.startsWith('@font-face')).map(r => r.cssText); } catch { return []; }
}));
let fontIndex = 0;
for (const rule of fontRules) {
  const url = /url\(["']?([^\)"']+)/.exec(rule)?.[1];
  if (!url || !rule.includes('latin') && !rule.includes('Bricolage') && !rule.includes('JetBrains')) continue;
  const response = await context.request.get(new URL(url, 'http://localhost:3000').href);
  if (response.ok()) await writeFile(path.join(root, `assets/font-${fontIndex++}.woff2`), await response.body());
}
await writeFile(path.join(root, 'assets/font-rules.json'), JSON.stringify(fontRules, null, 2));
await copyFile(path.resolve(root, '../../_build_plan/assets/doppel-logo.svg'), path.join(root, 'assets/doppel-logo.svg'));
await writeFile(path.join(root, 'capture/extracted/asset-descriptions.md'), `# Verified capture inventory\n\nHyperFrames capture returned ok:true but omitted this inventory with zero downloadable assets. Repaired using an isolated Playwright capture of the actual app, without rebuilding the page. No RPC calls or wallet signing.\n\n- assets/home.png — actual homepage, 1440x1000 at 2x.\n- assets/payment-form.png — actual Prepare form with sample recipient.\n- assets/twin-mismatch.png — actual Twin Panel showing the sourced 4+1 lookalike pair, staged sample.\n- assets/result-mismatch.png — actual local mismatch summary.\n- assets/blocked-button.png — actual disabled signing button due to mismatch.\n- assets/prepare-mismatch.png — actual viewport around comparison.\n- assets/twin-match.png — actual comparison after replacing with the saved address.\n- assets/doppel-logo.svg — existing user project logo, copied unchanged.\n- assets/font-*.woff2 and font-rules.json — local web-app font captures and @font-face metadata.\n\nPublished addresses used only for a labelled sample; no reconstructed attack or live-mainnet claim.\n`);
console.log(JSON.stringify({ ok: true, directory: root, screenshots: 7, fonts: fontIndex, signingBlocked: true }));
await browser.close();
