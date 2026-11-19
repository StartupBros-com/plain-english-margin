import { countTerms, detectTerms, sentenceAround } from '../core/detect';
import type { KnownTerms } from '../core/known-terms';
import { reasonText, sourceLabel } from '../core/router';
import type { MarginService } from '../core/service';
import type { SyncController } from '../core/sync-controller';
import type { Lookup, OnDeviceStatus, Outcome, Via, Walkthrough } from '../core/types';
import { h } from './dom';
import { PAGE_CSS, SHADOW_CSS } from './styles';

export interface MarginOptions {
  /** The element whose text gets highlighted. */
  root: HTMLElement;
  service: MarginService;
  known: KnownTerms;
  sync?: SyncController;
  /** Text handed to "What just happened?". Defaults to the root's text. */
  getWalkthroughText?: () => string;
  /** Put the launcher button and panel in this element's shadow host (defaults to document.body). */
  mountPoint?: HTMLElement;
}

type Tab = 'happened' | 'terms' | 'settings';

const SKIP = 'script,style,textarea,input,select,noscript,[data-pem-ignore],.pem-term,[contenteditable="true"]';
const BLOCK = 'p,li,pre,td,th,blockquote,h1,h2,h3,h4,h5,h6,div,section,article';
const OPEN_DELAY = 280;
const CLOSE_DELAY = 260;

export class Margin {
  private readonly host: HTMLElement;
  private readonly shadow: ShadowRoot;
  private readonly card: HTMLElement;
  private readonly panel: HTMLElement;
  private readonly fab: HTMLButtonElement;
  private panelBody!: HTMLElement;
  private tabButtons = new Map<Tab, HTMLButtonElement>();
  private tab: Tab = 'happened';
  private openTimer = 0;
  private closeTimer = 0;
  private current: { el: HTMLElement; token: number } | undefined;
  private token = 0;
  private walkToken = 0;
  private walkState: { outcome?: Outcome<Walkthrough>; loading: boolean } = { loading: false };
  private onDevice: OnDeviceStatus | undefined;
  private progress: number | undefined;

  constructor(private readonly o: MarginOptions) {
    this.host = h('div', { 'data-pem-ignore': true, id: 'pem-host' });
    this.shadow = this.host.attachShadow({ mode: 'open' });
    this.shadow.append(h('style', {}, SHADOW_CSS));
    const wrap = h('div', { class: 'wrap' });
    this.card = h('div', { class: 'card', role: 'dialog', 'aria-label': 'Plain-English explanation', hidden: true });
    this.fab = h('button', { class: 'fab', type: 'button' }, 'What just happened?');
    this.panel = h('aside', { class: 'panel', 'aria-label': 'Plain-English Margin', hidden: true });
    wrap.append(this.card, this.fab, this.panel);
    this.shadow.append(wrap);
    this.buildPanel();
  }

