import { lookupPrompt, LOOKUP_SYSTEM, walkthroughPrompt, WALKTHROUGH_SYSTEM } from './prompts';
import { chooseRoute, ON_DEVICE_FAILED_ROUTE, reasonFor } from './router';
import { LOOKUP_SCHEMA, parseLookup, parseWalkthrough, WALKTHROUGH_SCHEMA, type ParseResult } from './schema';
import type { InferenceAdapter, OnDeviceStatus, InferenceResult, JsonSchema, Lookup, Outcome, Route, Task, Via, Walkthrough } from './types';

/** Thrown by an adapter when the Firebase config file was never added. */
export class ConfigMissingError extends Error {
  constructor() {
    super('Firebase config is missing');
    this.name = 'ConfigMissingError';
  }
}

interface Attempt {
  result: InferenceResult;
  via: Via;
}

type AttemptFailure = { failed: 'no-config' | 'unavailable' };

export class MarginService {
  private cache = new Map<string, Outcome<Lookup>>();

  constructor(private readonly adapter: InferenceAdapter) {}

  async explainTerm(input: { term: string; sentence: string; pageText: string }): Promise<Outcome<Lookup>> {
    const key = `${input.term.toLowerCase()}\u0000${input.sentence}`;
    const hit = this.cache.get(key);
    if (hit) return hit;
    const prompt = lookupPrompt(input.term, input.sentence);
    const outcome = await this.run('lookup', prompt, LOOKUP_SYSTEM, LOOKUP_SCHEMA, (text) =>
      parseLookup(text, { term: input.term, pageText: input.pageText }),
    );
    // Only good answers are cached; a fallback should be retryable.
    if (outcome.ok) this.cache.set(key, outcome);
    return outcome;
  }

  async onDeviceStatus(): Promise<OnDeviceStatus> {
    try {
      return await this.adapter.onDeviceStatus();
    } catch {
      return 'missing';
    }
  }

  get canPrepareOnDevice(): boolean {
    return this.adapter.prepareOnDevice !== undefined;
  }

  async prepareOnDevice(onProgress: (fraction: number) => void): Promise<void> {
    await this.adapter.prepareOnDevice?.(onProgress);
  }

  async walkthrough(text: string): Promise<Outcome<Walkthrough>> {
    return this.run('walkthrough', walkthroughPrompt(text), WALKTHROUGH_SYSTEM, WALKTHROUGH_SCHEMA, parseWalkthrough);
  }

  private async run<T>(
    task: Task,
    prompt: string,
    system: string,
    schema: JsonSchema,
    parse: (text: string) => ParseResult<T>,
  ): Promise<Outcome<T>> {
    let onDevice;
    try {
      onDevice = await this.adapter.onDeviceStatus();
    } catch {
      onDevice = 'missing' as const;
    }
    const first = chooseRoute({ task, inputChars: prompt.length, onDevice });
    let attempt = await this.attempt(first, task, prompt, system, schema);

    if ('failed' in attempt && first.mode === 'prefer-on-device') {
      attempt = await this.attempt(ON_DEVICE_FAILED_ROUTE, task, prompt, system, schema);
    }
    if ('failed' in attempt) return this.unavailable(attempt.failed);

    const parsed = parse(attempt.result.text);
    if (!parsed.ok) {
      return {
        ok: false,
        fallback: {
          kind: 'rejected',
          message: "I couldn't get a trustworthy answer for that one, so I'm not showing a guess.",
          via: attempt.via,
        },
      };
    }
    return { ok: true, value: parsed.value, via: attempt.via };
  }

  private async attempt(route: Route, task: Task, prompt: string, system: string, schema: JsonSchema): Promise<Attempt | AttemptFailure> {
    try {
      const result = await this.adapter.generate({ task, mode: route.mode, system, prompt, schema });
      return {
        result,
        via: { source: result.source, reason: reasonFor(route, result.source), simulated: result.simulated === true },
      };
    } catch (err) {
      if (err instanceof ConfigMissingError || (err as Error)?.name === 'ConfigMissingError') return { failed: 'no-config' };
      return { failed: 'unavailable' };
    }
  }

  private unavailable(kind: 'no-config' | 'unavailable'): Outcome<never> {
    return {
      ok: false,
      fallback:
        kind === 'no-config'
          ? { kind: 'no-config', message: 'Setup needed: add your Firebase config file (the README shows how).' }
          : { kind: 'unavailable', message: "I couldn't reach a model just now. Check your connection and try again." },
    };
  }
}
