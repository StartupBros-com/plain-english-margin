import { loadAppConfig } from '../core/config';
import { FirebaseAdapter, initFirebase } from '../core/firebase-adapter';
import { createFirestoreSync } from '../core/firebase-sync';
import { ConfigMissingError } from '../core/service';
import type { TermSync } from '../core/sync';
import type { InferenceRequest } from '../core/types';
import type { HostRequest, HostResponse } from './messages';

/** Runs in an extension page, which is a top-level window, so the Prompt API is reachable here. */
let ready: Promise<{ adapter: FirebaseAdapter; sync: Promise<TermSync> } | undefined> | undefined;

function boot() {
  ready ??= (async () => {
    const config = await loadAppConfig(chrome.runtime.getURL('firebase-config.json'));
    if (!config) return undefined;
    const app = initFirebase(config);
    return { adapter: new FirebaseAdapter(config, app), sync: createFirestoreSync(app) };
  })();
  return ready;
}

async function handle(req: HostRequest): Promise<unknown> {
  const fb = await boot();
  if (req.op === 'status') return fb !== undefined;
  if (!fb) {
    if (req.op === 'onDeviceStatus') return 'missing';
    throw new ConfigMissingError();
  }
  switch (req.op) {
    case 'onDeviceStatus':
      return fb.adapter.onDeviceStatus();
    case 'generate':
      return fb.adapter.generate(req.payload as InferenceRequest);
    case 'syncPull':
      return (await fb.sync).pull();
    case 'syncPush':
      await (await fb.sync).push(req.payload as string[]);
      return null;
  }
}

chrome.runtime.onMessage.addListener((msg: HostRequest, _sender, sendResponse: (r: HostResponse) => void) => {
  if (msg?.target !== 'pem-host') return false;
  handle(msg).then(
    (data) => sendResponse({ ok: true, data }),
    (e: Error) => sendResponse({ ok: false, error: { name: e?.name ?? 'Error', message: e?.message ?? 'Unknown error' } }),
  );
  return true;
});
