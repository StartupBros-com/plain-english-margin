// Record the demo video footage against a REAL Firebase project (no fake adapter).
// Serve the web app with a hosted-style config first, for example:
//   PEM_FIREBASE_CONFIG=/path/outside/repo/firebase-config.json pnpm dev --port 5198 --strictPort
//   node scripts/record-demo.mjs http://localhost:5198/
// Writes dist/video/footage.webm, dist/video/scenes.json (scene start times in seconds) and
// dist/video/stills/real-cloud-*.png (gallery screenshots from the same real run),
// which scripts/make-video.mjs turns into the captioned MP4.
/* global document, addEventListener */
import { mkdirSync, readdirSync, renameSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { launch } from './browser.mjs';

const base = process.argv[2] ?? 'http://localhost:5198/';
const out = 'dist/video';
mkdirSync(join(out, 'stills'), { recursive: true });
const size = { width: 1280, height: 720 };
const browser = await launch();
const ctx = await browser.newContext({ viewport: size, deviceScaleFactor: 1, recordVideo: { dir: out, size } });
// A visible cursor: headless recordings do not draw the pointer.
await ctx.addInitScript(() => {
  addEventListener('DOMContentLoaded', () => {
    const c = document.createElement('div');
    c.style.cssText = 'position:fixed;z-index:2147483647;width:18px;height:18px;margin:-9px 0 0 -9px;border-radius:50%;background:rgba(220,60,60,.55);border:2px solid #fff;box-shadow:0 0 0 1px rgba(0,0,0,.35);pointer-events:none;left:-40px;top:-40px;transition:transform .08s';
    document.body.appendChild(c);
    addEventListener('mousemove', (e) => { c.style.left = e.clientX + 'px'; c.style.top = e.clientY + 'px'; }, true);
    addEventListener('mousedown', () => { c.style.transform = 'scale(.7)'; }, true);
    addEventListener('mouseup', () => { c.style.transform = ''; }, true);
  });
});
const page = await ctx.newPage();
const t0 = Date.now();
const scenes = [];
const scene = (id) => { scenes.push({ id, t: (Date.now() - t0) / 1000 }); console.log(`${((Date.now() - t0) / 1000).toFixed(1)}s ${id}`); };
const calls = [];
page.on('response', (r) => {
  const u = new URL(r.url());
  if (/firebasevertexai|firebaseappcheck/.test(u.host)) calls.push(`${r.status()} ${u.pathname.split(':').pop()}`);
});
const still = (name) => page.screenshot({ path: join(out, 'stills', name) });
const moveTo = async (x, y, steps = 25) => { await page.mouse.move(x, y, { steps }); };
const moveToEl = async (loc) => { const b = await loc.boundingBox(); if (b) await moveTo(b.x + b.width / 2, b.y + b.height / 2); };
const card = (html) => `<!doctype html><meta charset="utf-8"><style>
  body{margin:0;height:100vh;display:grid;place-items:center;background:#0f1720;color:#e8eef5;font:22px/1.45 system-ui,-apple-system,"Segoe UI",sans-serif}
  .w{max-width:980px;padding:0 48px} h1{font-size:54px;margin:0 0 14px;letter-spacing:-.02em} p{margin:10px 0;color:#b9c6d4}
  .k{color:#7dd3fc} pre{background:#111c28;border:1px solid #233548;border-radius:10px;padding:18px 22px;font:15px/1.55 ui-monospace,Menlo,Consolas,monospace;color:#d6e2ee;white-space:pre-wrap}
  .c{color:#7f93a8} .s{color:#a5e3a1} .f{color:#f9c97a} small{color:#8aa0b5;font-size:17px}
</style><div class="w">${html}</div>`;

// 1. Title
await page.setContent(card(`<h1>Plain-English Margin</h1>
  <p>Hover any jargon in an AI coding agent's transcript and get one plain sentence, written for that sentence.</p>
  <p class="k">Built with Firebase AI Logic hybrid inference: Gemini Nano on the device when the browser has it, Gemini in the cloud when it does not.</p>`));
scene('title');
await page.waitForTimeout(10000);

// 2. The app with the demo conversation
await page.goto(base);
await page.waitForSelector('.pem-term', { timeout: 30000 });
scene('app');
await moveTo(400, 300);
await page.waitForTimeout(2500);
await page.mouse.wheel(0, 260);
await page.waitForTimeout(2200);
await page.mouse.wheel(0, -260);
await page.waitForTimeout(1200);

async function hoverTerm(term, hold) {
  const el = page.locator(`.pem-term[data-pem-term="${term}"]`).first();
  await el.scrollIntoViewIfNeeded();
  await page.waitForTimeout(400);
  await moveToEl(el);
  scene(`hover:${term}`);
  await page.waitForSelector('.card:not([hidden]) .model', { timeout: 60000 }).catch(() => {});
  scene(`card:${term}`);
  await page.waitForTimeout(hold);
}

// 3. Lookups
await hoverTerm('race condition', 1500);
await still('real-cloud-1-hover-card.png');
await page.waitForTimeout(5500);
await page.locator('.card .btn.quiet').click().catch(() => {});
await page.waitForTimeout(600);
await hoverTerm('lockfile', 7000);

// 4. "I know this"
const know = page.locator('.card button.primary');
await moveToEl(know);
await page.waitForTimeout(500);
await know.click();
scene('know:lockfile');
await page.waitForTimeout(2500);
await hoverTerm('rebase', 5000);
await page.locator('.card button.primary').click().catch(() => {});
scene('know:rebase');
await page.waitForTimeout(1500);

// 5. Walkthrough of the whole thread
const fab = page.locator('.fab');
await moveToEl(fab);
await page.waitForTimeout(500);
await fab.click();
scene('walkthrough:open');
await page.waitForSelector('.panel:not([hidden]) .steps, .panel:not([hidden]) .error', { timeout: 90000 }).catch(() => {});
scene('walkthrough:ready');
await page.waitForTimeout(1500);
await still('real-cloud-2-walkthrough.png');
await page.waitForTimeout(4500);
const body = page.locator('.panel .body');
await moveToEl(body);
await page.mouse.wheel(0, 320);
await page.waitForTimeout(4500);
await page.mouse.wheel(0, 400);
await page.waitForTimeout(4000);

// 6. Terms I know
const termsTab = page.locator('.tab', { hasText: 'Terms I know' });
await moveToEl(termsTab);
await termsTab.click();
scene('tab:terms');
await page.waitForTimeout(1000);
await still('real-cloud-3-terms-you-know.png');
await page.waitForTimeout(4000);

// 7. Settings: on-device status and sync
const settingsTab = page.locator('.tab', { hasText: 'Settings' });
await moveToEl(settingsTab);
await settingsTab.click();
scene('tab:settings');
await page.waitForTimeout(1000);
await still('real-cloud-4-settings.png');
await page.waitForTimeout(7500);

// 8. The Firebase AI Logic code
await page.setContent(card(`<pre><span class="c">// src/core/router.ts: where each request runs, and why</span>
<span class="f">if</span> (inputChars > limit) <span class="f">return</span> { mode: <span class="s">'only-in-cloud'</span>, reason: <span class="s">'long-input'</span> };
<span class="f">if</span> (onDevice !== <span class="s">'ready'</span>) <span class="f">return</span> { mode: <span class="s">'only-in-cloud'</span>, reason: <span class="s">'no-on-device-model'</span> };
<span class="f">return</span> { mode: <span class="s">'prefer-on-device'</span>, reason: <span class="s">'short-lookup'</span> };

<span class="c">// src/core/firebase-adapter.ts: Firebase AI Logic hybrid inference</span>
<span class="f">const</span> model = getGenerativeModel(ai, {
  mode: MODE_MAP[mode],  <span class="c">// InferenceMode.PREFER_ON_DEVICE or ONLY_IN_CLOUD</span>
  onDeviceParams: { createOptions, promptOptions: { responseConstraint: schema } },
  inCloudParams: {
    model: <span class="s">'gemini-3.5-flash-lite'</span>,
    generationConfig: { responseSchema: schema },
  },
});
<span class="f">const</span> source = result.response.inferenceSource === InferenceSource.<span class="k">ON_DEVICE</span>
  ? <span class="s">'on-device'</span> : <span class="s">'cloud'</span>;</pre>
<small>One structured schema works on both paths. The badge shows the SDK's own inferenceSource. App Check protects every call: reCAPTCHA on the hosted page, a debug token in the extension.</small>`));
scene('code');
await page.waitForTimeout(15000);

// 9. Close
await page.setContent(card(`<h1>Plain-English Margin</h1>
  <p>A Chrome extension and a web app on one shared core. Apache-2.0.</p>
  <p class="k">github.com/StartupBros-com/plain-english-margin</p>
  <p><small>Recorded in a browser without Gemini Nano, so every answer here came from the cloud, and the app said so.</small></p>`));
scene('close');
await page.waitForTimeout(7000);
scene('end');

const video = page.video();
await ctx.close();
await browser.close();
const src = await video.path();
renameSync(src, join(out, 'footage.webm'));
for (const f of readdirSync(out)) if (f.endsWith('.webm') && f !== 'footage.webm') console.log('extra file', f);
writeFileSync(join(out, 'scenes.json'), JSON.stringify({ scenes, calls }, null, 2));
console.log('calls:', calls.join(', '));
console.log('wrote', join(out, 'footage.webm'), 'and scenes.json');
