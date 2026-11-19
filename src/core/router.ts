import type { OnDeviceStatus, Route, RouteReason, Source, Task } from './types';

/** Characters of input above which the on-device model is not asked. The model's window is small. */
export const LOOKUP_ON_DEVICE_MAX_CHARS = 1500;
export const WALKTHROUGH_ON_DEVICE_MAX_CHARS = 2500;

export interface RouteInput {
  task: Task;
  inputChars: number;
  onDevice: OnDeviceStatus;
}

/** Decide where a request should run, and say why in one word we can show the reader. */
export function chooseRoute({ task, inputChars, onDevice }: RouteInput): Route {
  const limit = task === 'lookup' ? LOOKUP_ON_DEVICE_MAX_CHARS : WALKTHROUGH_ON_DEVICE_MAX_CHARS;
  if (inputChars > limit) return { mode: 'only-in-cloud', reason: 'long-input' };
  if (onDevice !== 'ready') return { mode: 'only-in-cloud', reason: 'no-on-device-model' };
  return { mode: 'prefer-on-device', reason: task === 'lookup' ? 'short-lookup' : 'short-thread' };
}

/** The route used after an on-device attempt threw. */
export const ON_DEVICE_FAILED_ROUTE: Route = { mode: 'only-in-cloud', reason: 'on-device-failed' };

/**
 * The reason we show must match what happened. If we asked for on-device but the SDK
 * answered from the cloud (for example while the model was still downloading), say so.
 */
export function reasonFor(route: Route, answeredBy: Source): RouteReason {
  if (route.mode === 'prefer-on-device' && answeredBy === 'cloud') return 'on-device-not-ready';
  return route.reason;
}

const REASON_TEXT: Record<RouteReason, string> = {
  'short-lookup': 'Short lookups stay on your device.',
  'short-thread': 'A short thread fits on your device.',
  'long-input': 'This is a lot of text, so the cloud handled it.',
  'no-on-device-model': 'This browser has no on-device model ready, so the cloud handled it.',
  'on-device-failed': 'The on-device try did not work, so the cloud handled it.',
  'on-device-not-ready': 'The on-device model was not ready yet, so the cloud handled it.',
};

export function reasonText(reason: RouteReason): string {
  return REASON_TEXT[reason];
}

export function sourceLabel(source: Source, simulated: boolean): string {
  const base = source === 'on-device' ? 'On your device · Gemini Nano' : 'In the cloud · Gemini';
  return simulated ? `${base} (sample, no model ran)` : base;
}
