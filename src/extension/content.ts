import { KnownTerms, type KeyValueStore } from '../core/known-terms';
import { MarginService } from '../core/service';
import { SyncController } from '../core/sync-controller';
import { Margin } from '../ui/margin';
import { ensureHost, hostConfigured, RemoteAdapter, remoteSync } from './remote-adapter';

class ChromeStore implements KeyValueStore {
  async get(key: string): Promise<unknown> {
    return (await chrome.storage.local.get(key))[key];
  }
  async set(key: string, value: unknown): Promise<void> {
    await chrome.storage.local.set({ [key]: value });
  }
}

interface Active {
  margin: Margin;
  observer: MutationObserver;
}

const w = window as unknown as { __pemActive?: Active | 'starting' };

async function turnOn(): Promise<void> {
  w.__pemActive = 'starting';
  await ensureHost();
  const store = new ChromeStore();
  const known = new KnownTerms(store);
  await known.load();
  const configured = await hostConfigured();
  const ui: { current?: Margin } = {};
  const sync = new SyncController(known, store, configured ? () => Promise.resolve(remoteSync) : undefined, () => ui.current?.refresh());
  await sync.init();
  const root = document.querySelector<HTMLElement>('main, article, [role="main"]') ?? document.body;
  const margin = new Margin({
    root,
    service: new MarginService(new RemoteAdapter()),
    known,
    sync,
    getWalkthroughText: () => {
      const picked = window.getSelection()?.toString().trim();
      return (picked && picked.length > 200 ? picked : root.innerText).slice(0, 20000);
    },
  });
  ui.current = margin;
  margin.start();

  // Pages that stream in new text get re-scanned, quietly, after they settle.
  let timer = 0;
  const observer = new MutationObserver((records) => {
    if (records.every((r) => (r.target as Element).closest?.('#pem-host, .pem-term'))) return;
    clearTimeout(timer);
    timer = window.setTimeout(() => {
      observer.disconnect();
      margin.scan();
      observer.observe(root, { childList: true, subtree: true, characterData: true });
    }, 1000);
  });
  observer.observe(root, { childList: true, subtree: true, characterData: true });
  w.__pemActive = { margin, observer };
}

function turnOff(active: Active): void {
  active.observer.disconnect();
  active.margin.stop();
  w.__pemActive = undefined;
}

if (w.__pemActive === 'starting') {
  /* a second click while starting does nothing */
} else if (w.__pemActive) turnOff(w.__pemActive);
else void turnOn();
