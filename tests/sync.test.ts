import { describe, expect, it } from 'vitest';
import { KnownTerms, MemoryStore } from '../src/core/known-terms';
import { MAX_SYNC_TERM_CHARS, mergeTerms, sanitizeTermsForSync, type TermSync } from '../src/core/sync';
import { SyncController } from '../src/core/sync-controller';

describe('sanitizeTermsForSync', () => {
  it('keeps term names and drops anything that looks like page text', () => {
    const sentence = 'the agent regenerated the lockfile after the merge conflict';
    expect(sanitizeTermsForSync(['Lockfile', sentence, 'x'.repeat(MAX_SYNC_TERM_CHARS + 1), 'a\nb', '', 'rebase'])).toEqual(['lockfile', 'rebase']);
  });
  it('merges both sides without duplicates', () => {
    expect(mergeTerms(['a1', 'b2'], ['B2', 'c3'])).toEqual(['a1', 'b2', 'c3']);
  });
});

class FakeRemote implements TermSync {
  pushed: string[][] = [];
  constructor(public remote: string[]) {}
  async pull() {
    return this.remote;
  }
  async push(terms: string[]) {
    this.pushed.push(terms);
    this.remote = terms;
  }
}

describe('SyncController', () => {
  it('is off by default and never builds a remote', async () => {
    let built = 0;
    const known = new KnownTerms(new MemoryStore());
    const c = new SyncController(known, new MemoryStore(), () => {
      built++;
      return Promise.resolve(new FakeRemote([]));
    });
    await c.init();
    await known.add('lockfile');
    expect(c.enabled).toBe(false);
    expect(c.status).toBe('off');
    expect(built).toBe(0);
  });

  it('reports unavailable when Firebase is not configured', async () => {
    const c = new SyncController(new KnownTerms(new MemoryStore()), new MemoryStore(), undefined);
    await c.init();
    await c.setEnabled(true);
    expect(c.available).toBe(false);
    expect(c.status).toBe('unavailable');
  });

  it('merges on enable, then pushes only term names on later changes', async () => {
    const remote = new FakeRemote(['cache']);
    const known = new KnownTerms(new MemoryStore());
    await known.add('lockfile');
    const c = new SyncController(known, new MemoryStore(), () => Promise.resolve(remote));
    await c.init();
    await c.setEnabled(true);
    expect(known.list()).toEqual(['cache', 'lockfile']);
    expect(c.status).toBe('on');
    await known.add('rebase');
    await new Promise((r) => setTimeout(r, 0));
    expect(remote.remote).toEqual(['cache', 'lockfile', 'rebase']);
  });

  it('stops pushing after it is turned off', async () => {
    const remote = new FakeRemote([]);
    const known = new KnownTerms(new MemoryStore());
    const c = new SyncController(known, new MemoryStore(), () => Promise.resolve(remote));
    await c.init();
    await c.setEnabled(true);
    await c.setEnabled(false);
    const before = remote.pushed.length;
    await known.add('stash');
    await new Promise((r) => setTimeout(r, 0));
    expect(remote.pushed.length).toBe(before);
    expect(c.status).toBe('off');
  });

  it('keeps the local list when the remote fails', async () => {
    const known = new KnownTerms(new MemoryStore());
    await known.add('lockfile');
    const c = new SyncController(known, new MemoryStore(), () => Promise.reject(new Error('offline')));
    await c.init();
    await c.setEnabled(true);
    expect(c.status).toBe('error');
    expect(known.list()).toEqual(['lockfile']);
  });
});
