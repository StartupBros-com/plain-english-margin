import { describe, expect, it } from 'vitest';
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
});

describe('sentenceAround', () => {
  it('returns just the sentence holding the term', () => {
    const t = 'First thing. The cache was stale, so I cleared it. Last thing.';
    const s = t.indexOf('cache');
    expect(sentenceAround(t, s, s + 5)).toBe('The cache was stale, so I cleared it.');
  });
});
