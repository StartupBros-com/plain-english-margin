import { afterEach, beforeEach, expect, it, vi } from 'vitest';

// Re-execute the extension entry point as a toolbar click would, with controlled
// Chrome API promises and an inert page/UI. No real host or model is loaded.
const ui = vi.hoisted(() => ({ start: vi.fn(), stop: vi.fn() }));
vi.mock('../src/core/service', () => ({ MarginService: class {} }));
vi.mock('../src/ui/margin', () => ({
  Margin: class {
    start = ui.start;
    stop = ui.stop;
  },
}));

const sendMessage = vi.fn(async (request: { target: string; op: string; payload?: unknown }): Promise<{ ok: boolean; data?: unknown }> => {
  if (request.target === 'pem-bg' && request.op === 'ensure-host') return { ok: true };
  if (request.target === 'pem-host' && request.op === 'status') return { ok: true, data: false };
  throw new Error('Unexpected extension request');
});
const readStorage = vi.fn<(key: string) => Promise<Record<string, unknown>>>(async () => ({}));
const writeStorage = vi.fn();
const querySelector = vi.fn<() => object>();
const observe = vi.fn();
const disconnect = vi.fn();

async function inject(): Promise<void> {
  vi.resetModules();
  await import('../src/extension/content');
  await new Promise<void>(resolve => setImmediate(resolve));
}

beforeEach(() => {
  vi.clearAllMocks();
  const root = {};
  vi.stubGlobal('window', {});
  querySelector.mockReturnValue(root);
  vi.stubGlobal('document', { querySelector, body: root });
  vi.stubGlobal('MutationObserver', class {
    observe = observe;
    disconnect = disconnect;
  });
  vi.stubGlobal('chrome', { runtime: { sendMessage }, storage: { local: { get: readStorage, set: writeStorage } } });
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

it('ignores extra toolbar clicks while startup is pending, then toggles off and back on', async () => {
  let complete!: (reply: { ok: boolean }) => void;
  sendMessage.mockReturnValueOnce(new Promise(resolve => { complete = resolve; }));
  await inject();
  await inject();
  await inject();
  expect(sendMessage).toHaveBeenCalledTimes(1);
  expect(ui.start).not.toHaveBeenCalled();

  complete({ ok: true });
  await new Promise<void>(resolve => setImmediate(resolve));
  expect(ui.start).toHaveBeenCalledTimes(1);
  expect(observe).toHaveBeenCalledTimes(1);

  await inject();
  expect(ui.stop).toHaveBeenCalledTimes(1);
  expect(disconnect).toHaveBeenCalledTimes(1);
  await inject();
  expect(ui.start).toHaveBeenCalledTimes(2);
  expect(observe).toHaveBeenCalledTimes(2);
});

it('retries on the next toolbar click after a failed runtime message', async () => {
  sendMessage.mockRejectedValueOnce(new Error('Synthetic runtime failure detail'));
  await inject();
  expect(ui.start).not.toHaveBeenCalled();
  expect(readStorage).not.toHaveBeenCalled();

  await inject();
  expect(ui.start).toHaveBeenCalledTimes(1);
  expect(console.error).toHaveBeenCalledExactlyOnceWith('Plain-English Margin could not start.');
});

it('retries on the next toolbar click after a failed storage read', async () => {
  readStorage.mockRejectedValueOnce(new Error('Synthetic storage failure detail'));
  await inject();
  expect(ui.start).not.toHaveBeenCalled();

  await inject();
  expect(readStorage.mock.calls.filter(([key]) => key === 'pem.knownTerms')).toHaveLength(2);
  expect(ui.start).toHaveBeenCalledTimes(1);
  expect(console.error).toHaveBeenCalledExactlyOnceWith('Plain-English Margin could not start.');
});

it('retries on the next toolbar click after a failed sync settings read', async () => {
  readStorage.mockResolvedValueOnce({}).mockRejectedValueOnce(new Error('Synthetic settings failure detail'));
  await inject();
  expect(ui.start).not.toHaveBeenCalled();

  await inject();
  expect(readStorage.mock.calls.filter(([key]) => key === 'pem.settings')).toHaveLength(2);
  expect(ui.start).toHaveBeenCalledTimes(1);
  expect(console.error).toHaveBeenCalledExactlyOnceWith('Plain-English Margin could not start.');
});

it('keeps the existing local startup fallback when host setup resolves unsuccessfully', async () => {
  sendMessage.mockResolvedValueOnce({ ok: false });
  await inject();
  expect(ui.start).toHaveBeenCalledTimes(1);
  expect(console.error).not.toHaveBeenCalled();
});

it('does not repeat an already persisted sync when later page setup fails', async () => {
  readStorage.mockResolvedValueOnce({ 'pem.knownTerms': ['local'] })
    .mockResolvedValueOnce({ 'pem.settings': { syncEnabled: true } });
  sendMessage.mockResolvedValueOnce({ ok: true }) // ensure-host
    .mockResolvedValueOnce({ ok: true, data: true }) // status
    .mockResolvedValueOnce({ ok: true, data: ['remote'] }) // syncPull
    .mockResolvedValueOnce({ ok: true }); // syncPush
  querySelector.mockImplementationOnce(() => { throw new Error('Synthetic page setup detail'); });

  await inject();
  expect(writeStorage).toHaveBeenCalledExactlyOnceWith({ 'pem.knownTerms': ['local', 'remote'] });
  expect(sendMessage).toHaveBeenLastCalledWith({ target: 'pem-host', op: 'syncPush', payload: ['local', 'remote'] });
  expect(ui.start).not.toHaveBeenCalled();

  await inject();
  expect(sendMessage).toHaveBeenCalledTimes(4);
  expect(writeStorage).toHaveBeenCalledTimes(1);
  expect(ui.start).not.toHaveBeenCalled();
  expect(console.error).toHaveBeenCalledExactlyOnceWith('Plain-English Margin could not start.');
});

it('does not retry an instance whose start may already have touched the page', async () => {
  ui.start.mockImplementationOnce(() => { throw new Error('Synthetic partial mount detail'); });
  await inject();
  expect(ui.start).toHaveBeenCalledTimes(1);
  expect(observe).not.toHaveBeenCalled();

  await inject();
  expect(ui.start).toHaveBeenCalledTimes(1);
  expect(console.error).toHaveBeenCalledExactlyOnceWith('Plain-English Margin could not start.');
});
