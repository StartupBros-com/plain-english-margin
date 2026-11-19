/** The local "I know this" list. Stored locally; see `sync.ts` for the optional, off-by-default sync. */

export interface KeyValueStore {
  get(key: string): Promise<unknown>;
  set(key: string, value: unknown): Promise<void>;
}

export const KNOWN_KEY = 'pem.knownTerms';

export function normalizeTerm(raw: string): string {
  return raw.trim().replace(/^`+|`+$/g, '').replace(/\s+/g, ' ').toLowerCase();
}

export class KnownTerms {
  private terms = new Set<string>();
  private listeners = new Set<() => void>();

  constructor(private readonly store: KeyValueStore) {}

  async load(): Promise<void> {
    const raw = await this.store.get(KNOWN_KEY);
    this.terms = new Set(
      Array.isArray(raw) ? raw.filter((t): t is string => typeof t === 'string').map(normalizeTerm) : [],
    );
    this.emit();
  }

  has(term: string): boolean {
    return this.terms.has(normalizeTerm(term));
  }

  list(): string[] {
    return [...this.terms].sort();
  }

  get size(): number {
    return this.terms.size;
  }

  async add(term: string): Promise<void> {
    const t = normalizeTerm(term);
    if (!t || this.terms.has(t)) return;
    this.terms.add(t);
    await this.persist();
  }

  async remove(term: string): Promise<void> {
    if (!this.terms.delete(normalizeTerm(term))) return;
    await this.persist();
  }

  /** Replace the whole list (used by sync). */
  async replace(terms: string[]): Promise<void> {
    this.terms = new Set(terms.map(normalizeTerm).filter(Boolean));
    await this.persist();
  }

  subscribe(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private async persist(): Promise<void> {
    await this.store.set(KNOWN_KEY, this.list());
    this.emit();
  }

  private emit(): void {
    for (const fn of this.listeners) fn();
  }
}

export class MemoryStore implements KeyValueStore {
  private data = new Map<string, unknown>();
  async get(key: string): Promise<unknown> {
    return this.data.get(key);
  }
  async set(key: string, value: unknown): Promise<void> {
    this.data.set(key, value);
  }
}

export interface Settings {
  /** Off by default. When on, only term names (never page text) go to Firestore. */
  syncEnabled: boolean;
}

export const DEFAULT_SETTINGS: Settings = { syncEnabled: false };
export const SETTINGS_KEY = 'pem.settings';

export async function loadSettings(store: KeyValueStore): Promise<Settings> {
  const raw = await store.get(SETTINGS_KEY);
  if (raw && typeof raw === 'object' && typeof (raw as Settings).syncEnabled === 'boolean') {
    return { syncEnabled: (raw as Settings).syncEnabled };
  }
  return { ...DEFAULT_SETTINGS };
}

export async function saveSettings(store: KeyValueStore, s: Settings): Promise<void> {
  await store.set(SETTINGS_KEY, s);
}
