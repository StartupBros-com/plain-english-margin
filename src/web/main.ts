import { loadAppConfig } from '../core/config';
import { FakeAdapter } from '../core/fake-adapter';
import { initFirebase, FirebaseAdapter } from '../core/firebase-adapter';
import { createFirestoreSync } from '../core/firebase-sync';
import { KnownTerms, type KeyValueStore } from '../core/known-terms';
import { ConfigMissingError, MarginService } from '../core/service';
import { SyncController } from '../core/sync-controller';
import type { InferenceAdapter, InferenceResult, OnDeviceStatus } from '../core/types';
import { Margin } from '../ui/margin';
import { DEMO_TRANSCRIPT, type Turn } from './demo-transcript';

class LocalStore implements KeyValueStore {
  async get(key: string): Promise<unknown> {
    try {
      const raw = localStorage.getItem(key);
      return raw === null ? undefined : JSON.parse(raw);
    } catch {
      return undefined;
    }
  }
  async set(key: string, value: unknown): Promise<void> {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* storage can be blocked; the list then lasts for this visit only */
    }
  }
}

/** Used when no Firebase config file exists. Every lookup says what is missing. */
class NoConfigAdapter implements InferenceAdapter {
  async onDeviceStatus(): Promise<OnDeviceStatus> {
    return 'missing';
  }
  async generate(): Promise<InferenceResult> {
    throw new ConfigMissingError();
  }
}

function renderTurn(t: Turn): HTMLElement {
  const el = document.createElement('section');
  el.className = `turn ${t.kind}`;
  const title = document.createElement('h2');
  title.setAttribute('data-pem-ignore', '');
  title.textContent = t.label;
  el.append(title);
  for (const para of t.paragraphs ?? []) {
    const p = document.createElement('p');
    para.split(/(`[^`]+`)/).forEach((chunk) => {
      if (chunk.startsWith('`') && chunk.endsWith('`') && chunk.length > 2) {
        const c = document.createElement('code');
        c.textContent = chunk.slice(1, -1);
        p.append(c);
      } else p.append(chunk);
    });
    el.append(p);
  }
  if (t.code) {
    const pre = document.createElement('pre');
    pre.textContent = t.code;
    el.append(pre);
  }
  return el;
}

async function main(): Promise<void> {
  const params = new URLSearchParams(location.search);
  const thread = document.getElementById('thread') as HTMLElement;
  const note = document.getElementById('mode-note') as HTMLElement;
  for (const t of DEMO_TRANSCRIPT) thread.append(renderTurn(t));
  // ?plain=1 shows the conversation with no margin, so the browser extension can be tried on it alone.
  if (params.has('plain')) return;

  const store = new LocalStore();
  const known = new KnownTerms(store);
  await known.load();

  let adapter: InferenceAdapter;
  let syncFactory: (() => Promise<import('../core/sync').TermSync>) | undefined;
  if (params.get('adapter') === 'fake') {
    // Sample mode: no model runs. Used for screenshots and for trying the layout offline.
    adapter = new FakeAdapter({
      onDevice: (params.get('onDevice') as OnDeviceStatus | null) ?? 'ready',
      failOnDevice: params.has('failOnDevice'),
      delayMs: Number(params.get('delay') ?? 350),
    });
    note.hidden = false;
    note.textContent = 'Sample mode · answers are stand-ins, no model runs';
  } else {
    const config = await loadAppConfig('./firebase-config.json');
    if (config) {
      const app = initFirebase(config);
      adapter = new FirebaseAdapter(config, app);
      syncFactory = () => createFirestoreSync(app);
    } else {
      adapter = new NoConfigAdapter();
      note.hidden = false;
      note.textContent = 'Setup needed · add a Firebase config file (see the README)';
    }
  }

  const ui: { current?: Margin } = {};
  const sync = new SyncController(known, store, syncFactory, () => ui.current?.refresh());
  await sync.init();
  const service = new MarginService(adapter);
  const margin = new Margin({ root: thread, service, known, sync, getWalkthroughText: () => thread.innerText });
  ui.current = margin;
  margin.start();

  const go = document.getElementById('own-go') as HTMLButtonElement;
  const area = document.getElementById('own-text') as HTMLTextAreaElement;
  go.addEventListener('click', () => {
    const text = area.value.trim();
    if (!text) return;
    thread.replaceChildren(
      renderTurn({ kind: 'agent', label: 'Your text', paragraphs: text.split(/\n{2,}/) }),
    );
    margin.scan();
  });
}

void main();
