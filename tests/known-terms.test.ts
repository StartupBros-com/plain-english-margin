import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, KnownTerms, loadSettings, MemoryStore, normalizeTerm, saveSettings } from '../src/core/known-terms';

describe('KnownTerms', () => {
  it('normalises case, spacing and backticks', () => {
    expect(normalizeTerm('  `Merge   Conflict` ')).toBe('merge conflict');
  });

  it('adds, answers has() case-insensitively, and removes', async () => {
    const k = new KnownTerms(new MemoryStore());
    await k.add('Lockfile');
    expect(k.has('lockfile')).toBe(true);
    expect(k.list()).toEqual(['lockfile']);
    await k.remove('LOCKFILE');
    expect(k.has('lockfile')).toBe(false);
  });

  it('persists to the store and reloads', async () => {
    const store = new MemoryStore();
    const a = new KnownTerms(store);
    await a.add('rebase');
    const b = new KnownTerms(store);
    await b.load();
    expect(b.list()).toEqual(['rebase']);
  });

  it('tolerates junk in storage', async () => {
    const store = new MemoryStore();
    await store.set('pem.knownTerms', ['ok', 5, null]);
    const k = new KnownTerms(store);
    await k.load();
    expect(k.list()).toEqual(['ok']);
  });

  it('notifies subscribers on change only', async () => {
    const k = new KnownTerms(new MemoryStore());
    let n = 0;
    k.subscribe(() => n++);
    await k.add('a1');
    await k.add('a1');
    await k.remove('zzz');
    expect(n).toBe(1);
  });

  it('keeps sync off by default', async () => {
    const store = new MemoryStore();
    expect(await loadSettings(store)).toEqual(DEFAULT_SETTINGS);
    expect(DEFAULT_SETTINGS.syncEnabled).toBe(false);
    await saveSettings(store, { syncEnabled: true });
    expect((await loadSettings(store)).syncEnabled).toBe(true);
  });
});