  start(): void {
    if (!document.getElementById('pem-page-style')) {
      document.head.append(h('style', { id: 'pem-page-style' }, PAGE_CSS));
    }
    (this.o.mountPoint ?? document.body).append(this.host);
    this.scan();
    const root = this.o.root;
    root.addEventListener('mouseover', this.onOver);
    root.addEventListener('mouseout', this.onOut);
    root.addEventListener('click', this.onClick);
    root.addEventListener('keydown', this.onKey);
    root.addEventListener('mouseup', this.onSelect);
    this.card.addEventListener('mouseenter', () => clearTimeout(this.closeTimer));
    this.card.addEventListener('mouseleave', () => this.scheduleClose());
    this.card.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.closeCard(true);
    });
    this.fab.addEventListener('click', () => void this.openPanel('happened', true));
    this.panel.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.closePanel();
    });
    this.o.known.subscribe(() => {
      this.scan();
      this.renderPanel();
    });
    void this.refreshOnDevice();
  }

  stop(): void {
    const root = this.o.root;
    root.removeEventListener('mouseover', this.onOver);
    root.removeEventListener('mouseout', this.onOut);
    root.removeEventListener('click', this.onClick);
    root.removeEventListener('keydown', this.onKey);
    root.removeEventListener('mouseup', this.onSelect);
    this.unwrap();
    this.host.remove();
  }

  /** Re-run detection after the page text changed. */
  scan(): void {
    this.unwrap();
    const walker = document.createTreeWalker(this.o.root, NodeFilter.SHOW_TEXT, {
      acceptNode: (n) => (n.parentElement?.closest(SKIP) ? NodeFilter.FILTER_REJECT : n.nodeValue?.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP),
    });
    const nodes: Text[] = [];
    for (let n = walker.nextNode(); n; n = walker.nextNode()) nodes.push(n as Text);
    for (const node of nodes) {
      const hits = detectTerms(node.data, this.o.known);
      if (hits.length === 0) continue;
      const frag = document.createDocumentFragment();
      let at = 0;
      for (const hit of hits) {
        if (hit.start > at) frag.append(node.data.slice(at, hit.start));
        frag.append(h('span', { class: 'pem-term', tabindex: '0', role: 'button', 'data-pem-term': hit.term, 'aria-label': `Explain ${hit.text}` }, hit.text));
        at = hit.end;
      }
      if (at < node.data.length) frag.append(node.data.slice(at));
      node.replaceWith(frag);
    }
    this.renderPanel();
  }

  private unwrap(): void {
    for (const el of this.o.root.querySelectorAll('span.pem-term')) {
      el.replaceWith(document.createTextNode(el.textContent ?? ''));
    }
    this.o.root.normalize();
  }

  // ---- Hover card ------------------------------------------------------------------------

  private termFrom(target: EventTarget | null): HTMLElement | null {
    return target instanceof Element ? (target.closest('span.pem-term') as HTMLElement | null) : null;
  }

  private onOver = (e: Event): void => {
    const el = this.termFrom(e.target);
    if (!el) return;
    clearTimeout(this.closeTimer);
    clearTimeout(this.openTimer);
    if (this.current?.el === el) return;
    this.openTimer = window.setTimeout(() => void this.openCard(el), OPEN_DELAY);
  };

  private onOut = (e: Event): void => {
    if (!this.termFrom(e.target)) return;
    clearTimeout(this.openTimer);
    this.scheduleClose();
  };

  private onClick = (e: Event): void => {
    const el = this.termFrom(e.target);
    if (el) {
      clearTimeout(this.openTimer);
      void this.openCard(el);
    }
  };

  private onKey = (e: KeyboardEvent): void => {
    const el = this.termFrom(e.target);
    if (!el) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      void this.openCard(el);
    } else if (e.key === 'Escape') {
      this.closeCard(true);
    } else if (e.key === 'Tab' && !e.shiftKey && !this.card.hidden && this.current?.el === el) {
      const first = this.card.querySelector<HTMLElement>('button');
      if (first) {
        e.preventDefault();
        first.focus();
      }
    }
  };

  private onSelect = (): void => {
    const sel = window.getSelection();
    const text = sel?.toString().trim() ?? '';
    if (!sel || sel.isCollapsed || text.length < 2 || text.length > 60 || text.includes('\n')) return;
    const range = sel.getRangeAt(0);
    if (!this.o.root.contains(range.commonAncestorContainer)) return;
    const rect = range.getBoundingClientRect();
    const block = (range.commonAncestorContainer.parentElement ?? this.o.root).closest(BLOCK) ?? this.o.root;
    const before = document.createRange();
    before.selectNodeContents(block);
    before.setEnd(range.startContainer, range.startOffset);
    const start = before.toString().length;
    const sentence = sentenceAround(block.textContent ?? '', start, start + text.length);
    void this.showCard({ term: text, sentence, rect, anchor: undefined });
  };

  private async openCard(el: HTMLElement): Promise<void> {
    const text = el.textContent ?? '';
    const block = el.closest(BLOCK) ?? this.o.root;
    const before = document.createRange();
    before.selectNodeContents(block);
    before.setEnd(el, 0);
    const start = before.toString().length;
    const sentence = sentenceAround(block.textContent ?? '', start, start + text.length);
    await this.showCard({ term: text, sentence, rect: el.getBoundingClientRect(), anchor: el });
  }

  private async showCard(a: { term: string; sentence: string; rect: DOMRect; anchor: HTMLElement | undefined }): Promise<void> {
    clearTimeout(this.closeTimer);
    this.current?.el.removeAttribute('data-open');
    const token = ++this.token;
    if (a.anchor) {
      a.anchor.setAttribute('data-open', '');
      this.current = { el: a.anchor, token };
    } else this.current = undefined;
    this.card.hidden = false;
    this.card.setAttribute('aria-label', `Explanation of ${a.term}`);
    this.card.replaceChildren(h('h2', {}, a.term), h('div', { class: 'skel', 'aria-label': 'Looking that up' }, h('i'), h('i')));
    this.place(a.rect);
    const outcome = await this.o.service.explainTerm({ term: a.term, sentence: a.sentence, pageText: this.o.root.textContent ?? '' });
    if (token !== this.token) return;
    this.renderCard(a.term, outcome, () => void this.showCard(a));
    this.place(a.rect);
  }

  private renderCard(term: string, outcome: Outcome<Lookup>, retry: () => void): void {
    const kids: Node[] = [h('h2', {}, term)];
    if (outcome.ok) {
      kids.push(h('p', { class: 'plain' }, outcome.value.plain));
      if (outcome.value.why) kids.push(h('p', { class: 'why' }, h('b', {}, 'Why it matters here'), outcome.value.why));
      const know = h('button', { class: 'btn primary', type: 'button' }, 'I know this');
      know.addEventListener('click', () => {
        void this.o.known.add(term);
        this.closeCard(false);
      });
      const close = h('button', { class: 'btn quiet', type: 'button' }, 'Close');
      close.addEventListener('click', () => this.closeCard(true));
      kids.push(h('div', { class: 'actions' }, know, close), this.modelLine(outcome.via));
    } else {
      const again = h('button', { class: 'btn', type: 'button' }, 'Try again');
      again.addEventListener('click', retry);
      const close = h('button', { class: 'btn quiet', type: 'button' }, 'Close');
      close.addEventListener('click', () => this.closeCard(true));
      kids.push(h('p', { class: 'note' }, outcome.fallback.message), h('div', { class: 'actions' }, again, close));
      if (outcome.fallback.via) kids.push(this.modelLine(outcome.fallback.via));
    }
    this.card.replaceChildren(...kids);
  }

  /** The always-visible "which model, and why" line. */
  private modelLine(via: Via): HTMLElement {
    return h(
      'div',
      { class: 'model', 'data-source': via.source },
      h('span', { class: via.source === 'cloud' ? 'chip cloud' : 'chip' }, sourceLabel(via.source, false)),
      h('span', { class: 'why-line' }, reasonText(via.reason)),
      via.simulated ? h('span', { class: 'sim' }, 'Sample answer for the demo: no model ran.') : null,
    );
  }

  private place(rect: DOMRect): void {
    const margin = 12;
    const w = this.card.offsetWidth || 344;
    const hgt = this.card.offsetHeight || 160;
    let left = Math.min(Math.max(margin, rect.left + rect.width / 2 - w / 2), window.innerWidth - w - margin);
    left = Math.max(margin, left);
    const below = rect.bottom + 10;
    const top = below + hgt > window.innerHeight - margin && rect.top - hgt - 10 > margin ? rect.top - hgt - 10 : below;
    this.card.style.left = `${left}px`;
    this.card.style.top = `${Math.max(margin, top)}px`;
  }

  private scheduleClose(): void {
    clearTimeout(this.closeTimer);
    this.closeTimer = window.setTimeout(() => this.closeCard(false), CLOSE_DELAY);
  }

  private closeCard(refocus: boolean): void {
    clearTimeout(this.openTimer);
    this.token++;
    const el = this.current?.el;
    el?.removeAttribute('data-open');
    this.card.hidden = true;
    this.current = undefined;
    if (refocus && el?.isConnected) el.focus();
  }

  // ---- Side panel --------------------------------------------------------------------------

  private buildPanel(): void {
    const close = h('button', { class: 'btn quiet small', type: 'button', 'aria-label': 'Close panel' }, 'Close');
    close.addEventListener('click', () => this.closePanel());
    const tabs = h('div', { class: 'tabs', role: 'tablist' });
    const defs: [Tab, string][] = [
      ['happened', 'Walkthrough'],
      ['terms', 'Terms I know'],
      ['settings', 'Settings'],
    ];
    for (const [id, label] of defs) {
      const b = h('button', { class: 'tab', type: 'button', role: 'tab', 'aria-selected': 'false' }, label);
      b.addEventListener('click', () => void this.openPanel(id, false));
      this.tabButtons.set(id, b);
      tabs.append(b);
    }
    this.panelBody = h('div', { class: 'body', role: 'tabpanel', 'aria-live': 'polite' });
    this.panel.append(h('header', {}, h('h2', {}, 'Plain-English Margin'), close), tabs, this.panelBody);
  }

  async openPanel(tab: Tab, run: boolean): Promise<void> {
    this.tab = tab;
    this.panel.hidden = false;
    this.renderPanel();
    if (tab === 'happened' && run) await this.runWalkthrough();
  }

  private closePanel(): void {
    this.panel.hidden = true;
    this.fab.focus();
  }

  async runWalkthrough(): Promise<void> {
    const token = ++this.walkToken;
    this.walkState = { loading: true };
    this.renderPanel();
    const text = (this.o.getWalkthroughText?.() ?? this.o.root.textContent ?? '').trim();
    const outcome = await this.o.service.walkthrough(text);
    if (token !== this.walkToken) return;
    this.walkState = { loading: false, outcome };
    this.renderPanel();
  }

  private async refreshOnDevice(): Promise<void> {
    this.onDevice = await this.o.service.onDeviceStatus();
    this.renderPanel();
  }

  /** Re-draw the panel, for example after the sync status changed. */
  refresh(): void {
    this.renderPanel();
  }

  private renderPanel(): void {
    for (const [id, b] of this.tabButtons) b.setAttribute('aria-selected', String(id === this.tab));
    if (this.panel.hidden) return;
    const body =
      this.tab === 'happened' ? this.renderHappened() : this.tab === 'terms' ? this.renderTerms() : this.renderSettings();
    this.panelBody.replaceChildren(...body);
  }

  private renderHappened(): Node[] {
    const { loading, outcome } = this.walkState;
    if (loading) return [h('h3', {}, 'Reading the thread…'), h('div', { class: 'skel' }, h('i'), h('i'), h('i'))];
    if (!outcome) {
      const go = h('button', { class: 'btn primary', type: 'button' }, 'What just happened?');
      go.addEventListener('click', () => void this.runWalkthrough());
      return [h('p', { class: 'empty' }, 'Press the button and I will walk through this thread one plain step at a time.'), h('div', { class: 'actions' }, go)];
    }
    if (!outcome.ok) {
      const again = h('button', { class: 'btn', type: 'button' }, 'Try again');
      again.addEventListener('click', () => void this.runWalkthrough());
      return [h('p', { class: 'note' }, outcome.fallback.message), h('div', { class: 'actions' }, again), ...(outcome.fallback.via ? [this.modelLine(outcome.fallback.via)] : [])];
    }
    const { summary, steps } = outcome.value;
    return [
      h('h3', {}, 'In short'),
      h('p', { class: 'summary' }, summary),
      this.modelLine(outcome.via),
      h('ol', { class: 'steps' }, ...steps.map((s) => h('li', {}, h('h3', {}, s.title), h('p', {}, s.detail)))),
    ];
  }

  private renderTerms(): Node[] {
    const list = this.o.known.list();
    const { shown, hidden } = countTerms(this.o.root.textContent ?? '', this.o.known);
    const head = h(
      'p',
      { class: 'count' },
      h('strong', {}, String(shown)),
      ` underlined on this page · `,
      h('strong', {}, String(hidden)),
      hidden === 1 ? ` hidden because you know it` : ` hidden because you know them`,
    );
    if (list.length === 0) {
      return [head, h('p', { class: 'empty', style: 'margin-top:12px' }, 'Nothing here yet. When you press “I know this” on a card, the word lands here and stops being highlighted.')];
    }
    const chips = h('ul', { class: 'chips' });
    for (const t of list) {
      const x = h('button', { type: 'button', 'aria-label': `Explain ${t} again` }, '×');
      x.addEventListener('click', () => void this.o.known.remove(t));
      chips.append(h('li', { class: 'known' }, t, x));
    }
    return [head, chips];
  }

  private renderSettings(): Node[] {
    const out: Node[] = [];
    const sync = this.o.sync;
    if (sync) {
      const box = h('input', { type: 'checkbox', id: 'pem-sync' }) as HTMLInputElement;
      box.checked = sync.enabled;
      box.disabled = !sync.available;
      box.addEventListener('change', () => void sync.setEnabled(box.checked).then(() => this.renderPanel()));
      const status =
        !sync.available
          ? 'Needs a Firebase config file (see the README).'
          : sync.status === 'on' ? 'Syncing term names.' : sync.status === 'syncing' ? 'Connecting…' : sync.status === 'error' ? 'Could not sync. Your list is safe on this device.' : 'Off. Your list stays on this device.';
      out.push(
        h('div', { class: 'setting' }, box, h('label', { for: 'pem-sync' }, h('span', {}, 'Sync my known terms'), h('small', {}, 'Shares only the words you marked “I know this”, never the text you read. Off by default. '), h('small', {}, status))),
      );
    }
    const label = this.onDevice === 'ready' ? 'Ready on this browser.' : this.onDevice === 'not-ready' ? 'Not downloaded yet.' : this.onDevice === 'missing' ? 'Not available in this browser. Everything will use the cloud.' : 'Checking…';
    const model = h('div', { class: 'setting' }, h('div', { style: 'display:grid;gap:3px;width:100%' }, h('span', {}, 'On-device model (Gemini Nano)'), h('small', { style: 'color:var(--muted);font-size:13.5px' }, label)));
    if (this.o.service.canPrepareOnDevice && this.onDevice === 'not-ready') {
      const get = h('button', { class: 'btn small', type: 'button' }, 'Get the on-device model');
      get.addEventListener('click', () => {
        this.progress = 0;
        this.renderPanel();
        void this.o.service
          .prepareOnDevice((f) => {
            this.progress = f;
            this.renderPanel();
          })
          .finally(() => {
            this.progress = undefined;
            void this.refreshOnDevice();
          });
      });
      model.firstElementChild?.append(get);
    }
    if (this.progress !== undefined) model.firstElementChild?.append(h('div', { class: 'progress' }, h('i', { style: `width:${Math.round(this.progress * 100)}%` })));
    out.push(model);
    return out;
  }
}
