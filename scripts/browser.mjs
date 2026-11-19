import { existsSync, readdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { chromium } from 'playwright';

/** Launch headless Chromium. PEM_CHROMIUM overrides; otherwise use Playwright's default, then any cached headless shell. */
export async function launch() {
  const override = process.env.PEM_CHROMIUM;
  if (override) return chromium.launch({ executablePath: override });
  if (existsSync(chromium.executablePath())) return chromium.launch();
  const cache = join(homedir(), '.cache', 'ms-playwright');
  const shells = existsSync(cache) ? readdirSync(cache).filter((d) => d.startsWith('chromium_headless_shell-')).sort().reverse() : [];
  for (const d of shells) {
    const dir = join(cache, d);
    const sub = readdirSync(dir).find((x) => x.startsWith('chrome-headless-shell'));
    const exe = sub && join(dir, sub, 'chrome-headless-shell');
    if (exe && existsSync(exe)) return chromium.launch({ executablePath: exe });
  }
  return chromium.launch();
}
