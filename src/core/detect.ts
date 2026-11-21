import { ACRONYM_IGNORE, SEED_TERMS } from './seed-terms';
import { normalizeTerm } from './known-terms';

export type TermKind = 'code' | 'flag' | 'path' | 'file' | 'identifier' | 'acronym' | 'vocabulary';

export interface DetectedTerm {
  /** The text exactly as it appears on the page. */
  text: string;
  /** The normalised form used for the known-terms list. */
  term: string;
  start: number;
  end: number;
  kind: TermKind;
}

interface Pattern {
  kind: TermKind;
  re: RegExp;
  /** Capture group to highlight (0 = whole match). */
  group?: number;
  rank: number;
}

const FILE_EXT = 'ts|tsx|js|jsx|mjs|json|md|yml|yaml|py|rs|go|toml|lock|sh|env|css|html|sql|txt|cfg|ini';

const PATTERNS: Pattern[] = [
  { kind: 'code', re: /`([^`\n]{1,60})`/g, group: 1, rank: 0 },
  { kind: 'flag', re: /(?<![\w-])--[a-z][a-z0-9-]{1,30}\b/g, rank: 1 },
  { kind: 'path', re: /(?<![\w/.:-])(?:\.{1,2}\/|\/)?[\w.@-]+(?:\/[\w.@-]+)+(?![\w/:-])/g, rank: 2 },
  { kind: 'file', re: new RegExp(`(?<![\\w/.-])[\\w-]+(?:\\.[\\w-]+)*\\.(?:${FILE_EXT})\\b`, 'g'), rank: 3 },
  { kind: 'identifier', re: /\b[a-z][a-z0-9]*(?:_[a-z0-9]+)+\b/g, rank: 4 },
  { kind: 'identifier', re: /\b[a-z]+(?:[A-Z][a-z0-9]+)+\b/g, rank: 4 },
  { kind: 'identifier', re: /\b(?:[A-Z][a-z0-9]+){2,}\b/g, rank: 5 },
  { kind: 'acronym', re: /\b[A-Z]{2,6}s?\b/g, rank: 6 },
];

const SEED_RE = buildSeedRegex();

function buildSeedRegex(): RegExp {
  const sorted = [...new Set(SEED_TERMS)].sort((a, b) => b.length - a.length);
  const body = sorted.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/ /g, '\\s+')).join('|');
  return new RegExp(`(?<![\\w-])(?:${body})(?![\\w-])`, 'gi');
}

function isLikelyProse(match: string, kind: TermKind): boolean {
  if (kind === 'acronym') {
    const base = match.replace(/s$/, '');
    return ACRONYM_IGNORE.has(match) || ACRONYM_IGNORE.has(base);
  }
  if (kind === 'path') {
    // "and/or", "he/she" style slashes and bare dates are prose, not paths.
    return !/[.]|\/.*\//.test(match) && !match.startsWith('/') && !match.startsWith('.');
  }
  return false;
}

/**
 * Find candidate jargon in plain text. Terms the reader already knows are skipped.
 * Overlaps resolve to the earliest, then longest, match.
 */
export function detectTerms(text: string, known?: { has(term: string): boolean }): DetectedTerm[] {
  const found: (DetectedTerm & { rank: number })[] = [];

  for (const p of PATTERNS) {
    for (const m of text.matchAll(p.re)) {
      const group = p.group ?? 0;
      const matched = m[group];
      if (!matched || m.index === undefined) continue;
      if (isLikelyProse(matched, p.kind)) continue;
      const offset = group === 0 ? 0 : m[0].indexOf(matched);
      const start = m.index + offset;
      found.push({ text: matched, term: normalizeTerm(matched), start, end: start + matched.length, kind: p.kind, rank: p.rank });
    }
  }
  for (const m of text.matchAll(SEED_RE)) {
    if (m.index === undefined) continue;
    found.push({ text: m[0], term: normalizeTerm(m[0]), start: m.index, end: m.index + m[0].length, kind: 'vocabulary', rank: 7 });
  }

  found.sort((a, b) => a.start - b.start || b.end - b.start - (a.end - a.start) || a.rank - b.rank);

  const out: DetectedTerm[] = [];
  let cursor = -1;
  for (const f of found) {
    if (f.start < cursor) continue;
    cursor = f.end;
    if (known?.has(f.term)) continue;
    const { rank: _rank, ...rest } = f;
    void _rank;
    out.push(rest);
  }
  return out;
}

/** The sentence around a span, trimmed to a sane length for a prompt. */
export function sentenceAround(text: string, start: number, end: number, maxChars = 320): string {
  const before = text.slice(0, start);
  const after = text.slice(end);
  const s = Math.max(before.lastIndexOf('. '), before.lastIndexOf('\n'), before.lastIndexOf('! '), before.lastIndexOf('? '));
  const aEnd = after.search(/[.!?](\s|$)|\n/);
  const sentence = text.slice(s < 0 ? 0 : s + 1, aEnd < 0 ? text.length : end + aEnd + 1).trim();
  return sentence.length > maxChars ? sentence.slice(0, maxChars).trimEnd() + '…' : sentence;
}

/** How many highlighted terms are in this text, and how many were skipped because they are known. */
export function countTerms(text: string, known: { has(term: string): boolean }): { shown: number; hidden: number } {
  const hits = detectTerms(text);
  let hidden = 0;
  for (const hit of hits) {
    if (known?.has(hit.term)) hidden += 1;
  }
  return { shown: hits.length - hidden, hidden };
}
