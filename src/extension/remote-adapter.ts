import type { InferenceAdapter, InferenceRequest, InferenceResult, OnDeviceStatus } from '../core/types';
import type { TermSync } from '../core/sync';
import type { BackgroundRequest, HostOp, HostRequest, HostResponse } from './messages';

async function callHost(op: HostOp, payload?: unknown): Promise<unknown> {
  const req: HostRequest = { target: 'pem-host', op, payload };
  const res = (await chrome.runtime.sendMessage(req)) as HostResponse | undefined;
  if (!res) throw new Error('The extension host did not answer');
  if (!res.ok) {
    const err = new Error(res.error.message);
    err.name = res.error.name;
    throw err;
  }
  return res.data;
}

export async function ensureHost(): Promise<void> {
  const req: BackgroundRequest = { target: 'pem-bg', op: 'ensure-host' };
  await chrome.runtime.sendMessage(req);
}

export async function hostConfigured(): Promise<boolean> {
  try {
    return (await callHost('status')) === true;
  } catch {
    return false;
  }
}

/**
 * The content script never touches Firebase. It asks the extension's own page (offscreen document),
 * which holds the Firebase AI Logic client, to run the call.
 */
export class RemoteAdapter implements InferenceAdapter {
  async onDeviceStatus(): Promise<OnDeviceStatus> {
    return (await callHost('onDeviceStatus')) as OnDeviceStatus;
  }
  async generate(req: InferenceRequest): Promise<InferenceResult> {
    return (await callHost('generate', req)) as InferenceResult;
  }
}

export const remoteSync: TermSync = {
  pull: async () => (await callHost('syncPull')) as string[],
  push: async (terms) => {
    await callHost('syncPush', terms);
  },
};
