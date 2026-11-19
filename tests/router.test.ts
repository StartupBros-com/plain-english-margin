import { describe, expect, it } from 'vitest';
import {
  chooseRoute,
  LOOKUP_ON_DEVICE_MAX_CHARS,
  ON_DEVICE_FAILED_ROUTE,
  reasonFor,
  reasonText,
  sourceLabel,
  WALKTHROUGH_ON_DEVICE_MAX_CHARS,
} from '../src/core/router';

describe('chooseRoute', () => {
  it('keeps short lookups on-device when the model is ready', () => {
    expect(chooseRoute({ task: 'lookup', inputChars: 200, onDevice: 'ready' })).toEqual({ mode: 'prefer-on-device', reason: 'short-lookup' });
  });
  it('sends long input to the cloud', () => {
    expect(chooseRoute({ task: 'lookup', inputChars: LOOKUP_ON_DEVICE_MAX_CHARS + 1, onDevice: 'ready' })).toEqual({ mode: 'only-in-cloud', reason: 'long-input' });
    expect(chooseRoute({ task: 'walkthrough', inputChars: WALKTHROUGH_ON_DEVICE_MAX_CHARS + 1, onDevice: 'ready' }).reason).toBe('long-input');
  });
  it('sends everything to the cloud when there is no usable on-device model', () => {
    for (const onDevice of ['missing', 'not-ready'] as const) {
      expect(chooseRoute({ task: 'lookup', inputChars: 50, onDevice })).toEqual({ mode: 'only-in-cloud', reason: 'no-on-device-model' });
    }
  });
  it('lets a short thread stay on-device', () => {
    expect(chooseRoute({ task: 'walkthrough', inputChars: 900, onDevice: 'ready' }).reason).toBe('short-thread');
  });
  it('long input wins over a missing model in the reason', () => {
    expect(chooseRoute({ task: 'walkthrough', inputChars: 9000, onDevice: 'missing' }).reason).toBe('long-input');
  });
  it('has a failed-on-device route that goes to the cloud', () => {
    expect(ON_DEVICE_FAILED_ROUTE).toEqual({ mode: 'only-in-cloud', reason: 'on-device-failed' });
  });
});

describe('reasonFor', () => {
  it('reports the truth when on-device was asked but the cloud answered', () => {
    expect(reasonFor({ mode: 'prefer-on-device', reason: 'short-lookup' }, 'cloud')).toBe('on-device-not-ready');
    expect(reasonFor({ mode: 'prefer-on-device', reason: 'short-lookup' }, 'on-device')).toBe('short-lookup');
    expect(reasonFor({ mode: 'only-in-cloud', reason: 'long-input' }, 'cloud')).toBe('long-input');
  });
});

describe('labels', () => {
  it('names the model and flags simulated answers', () => {
    expect(sourceLabel('on-device', false)).toContain('Gemini Nano');
    expect(sourceLabel('cloud', false)).toContain('cloud');
    expect(sourceLabel('on-device', true)).toContain('no model ran');
  });
  it('has a plain sentence for every reason', () => {
    for (const r of ['short-lookup', 'short-thread', 'long-input', 'no-on-device-model', 'on-device-failed', 'on-device-not-ready'] as const) {
      expect(reasonText(r).length).toBeGreaterThan(10);
    }
  });
});
