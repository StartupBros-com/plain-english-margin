// Live check against a REAL Firebase project: opens the web app (served by `pnpm dev` with
// PEM_FIREBASE_CONFIG set), hovers one term and one walkthrough, and prints what the card says,
// which model the badge names, and the HTTP status of every Firebase AI Logic / App Check call.
// It never prints request bodies, keys or tokens.
//
//   PEM_FIREBASE_CONFIG=/path/outside/repo/firebase-config.json pnpm dev --port 5199 --strictPort &
//   node scripts/live-check.mjs http://127.0.0.1:5199/ [term]
import { launch } from './browser.mjs';

const base = process.argv[2] ?? 'http://127.0.0.1:5199/';
const term = process.argv[3] ?? 'lockfile';
const browser = await launch();
const page = await (await browser.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
const calls = [];
page.on('response', (r) => {
  const u = new URL(r.url());
  if (/firebasevertexai|generativelanguage|firebaseappcheck|aiplatform/.test(u.host)) {
    calls.push(`${r.status()} ${u.host}${u.pathname.replace(/\/apps\/.*:/, '/apps/<app>:').replace(/(?=[A-Za-z_-]*\d)[A-Za-z0-9_-]{30,}/g, '<id>')}`);
  }
});
const errors = [];
page.on('console', (m) => {
  if (m.type() === 'error' || m.type() === 'warning') errors.push(`${m.type()}: ${m.text().slice(0, 300)}`);
});

await page.goto(base);
await page.waitForSelector('.pem-term', { timeout: 20000 });
const el = page.locator(`.pem-term[data-pem-term="${term}"]`).first();
await el.scrollIntoViewIfNeeded();
await el.hover();
const t0 = Date.now();
await page.waitForSelector('.card:not([hidden]) .model', { timeout: 60000 }).catch(() => {});
await page.waitForTimeout(1500);
const card = await page.locator('.card').innerText().catch(() => '(no card)');
console.log(`== hover "${term}" (${Date.now() - t0} ms)\n${card}`);

await page.locator('.card .btn.quiet').click().catch(() => {});
await page.locator('.fab').click();
const t1 = Date.now();
await page.waitForSelector('.panel:not([hidden]) .steps, .panel:not([hidden]) .error, .panel:not([hidden]) .note', { timeout: 90000 }).catch(() => {});
await page.waitForTimeout(1500);
const panel = await page.locator('.panel').innerText().catch(() => '(no panel)');
console.log(`== walkthrough (${Date.now() - t1} ms)\n${panel.slice(0, 2500)}`);

console.log('== network\n' + (calls.join('\n') || '(no Firebase AI calls seen)'));
console.log('== console errors/warnings\n' + (errors.join('\n') || '(none)'));
await browser.close();
