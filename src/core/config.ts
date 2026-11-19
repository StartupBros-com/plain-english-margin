/**
 * The Firebase web config lives in a file that is never committed.
 * See `firebase-config.example.json` for the shape.
 */
export interface FirebaseWebConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  appId: string;
  storageBucket?: string;
  messagingSenderId?: string;
}

export interface AppConfig {
  firebase: FirebaseWebConfig;
  /** Cloud model used for long input and as the fallback. Optional. */
  cloudModel?: string;
  /** Optional fixed App Check debug token (development only). If absent, the SDK prints a fresh one to the console. */
  appCheckDebugToken?: string;
}

export const DEFAULT_CLOUD_MODEL = 'gemini-3.5-flash-lite';

export function parseAppConfig(raw: unknown): AppConfig | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const o = raw as Record<string, unknown>;
  const fb = o.firebase as Record<string, unknown> | undefined;
  if (!fb || typeof fb !== 'object') return undefined;
  for (const k of ['apiKey', 'authDomain', 'projectId', 'appId']) {
    const v = fb[k];
    if (typeof v !== 'string' || v.length === 0 || /^YOUR_|PLACEHOLDER/i.test(v)) return undefined;
  }
  return {
    firebase: fb as unknown as FirebaseWebConfig,
    cloudModel: typeof o.cloudModel === 'string' ? o.cloudModel : undefined,
    appCheckDebugToken:
      typeof o.appCheckDebugToken === 'string' && !/^(OPTIONAL_|YOUR_)|PLACEHOLDER/i.test(o.appCheckDebugToken) && o.appCheckDebugToken
        ? o.appCheckDebugToken
        : undefined,
  };
}

/** Load `firebase-config.json` served next to the page. Returns undefined when it is absent or still has placeholders. */
export async function loadAppConfig(url: string): Promise<AppConfig | undefined> {
  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return undefined;
    return parseAppConfig(await res.json());
  } catch {
    return undefined;
  }
}
