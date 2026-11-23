import { describe, expect, it } from 'vitest';
import { parseLookup, parseWalkthrough } from '../src/core/schema';

const page = 'The linter flagged two unused imports in the lockfile step.';
const ctx = { term: 'linter', pageText: page };

describe('parseLookup', () => {
  it('accepts a well-formed answer', () => {
    const r = parseLookup(JSON.stringify({ term: 'linter', plain: 'A tool that checks code for sloppy spots.', why: 'It caught two small problems.' }), ctx);
    expect(r).toEqual({ ok: true, value: { term: 'linter', plain: 'A tool that checks code for sloppy spots.', why: 'It caught two small problems.' } });
  });
  it('accepts a null or absent why', () => {
    expect(parseLookup('{"term":"linter","plain":"A checker.","why":null}', ctx).ok).toBe(true);
    expect(parseLookup('{"term":"linter","plain":"A checker."}', ctx).ok).toBe(true);
  });
  it('strips a code fence', () => {
    expect(parseLookup('```json\n{"term":"linter","plain":"A checker."}\n```', ctx).ok).toBe(true);
  });

  // Planted negative: this is the case the work spec requires to be rejected.
  it('REJECTS an answer that is missing schema fields', () => {
    expect(parseLookup('{"term":"linter"}', ctx)).toEqual({ ok: false, reason: 'missing or oversized explanation' });
    expect(parseLookup('{"plain":"A checker."}', ctx)).toEqual({ ok: false, reason: 'missing term' });
    expect(parseLookup('{"term":"linter","plain":""}', ctx).ok).toBe(false);
  });
  it('REJECTS an answer that names a term that does not occur in the page text', () => {
    const r = parseLookup('{"term":"kubernetes","plain":"A system for running containers."}', ctx);
    expect(r).toEqual({ ok: false, reason: 'term does not occur in the page text' });
  });
  it('REJECTS an answer about a different term that does occur in the page', () => {
    const r = parseLookup('{"term":"lockfile","plain":"A list of versions."}', ctx);
    expect(r).toEqual({ ok: false, reason: 'answered a different term than the one asked' });
  });
  it('rejects non-JSON, arrays, wrong types and oversized text', () => {
    expect(parseLookup('The linter is a tool.', ctx).ok).toBe(false);
    expect(parseLookup('[1,2]', ctx).ok).toBe(false);
    expect(parseLookup('{"term":"linter","plain":42}', ctx).ok).toBe(false);
    expect(parseLookup(JSON.stringify({ term: 'linter', plain: 'x'.repeat(401) }), ctx).ok).toBe(false);
    expect(parseLookup('{"term":"linter","plain":"ok","why":7}', ctx).ok).toBe(false);
  });
});

describe('parseWalkthrough', () => {
  const good = { summary: 'The agent fixed a failing check.', steps: [{ title: 'Read', detail: 'It read the code.' }, { title: 'Fixed', detail: 'It fixed the order.' }] };
  it('accepts a well-formed walkthrough', () => {
    expect(parseWalkthrough(JSON.stringify(good))).toEqual({ ok: true, value: good });
  });
  it('rejects missing summary, empty steps, and steps missing fields', () => {
    expect(parseWalkthrough(JSON.stringify({ steps: good.steps })).ok).toBe(false);
    expect(parseWalkthrough(JSON.stringify({ summary: 's', steps: [] })).ok).toBe(false);
    expect(parseWalkthrough(JSON.stringify({ summary: 's', steps: [{ title: 'only' }] })).ok).toBe(false);
    expect(parseWalkthrough('nope').ok).toBe(false);
  });
});

describe('shared response envelope', () => {
  it('preserves the distinction between invalid JSON and a non-object in both parsers', () => {
    for (const [raw, reason] of [
      ['', 'not valid JSON'],
      ['{', 'not valid JSON'],
      ['true', 'not an object'],
      ['null', 'not an object'],
      ['42', 'not an object'],
      ['"text"', 'not an object'],
      ['[]', 'not an object'],
      ['```json\n[{}]\n```', 'not an object'],
      ['```JSON\nundefined\n```', 'not valid JSON'],
    ]) {
      expect(parseLookup(raw, ctx)).toEqual({ ok: false, reason });
      expect(parseWalkthrough(raw)).toEqual({ ok: false, reason });
    }
  });
});
