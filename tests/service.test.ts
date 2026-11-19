import { describe, expect, it } from 'vitest';
import { FakeAdapter } from '../src/core/fake-adapter';
import { ConfigMissingError, MarginService } from '../src/core/service';
import type { InferenceAdapter } from '../src/core/types';

// These tests exercise routing, escalation and parsing through an injected fake.
// They do NOT show that any real model ran.

const page = 'The linter flagged two unused imports. Then a merge conflict appeared in the lockfile.';
const input = { term: 'linter', sentence: 'The linter flagged two unused imports.', pageText: page };

describe('MarginService.explainTerm', () => {
  it('uses the on-device route for a short lookup', async () => {
    const fake = new FakeAdapter();
    const r = await new MarginService(fake).explainTerm(input);
    expect(fake.calls[0]?.mode).toBe('prefer-on-device');
    expect(r.ok && r.via).toEqual({ source: 'on-device', reason: 'short-lookup', simulated: true });
  });

  it('goes to the cloud when there is no on-device model', async () => {
    const fake = new FakeAdapter({ onDevice: 'missing' });
    const r = await new MarginService(fake).explainTerm(input);
    expect(fake.calls.map((c) => c.mode)).toEqual(['only-in-cloud']);
    expect(r.ok && r.via).toMatchObject({ source: 'cloud', reason: 'no-on-device-model' });
  });

  it('retries in the cloud when the on-device attempt throws, and says so', async () => {
    const fake = new FakeAdapter({ failOnDevice: true });
    const r = await new MarginService(fake).explainTerm(input);
    expect(fake.calls.map((c) => c.mode)).toEqual(['prefer-on-device', 'only-in-cloud']);
    expect(r.ok && r.via).toMatchObject({ source: 'cloud', reason: 'on-device-failed' });
  });

  it('is honest when the SDK answered from the cloud though on-device was requested', async () => {
    const adapter: InferenceAdapter = {
      onDeviceStatus: async () => 'ready',
      generate: async () => ({ text: '{"term":"linter","plain":"A checker."}', source: 'cloud' }),
    };
    const r = await new MarginService(adapter).explainTerm(input);
    expect(r.ok && r.via).toMatchObject({ source: 'cloud', reason: 'on-device-not-ready', simulated: false });
  });

  it('sends a very long sentence to the cloud', async () => {
    const fake = new FakeAdapter();
    await new MarginService(fake).explainTerm({ ...input, sentence: 'x'.repeat(2000) });
    expect(fake.calls[0]?.mode).toBe('only-in-cloud');
  });

  // Planted negative, end to end through the service.
  it('shows a fallback, never an explanation, for a response that breaks the schema', async () => {
    const bad = [
      '{"term":"linter"}',
      '{"term":"kubernetes","plain":"Runs containers."}',
      'sure! a linter is a tool',
    ];
    for (const text of bad) {
      const fake = new FakeAdapter({ respondWith: () => text });
      const r = await new MarginService(fake).explainTerm(input);
      expect(r.ok).toBe(false);
      if (!r.ok) {
        expect(r.fallback.kind).toBe('rejected');
        expect(r.fallback.via?.source).toBe('on-device');
      }
    }
  });

  it('does not cache fallbacks, so Try again can succeed', async () => {
    let good = false;
    const fake = new FakeAdapter({ respondWith: () => (good ? '{"term":"linter","plain":"A checker."}' : '{}') });
    const svc = new MarginService(fake);
    expect((await svc.explainTerm(input)).ok).toBe(false);
    good = true;
    expect((await svc.explainTerm(input)).ok).toBe(true);
    expect(fake.calls).toHaveLength(2);
  });

  it('caches good answers', async () => {
    const fake = new FakeAdapter();
    const svc = new MarginService(fake);
    await svc.explainTerm(input);
    await svc.explainTerm(input);
    expect(fake.calls).toHaveLength(1);
  });

  it('reports a missing config distinctly', async () => {
    const adapter: InferenceAdapter = {
      onDeviceStatus: async () => 'missing',
      generate: async () => {
        throw new ConfigMissingError();
      },
    };
    const r = await new MarginService(adapter).explainTerm(input);
    expect(!r.ok && r.fallback.kind).toBe('no-config');
  });

  it('reports unavailable when both routes fail', async () => {
    const r = await new MarginService(new FakeAdapter({ failAll: true })).explainTerm(input);
    expect(!r.ok && r.fallback.kind).toBe('unavailable');
  });
});

describe('MarginService.walkthrough', () => {
  it('escalates a long thread to the cloud even with a ready on-device model', async () => {
    const fake = new FakeAdapter();
    const r = await new MarginService(fake).walkthrough('word '.repeat(1200));
    expect(fake.calls[0]).toMatchObject({ task: 'walkthrough', mode: 'only-in-cloud' });
    expect(r.ok && r.via).toMatchObject({ source: 'cloud', reason: 'long-input' });
    expect(r.ok && r.value.steps.length).toBeGreaterThan(0);
  });

  it('rejects a walkthrough with no steps', async () => {
    const fake = new FakeAdapter({ respondWith: () => '{"summary":"x","steps":[]}' });
    const r = await new MarginService(fake).walkthrough('short thread');
    expect(!r.ok && r.fallback.kind).toBe('rejected');
  });
});
