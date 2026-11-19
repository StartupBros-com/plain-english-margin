import type { JsonSchema, Lookup, Walkthrough } from './types';

export const LOOKUP_SCHEMA: JsonSchema = {
  type: 'object',
  properties: {
    term: { type: 'string', description: 'The term being explained, exactly as it appears in the text.' },
    plain: { type: 'string', description: 'One plain sentence, no jargon, that fits the surrounding sentence.' },
    why: { type: 'string', description: 'Optional: one short line on why it matters here.' },
  },
  required: ['term', 'plain'],
};

export const WALKTHROUGH_SCHEMA: JsonSchema = {
  type: 'object',
  properties: {
    summary: { type: 'string', description: 'One or two plain sentences on what happened overall.' },
    steps: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'A short plain heading for the step.' },
          detail: { type: 'string', description: 'One or two plain sentences.' },
        },
        required: ['title', 'detail'],
      },
    },
  },
  required: ['summary', 'steps'],
};

export type ParseResult<T> = { ok: true; value: T } | { ok: false; reason: string };

const MAX_PLAIN = 400;
const MAX_WHY = 300;
const MAX_STEPS = 12;

function parseJson(raw: string): unknown {
  const trimmed = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  return JSON.parse(trimmed);
}

function nonEmptyString(v: unknown, max: number): string | undefined {
  if (typeof v !== 'string') return undefined;
  const s = v.trim();
  return s.length > 0 && s.length <= max ? s : undefined;
}

function squash(s: string): string {
  return s.toLowerCase().replace(/[`'"]/g, '').replace(/\s+/g, ' ').trim();
}

/**
 * Accept a model answer only if it matches the lookup schema, names the term we asked about,
 * and that term really occurs in the page text. Anything else is rejected, never shown as an explanation.
 */
export function parseLookup(raw: string, ctx: { term: string; pageText: string }): ParseResult<Lookup> {
  let data: unknown;
  try {
    data = parseJson(raw);
  } catch {
    return { ok: false, reason: 'not valid JSON' };
  }
  if (!data || typeof data !== 'object' || Array.isArray(data)) return { ok: false, reason: 'not an object' };
  const o = data as Record<string, unknown>;
  const term = nonEmptyString(o.term, 80);
  const plain = nonEmptyString(o.plain, MAX_PLAIN);
  if (!term) return { ok: false, reason: 'missing term' };
  if (!plain) return { ok: false, reason: 'missing or oversized explanation' };
  if (o.why !== undefined && o.why !== null && nonEmptyString(o.why, MAX_WHY) === undefined) {
    return { ok: false, reason: 'bad why field' };
  }
  if (!squash(ctx.pageText).includes(squash(term))) return { ok: false, reason: 'term does not occur in the page text' };
  if (squash(term) !== squash(ctx.term)) return { ok: false, reason: 'answered a different term than the one asked' };
  const why = o.why === undefined || o.why === null ? undefined : nonEmptyString(o.why, MAX_WHY);
  return { ok: true, value: why ? { term: ctx.term, plain, why } : { term: ctx.term, plain } };
}

export function parseWalkthrough(raw: string): ParseResult<Walkthrough> {
  let data: unknown;
  try {
    data = parseJson(raw);
  } catch {
    return { ok: false, reason: 'not valid JSON' };
  }
  if (!data || typeof data !== 'object' || Array.isArray(data)) return { ok: false, reason: 'not an object' };
  const o = data as Record<string, unknown>;
  const summary = nonEmptyString(o.summary, 600);
  if (!summary) return { ok: false, reason: 'missing summary' };
  if (!Array.isArray(o.steps) || o.steps.length === 0 || o.steps.length > MAX_STEPS) {
    return { ok: false, reason: 'steps missing or out of range' };
  }
  const steps = [];
  for (const s of o.steps) {
    const rec = s as Record<string, unknown> | null;
    const title = nonEmptyString(rec?.title, 120);
    const detail = nonEmptyString(rec?.detail, 500);
    if (!title || !detail) return { ok: false, reason: 'a step is missing its title or detail' };
    steps.push({ title, detail });
  }
  return { ok: true, value: { summary, steps } };
}
