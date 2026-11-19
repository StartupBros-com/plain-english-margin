// One-off: renders the extension icons from a small SVG. Output is committed.
import { writeFileSync } from 'node:fs';
import { launch } from './browser.mjs';

const svg = (n) => `<svg xmlns="http://www.w3.org/2000/svg" width="${n}" height="${n}" viewBox="0 0 32 32"><rect width="32" height="32" rx="8" fill="#255f55"/><path d="M9 10h14M9 16h9M9 22h12" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/></svg>`;
const browser = await launch();
const page = await browser.newPage();
for (const n of [16, 48, 128]) {
  await page.setViewportSize({ width: n, height: n });
  await page.setContent(`<body style="margin:0;background:transparent">${svg(n)}</body>`);
  writeFileSync(`src/extension/public/icon-${n}.png`, await page.screenshot({ omitBackground: true }));
}
await browser.close();
