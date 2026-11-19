import { normalizeTerm } from './known-terms';

/** The longest term name we will ever send off the device. Page text is longer than this by design. */
export const MAX_SYNC_TERM_CHARS = 64;
export const MAX_SYNC_TERM_WORDS = 4;
export const MAX_SYNC_TERMS = 2000;

/** Keep only things that look like term names. Anything sentence-like is dropped, never sent. */
export function sanitizeTermsForSync(terms: string[]): string[] {
  const out = new Set<string>();
  for (const raw of terms) {
    const t = normalizeTerm(raw);
    if (!t || t.length > MAX_SYNC_TERM_CHARS) continue;
    if (t.split(' ').length > MAX_SYNC_TERM_WORDS) continue;
    if (/[\n\r]/.test(raw)) continue;
    out.add(t);
    if (out.size >= MAX_SYNC_TERMS) break;
  }
  return [...out].sort();
}

/** First-time merge when sync is switched on: keep everything either side knows. */
export function mergeTerms(local: string[], remote: string[]): string[] {
  return sanitizeTermsForSync([...local, ...remote]);
}

export interface TermSync {
  /** Resolves with the remote term names (empty if none). */
  pull(): Promise<string[]>;
  /** Overwrite the remote list with these term names. */
  push(terms: string[]): Promise<void>;
}
