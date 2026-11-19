import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';

const vite = resolve('node_modules/.bin/vite');
// The host build empties dist/extension, so it runs before the content script is added.
for (const mode of ['web', 'ext-host', 'ext-content']) {
  console.log(`\n== vite build --mode ${mode}`);
  execFileSync(vite, ['build', '--mode', mode], { stdio: 'inherit' });
}
