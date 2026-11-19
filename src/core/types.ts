/** Shared types. Nothing in `src/core` imports the Firebase SDK except `firebase-adapter.ts`. */

export type Task = 'lookup' | 'walkthrough';

/** Where the app asks for the answer to be produced. */
export type RouteMode = 'prefer-on-device' | 'only-in-cloud';

/** Where an answer actually came from. */
export type Source = 'on-device' | 'cloud';

export type RouteReason =
  | 'short-lookup'
  | 'short-thread'
  | 'long-input'
  | 'no-on-device-model'
  | 'on-device-failed'
  | 'on-device-not-ready';

/** Can this browser answer on-device right now? */
export type OnDeviceStatus = 'ready' | 'not-ready' | 'missing';

export interface Route {
  mode: RouteMode;
  reason: RouteReason;
}

/** Minimal JSON schema, used for both the on-device constraint and the cloud response schema. */
export interface JsonSchema {
  type: 'object' | 'array' | 'string';
  properties?: Record<string, JsonSchema>;
  items?: JsonSchema;
  required?: string[];
  nullable?: boolean;
  description?: string;
}

export interface InferenceRequest {
  task: Task;
  mode: RouteMode;
  system: string;
  prompt: string;
  schema: JsonSchema;
}

export interface InferenceResult {
  text: string;
  source: Source;
  /** True only for the test/demo fake. Real adapters never set it. */
  simulated?: boolean;
}

/** Everything the app needs from a model. Production uses Firebase AI Logic; tests inject a fake. */
export interface InferenceAdapter {
  onDeviceStatus(): Promise<OnDeviceStatus>;
  generate(req: InferenceRequest): Promise<InferenceResult>;
  /** Start the on-device model download. Must run inside a user gesture. */
  prepareOnDevice?(onProgress: (fraction: number) => void): Promise<void>;
}

export interface Via {
  source: Source;
  reason: RouteReason;
  simulated: boolean;
}

export interface Lookup {
  term: string;
  plain: string;
  why?: string;
}

export interface WalkStep {
  title: string;
  detail: string;
}

export interface Walkthrough {
  summary: string;
  steps: WalkStep[];
}

export type FallbackKind = 'rejected' | 'unavailable' | 'no-config';

export interface Fallback {
  kind: FallbackKind;
  message: string;
  /** Present when a model answered but the answer was thrown away. */
  via?: Via;
}

export type Outcome<T> = { ok: true; value: T; via: Via } | { ok: false; fallback: Fallback };
