import { describe, expect, it } from 'vitest';
import { detectTerms } from '../src/core/detect';
import { walkthroughPrompt } from '../src/core/prompts';
import { WALKTHROUGH_ON_DEVICE_MAX_CHARS } from '../src/core/router';
import { DEMO_TRANSCRIPT } from '../src/web/demo-transcript';

const text = DEMO_TRANSCRIPT.map((t) => [t.label, ...(t.paragraphs ?? []), t.code ?? ''].join('\n')).join('\n').replace(/`/g, '');

describe('demo transcript', () => {
  it('is long enough that "What just happened?" escalates to the cloud', () => {
    expect(walkthroughPrompt(text).length).toBeGreaterThan(WALKTHROUGH_ON_DEVICE_MAX_CHARS);
  });
  it('has plenty of jargon to highlight', () => {
    expect(detectTerms(text).length).toBeGreaterThan(30);
  });
  it('names no real products or people', () => {
    expect(text).not.toMatch(/claude|codex|cursor|openai|anthropic|github|google|\/home\//i);
  });
});
