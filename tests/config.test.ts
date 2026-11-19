import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { parseAppConfig } from '../src/core/config';

describe('parseAppConfig', () => {
  it('treats the shipped example (all placeholders) as "not configured"', () => {
    const example = JSON.parse(readFileSync('firebase-config.example.json', 'utf8')) as unknown;
    expect(parseAppConfig(example)).toBeUndefined();
  });
  it('accepts a complete config', () => {
    const c = parseAppConfig({ firebase: { apiKey: 'k', authDomain: 'a', projectId: 'p', appId: 'i' }, cloudModel: 'm' });
    expect(c?.cloudModel).toBe('m');
  });
  it('ignores a placeholder debug token so it is never used as a real one', () => {
    const fb = { apiKey: 'k', authDomain: 'a', projectId: 'p', appId: 'i' };
    expect(parseAppConfig({ firebase: fb, appCheckDebugToken: 'OPTIONAL_DEBUG_TOKEN_FROM_THE_CONSOLE_DEVELOPMENT_ONLY' })?.appCheckDebugToken).toBeUndefined();
    expect(parseAppConfig({ firebase: fb, appCheckDebugToken: '' })?.appCheckDebugToken).toBeUndefined();
    expect(parseAppConfig({ firebase: fb, appCheckDebugToken: 'abc-123' })?.appCheckDebugToken).toBe('abc-123');
  });
  it('rejects junk', () => {
    expect(parseAppConfig(null)).toBeUndefined();
    expect(parseAppConfig({ firebase: { apiKey: 'k' } })).toBeUndefined();
  });
});
