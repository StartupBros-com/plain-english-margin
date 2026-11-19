import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { appCheckMode, parseAppConfig } from '../src/core/config';

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
  it('picks reCAPTCHA v3 only for a hosted config with a real site key and no debug token', () => {
    const fb = { apiKey: 'k', authDomain: 'a', projectId: 'p', appId: 'i' };
    const hosted = parseAppConfig({ firebase: fb, recaptchaSiteKey: '6Lc-site-key' });
    expect(hosted?.recaptchaSiteKey).toBe('6Lc-site-key');
    expect(hosted && appCheckMode(hosted)).toBe('recaptcha-v3');
    const dev = parseAppConfig({ firebase: fb, recaptchaSiteKey: '6Lc-site-key', appCheckDebugToken: 'abc-123' });
    expect(dev && appCheckMode(dev)).toBe('debug');
    const placeholder = parseAppConfig({ firebase: fb, recaptchaSiteKey: 'OPTIONAL_RECAPTCHA_V3_SITE_KEY_FOR_A_HOSTED_PAGE' });
    expect(placeholder?.recaptchaSiteKey).toBeUndefined();
    expect(placeholder && appCheckMode(placeholder)).toBe('debug');
  });
  it('rejects junk', () => {
    expect(parseAppConfig(null)).toBeUndefined();
    expect(parseAppConfig({ firebase: { apiKey: 'k' } })).toBeUndefined();
  });
});
