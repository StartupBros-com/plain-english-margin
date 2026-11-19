// Takes the screenshots in docs/screenshots. Everything here runs against the FAKE adapter (?adapter=fake):
// it shows the interface, not model output. Run `pnpm build` first.
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync, mkdirSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { launch } from './browser.mjs';

const root = join(process.cwd(), 'dist', 'web');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json' };
const server = createServer((req, res) => {
  const path = normalize(new URL(req.url, 'http://x').pathname).replace(/^(\.\.[/\\])+/, '');
  let file = join(root, path === '/' ? 'index.html' : path);
  if (!existsSync(file) || statSync(file).isDirectory()) file = join(root, 'index.html');
  res.setHeader('content-type', types[extname(file)] ?? 'application/octet-stream');
  res.end(readFileSync(file));
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}/`;
const out = join(process.cwd(), 'docs', 'screenshots');
mkdirSync(out, { recursive: true });

const browser = await launch();
const failures = [];
const check = (ok, msg) => {
  if (!ok) failures.push(msg);
};

async function open(viewport, query, scheme = 'light') {
  const ctx = await browser.newContext({ viewport, colorScheme: scheme, deviceScaleFactor: 1, hasTouch: viewport.width < 500 });
  const page = await ctx.newPage();
  await page.goto(`${base}?adapter=fake&delay=120&${query}`);
  await page.waitForSelector('.pem-term');
  return page;
}
async function openCard(page, term, mobile) {
  const el = page.locator(`.pem-term[data-pem-term="${term}"]`).first();
  await el.scrollIntoViewIfNeeded();
  if (mobile) await el.tap();
  else await el.hover();
  await page.waitForSelector('.card:not([hidden]) .model', { timeout: 5000 });
  return el;
}

// Desktop: hover card, "I know this", walkthrough, known-terms list.
{
  const page = await open({ width: 1280, height: 800 }, '');
  await openCard(page, 'localstorage');
  check((await page.locator('.card .model').innerText()).includes('no model ran'), 'badge must say no model ran');
  await page.screenshot({ path: join(out, 'desktop-1-hover-card.png') });

  const before = await page.locator('.pem-term').count();
  // Close must really close: it used to refocus the term, which reopened the card.
  await page.locator('.card .btn.quiet').click();
  await page.waitForTimeout(600);
  check(await page.locator('.card').isHidden(), 'Close should leave the card closed');
  await openCard(page, 'localstorage');
  await page.locator('.card button.primary').click();
  const after = await page.locator('.pem-term').count();
  check(after < before, 'known term should stop being highlighted');
  await page.locator('.fab').click();
  await page.waitForSelector('.panel:not([hidden]) .steps');
  check((await page.locator('.panel .model .chip').innerText()).includes('cloud'), 'walkthrough of the long demo thread should be cloud-routed');
  await page.screenshot({ path: join(out, 'desktop-3-walkthrough.png') });
  await page.locator('.tab', { hasText: 'Terms I know' }).click();
  await page.waitForSelector('.panel .known');
  await page.screenshot({ path: join(out, 'desktop-4-terms-you-know.png') });
  await page.context().close();
}

// Desktop: no on-device model, so a lookup goes to the cloud and the badge says why.
{
  const page = await open({ width: 1280, height: 800 }, 'onDevice=missing');
  await openCard(page, 'lockfile');
  check((await page.locator('.card .model').innerText()).includes('no on-device model'), 'cloud reason should show');
  await page.screenshot({ path: join(out, 'desktop-2-model-badge-cloud.png') });
  await page.context().close();
}

// Mobile web app, 390x844.
{
  const page = await open({ width: 390, height: 844 }, '');
  await openCard(page, 'stack trace', true);
  await page.screenshot({ path: join(out, 'mobile-1-hover-card.png') });
  await page.keyboard.press('Escape');
  await page.locator('.fab').tap();
  await page.waitForSelector('.panel:not([hidden]) .steps');
  await page.screenshot({ path: join(out, 'mobile-2-walkthrough.png') });
  await page.context().close();
}

// Dark scheme, desktop.
{
  const page = await open({ width: 1280, height: 800 }, '', 'dark');
  await openCard(page, 'merge conflict');
  await page.screenshot({ path: join(out, 'desktop-5-dark.png') });
  await page.context().close();
}

await browser.close();
server.close();
if (failures.length) {
  console.error('Screenshot checks failed:\n- ' + failures.join('\n- '));
  process.exit(1);
}
console.log('screenshots ok');
