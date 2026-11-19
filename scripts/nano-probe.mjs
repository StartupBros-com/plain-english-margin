// Probe the Prompt API (Gemini Nano) in a real Google Chrome build. Prints availability and,
// with --download, clicks a button (user activation) to start the model download and reports progress.
//   node scripts/nano-probe.mjs http://127.0.0.1:5199/ [--download] [--headed]
// On 2026-11-19 Chrome 151 on Linux (WSL, headless and Xvfb-headed) exposed LanguageModel but reported
// "unavailable", so on-device inference could not be observed on this machine.
/* global window, document, LanguageModel */
import { chromium } from 'playwright';

const base = process.argv[2] ?? 'http://127.0.0.1:5199/';
const download = process.argv.includes('--download');
const headed = process.argv.includes('--headed');
const profile = process.env.PEM_CHROME_PROFILE ?? `${process.env.HOME}/.cache/pem-chrome-nano`;
const ctx = await chromium.launchPersistentContext(profile, {
  executablePath: process.env.PEM_CHROME ?? '/usr/bin/google-chrome',
  headless: !headed,
  args: [
    '--enable-features=OptimizationGuideOnDeviceModel:BypassPerfRequirement/true,PromptAPIForGeminiNano,PromptAPIForGeminiNanoMultimodalInput',
    '--no-first-run',
  ],
});
const page = ctx.pages()[0] ?? (await ctx.newPage());
await page.goto(base);
const info = await page.evaluate(async () => {
  const out = { hasLanguageModel: typeof globalThis.LanguageModel !== 'undefined', ua: navigator.userAgent };
  if (out.hasLanguageModel) {
    try { out.availability = await LanguageModel.availability(); } catch (e) { out.availabilityError = String(e); }
  }
  return out;
});
console.log(JSON.stringify(info));
if (download && info.hasLanguageModel && info.availability !== 'unavailable') {
  await page.evaluate(() => {
    const b = document.createElement('button');
    b.id = 'pem-nano-go'; b.textContent = 'go'; b.style.cssText = 'position:fixed;top:0;left:0;z-index:99999';
    b.onclick = async () => {
      window.__nano = { state: 'creating', loaded: 0 };
      try {
        const s = await LanguageModel.create({ monitor(m) { m.addEventListener('downloadprogress', (e) => { window.__nano.loaded = e.loaded; }); } });
        window.__nano.state = 'ready';
        window.__nano.reply = await s.prompt('In one short sentence, what is a lockfile?');
      } catch (e) { window.__nano.state = 'error: ' + String(e); }
    };
    document.body.appendChild(b);
  });
  await page.click('#pem-nano-go');
  const t0 = Date.now();
  let last = '';
  while (Date.now() - t0 < 25 * 60 * 1000) {
    const s = await page.evaluate(() => JSON.stringify(window.__nano));
    if (s !== last) { console.log(`${Math.round((Date.now() - t0) / 1000)}s ${s}`); last = s; }
    if (s && (s.includes('"ready"') || s.includes('error'))) break;
    await page.waitForTimeout(10000);
  }
}
await ctx.close();
