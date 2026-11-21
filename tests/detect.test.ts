import { describe, expect, it, vi } from 'vitest';
import { countTerms, detectTerms, sentenceAround } from '../src/core/detect';
import { KnownTerms, MemoryStore } from '../src/core/known-terms';

const texts = (s: string) => detectTerms(s).map((d) => d.text);

describe('detectTerms', () => {
  it('finds seed vocabulary, case-insensitively and across spaces', () => {
    expect(texts('The Linter flagged a merge   conflict in the lockfile.')).toEqual(['Linter', 'merge   conflict', 'lockfile']);
  });

  it('finds code-ish tokens', () => {
    const found = texts('Open src/styles/tokens.css and call readSavedTheme with --verbose; set dark_mode_enabled and see ThemeProvider.');
    expect(found).toEqual(['src/styles/tokens.css', 'readSavedTheme', '--verbose', 'dark_mode_enabled', 'ThemeProvider']);
  });

  it('highlights inside backticks, not the backticks themselves', () => {
    const [hit] = detectTerms('Run `make test` now.');
    expect(hit?.text).toBe('make test');
    expect('Run `make test` now.'.slice(hit!.start, hit!.end)).toBe('make test');
  });

  it('finds acronyms but skips everyday all-caps words', () => {
    expect(texts('The CI and API checks are OK, ASAP.')).toEqual(['CI', 'API']);
  });

  it('ignores prose slashes such as and/or', () => {
    expect(texts('Bring it and/or send it.')).toEqual([]);
  });

  it('prefers the longest overlapping match', () => {
    expect(texts('Open a pull request today.')).toEqual(['pull request']);
  });

  it('returns spans that map back to the original text', () => {
    const t = 'A race condition hit the cache.';
    for (const d of detectTerms(t)) expect(t.slice(d.start, d.end)).toBe(d.text);
  });

  it('skips terms on the known list', async () => {
    const known = new KnownTerms(new MemoryStore());
    await known.add('Linter');
    expect(detectTerms('The linter ran. The lockfile changed.', known).map((d) => d.text)).toEqual(['lockfile']);
  });

  it('counts shown and hidden terms', async () => {
    const known = new KnownTerms(new MemoryStore());
    await known.add('lockfile');
    expect(countTerms('The linter and the lockfile.', known)).toEqual({ shown: 1, hidden: 1 });
  });

  it('counts only overlap winners and checks repeated occurrences in text order', () => {
    const known = { has: vi.fn((term: string) => term === 'ci pipeline' || term === 'lockfile') };
    const result = countTerms('A `CI pipeline`, lockfile, linter and another lockfile.', known);
    expect(result).toEqual({ shown: 1, hidden: 3 });
    expect(known.has.mock.calls).toEqual([['ci pipeline'], ['lockfile'], ['linter'], ['lockfile']]);
  });

  it('does not query known terms when the input has no hits', () => {
    const known = { has: vi.fn(() => false) };
    expect(countTerms('Take a walk.', known)).toEqual({ shown: 0, hidden: 0 });
    expect(known.has).not.toHaveBeenCalled();
  });

  it('scans text only once when counting terms', () => {
    const text = 'The CI pipeline and the lockfile.';
    const matchAll = vi.spyOn(String.prototype, 'matchAll');
    try {
      detectTerms(text);
      const singleScan = matchAll.mock.calls.length;
      expect(singleScan).toBeGreaterThan(0);
      matchAll.mockClear();
      countTerms(text, { has: () => false });
      expect(matchAll.mock.calls.length).toBe(singleScan);
    } finally {
      matchAll.mockRestore();
    }
  });
});

describe('sentenceAround', () => {
  it('returns just the sentence holding the term', () => {
    const t = 'First thing. The cache was stale, so I cleared it. Last thing.';
    const s = t.indexOf('cache');
    expect(sentenceAround(t, s, s + 5)).toBe('The cache was stale, so I cleared it.');
  });
});
