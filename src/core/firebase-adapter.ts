import { initializeApp, type FirebaseApp } from 'firebase/app';
import { CustomProvider, ReCaptchaV3Provider, initializeAppCheck } from 'firebase/app-check';
import {
  getAI,
  getGenerativeModel,
  GoogleAIBackend,
  InferenceMode,
  InferenceSource,
  type GenerativeModel,
  type AI,
} from 'firebase/ai';
import { appCheckMode, DEFAULT_CLOUD_MODEL, type AppConfig } from './config';
import { LOOKUP_SYSTEM } from './prompts';
import { LOOKUP_SCHEMA } from './schema';
import type { InferenceAdapter, InferenceRequest, InferenceResult, OnDeviceStatus, RouteMode } from './types';

/** The Prompt API global. Declared here so we do not depend on a DOM lib version that may lack it. */
interface LanguageModelStatic {
  availability(options?: unknown): Promise<'unavailable' | 'downloadable' | 'downloading' | 'available'>;
}
declare const LanguageModel: LanguageModelStatic | undefined;

const ON_DEVICE_IO = {
  expectedInputs: [{ type: 'text' as const, languages: ['en'] }],
  expectedOutputs: [{ type: 'text' as const, languages: ['en'] }],
};

const MODE_MAP: Record<RouteMode, (typeof InferenceMode)[keyof typeof InferenceMode]> = {
  'prefer-on-device': InferenceMode.PREFER_ON_DEVICE,
  'only-in-cloud': InferenceMode.ONLY_IN_CLOUD,
};

/** One Firebase app per page. App Check uses reCAPTCHA v3 on a hosted page, the debug provider elsewhere (see README). */
export function initFirebase(config: AppConfig): FirebaseApp {
  const app = initializeApp(config.firebase);
  initializeAppCheck(app, { provider: appCheckProvider(config), isTokenAutoRefreshEnabled: true });
  return app;
}

function appCheckProvider(config: AppConfig): ReCaptchaV3Provider | CustomProvider {
  if (appCheckMode(config) === 'recaptcha-v3' && config.recaptchaSiteKey) return new ReCaptchaV3Provider(config.recaptchaSiteKey);
  // Debug mode: the SDK prints a token to the console, or uses the one you set. Register it in the Firebase console.
  (globalThis as { FIREBASE_APPCHECK_DEBUG_TOKEN?: boolean | string }).FIREBASE_APPCHECK_DEBUG_TOKEN =
    config.appCheckDebugToken ?? true;
  // reCAPTCHA cannot run inside a Manifest V3 extension, and debug mode never asks this provider for a token.
  return new CustomProvider({
    getToken: async () => {
      throw new Error('No production App Check provider is configured. Use the debug token during development.');
    },
  });
}

/** The production adapter: Firebase AI Logic hybrid inference. */
export class FirebaseAdapter implements InferenceAdapter {
  private readonly ai: AI;
  private readonly models = new Map<string, GenerativeModel>();

  constructor(private readonly config: AppConfig, app: FirebaseApp = initFirebase(config)) {
    this.ai = getAI(app, { backend: new GoogleAIBackend() });
  }

  async onDeviceStatus(): Promise<OnDeviceStatus> {
    if (typeof LanguageModel === 'undefined') return 'missing';
    try {
      const a = await LanguageModel.availability(ON_DEVICE_IO);
      if (a === 'available') return 'ready';
      return a === 'unavailable' ? 'missing' : 'not-ready';
    } catch {
      return 'missing';
    }
  }

  async prepareOnDevice(onProgress: (fraction: number) => void): Promise<void> {
    const req: InferenceRequest = { task: 'lookup', mode: 'prefer-on-device', system: LOOKUP_SYSTEM, prompt: '', schema: LOOKUP_SCHEMA };
    await this.model(req.mode, req.task, req).initializeDeviceModel(onProgress);
  }

  async generate(req: InferenceRequest): Promise<InferenceResult> {
    const model = this.model(req.mode, req.task, req);
    const result = await model.generateContent(req.prompt);
    const source = result.response.inferenceSource === InferenceSource.ON_DEVICE ? 'on-device' : 'cloud';
    return { text: result.response.text(), source };
  }

  /** A model's mode and schema are fixed for its life, so keep one per (mode, task). */
  private model(mode: RouteMode, task: string, req: InferenceRequest): GenerativeModel {
    const key = `${mode}:${task}`;
    const cached = this.models.get(key);
    if (cached) return cached;
    // The helpers' plain-schema form is accepted by both the on-device constraint and the cloud response schema.
    const schema = req.schema as never;
    const model = getGenerativeModel(this.ai, {
      mode: MODE_MAP[mode],
      onDeviceParams: {
        createOptions: {
          ...ON_DEVICE_IO,
          initialPrompts: [{ role: 'system', content: [{ type: 'text', value: req.system }] }],
        },
        promptOptions: { responseConstraint: schema },
      },
      inCloudParams: {
        model: this.config.cloudModel ?? DEFAULT_CLOUD_MODEL,
        systemInstruction: req.system,
        generationConfig: { responseMimeType: 'application/json', responseSchema: schema },
      },
    });
    this.models.set(key, model);
    return model;
  }
}
