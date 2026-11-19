import type { KeyValueStore, KnownTerms, Settings } from './known-terms';
import { loadSettings, saveSettings } from './known-terms';
import { mergeTerms, sanitizeTermsForSync, type TermSync } from './sync';

export type SyncStatus = 'off' | 'unavailable' | 'syncing' | 'on' | 'error';

/** Ties the known-terms list to an optional remote copy. Off until the reader turns it on. */
export class SyncController {
  private settings: Settings = { syncEnabled: false };
  private remote: TermSync | undefined;
  private state: SyncStatus = 'off';
  private unsubscribe: (() => void) | undefined;

  constructor(
    private readonly known: KnownTerms,
    private readonly store: KeyValueStore,
    /** Returns undefined when Firebase is not configured. Only called after the reader turns sync on. */
    private readonly factory: (() => Promise<TermSync> | undefined) | undefined,
    private readonly onChange: () => void = () => {},
  ) {}

  get status(): SyncStatus {
    return this.state;
  }

  get enabled(): boolean {
    return this.settings.syncEnabled;
  }

  get available(): boolean {
    return this.factory !== undefined;
  }

  async init(): Promise<void> {
    this.settings = await loadSettings(this.store);
    if (this.settings.syncEnabled) await this.start();
    else this.setState('off');
  }

  async setEnabled(on: boolean): Promise<void> {
    this.settings = { syncEnabled: on };
    await saveSettings(this.store, this.settings);
    if (on) await this.start();
    else {
      this.unsubscribe?.();
      this.unsubscribe = undefined;
      this.setState('off');
    }
  }

  private async start(): Promise<void> {
    const made = this.factory?.();
    if (!made) {
      this.setState('unavailable');
      return;
    }
    this.setState('syncing');
    try {
      this.remote = await made;
      const merged = mergeTerms(this.known.list(), await this.remote.pull());
      await this.known.replace(merged);
      await this.remote.push(merged);
      this.unsubscribe?.();
      this.unsubscribe = this.known.subscribe(() => void this.push());
      this.setState('on');
    } catch {
      this.setState('error');
    }
  }

  private async push(): Promise<void> {
    if (!this.remote || !this.settings.syncEnabled) return;
    try {
      await this.remote.push(sanitizeTermsForSync(this.known.list()));
    } catch {
      this.setState('error');
    }
  }

  private setState(s: SyncStatus): void {
    this.state = s;
    this.onChange();
  }
}
