import type { InferenceAdapter, InferenceRequest, InferenceResult, OnDeviceStatus } from './types';

/**
 * A stand-in model for tests, screenshots and the offline demo.
 * It never runs a model. Everything it returns is flagged `simulated`, and the UI says so.
 */
const SAMPLES: Record<string, { plain: string; why?: string }> = {
  'css variables': { plain: 'CSS variables are named colors and sizes the page can swap in one go.', why: 'That is how one switch can repaint the whole app.' },
  themeprovider: { plain: 'ThemeProvider is the piece of the app that decides which set of colors is in use.', why: 'The new switch has to talk to it.' },
  localstorage: { plain: 'localStorage is a small notebook your browser keeps for a site, so it can remember things between visits.', why: 'It is how the app remembers dark or light.' },
  'src/styles/tokens.css': { plain: 'This is the file that holds the app’s colors.' },
  refactor: { plain: 'A refactor means tidying how the code is arranged without changing what the app does.', why: 'The agent is reshaping one piece so a switch can control it.' },
  'make test': { plain: 'This command runs the project’s automatic checks.' },
  'stack trace': { plain: 'A stack trace is the list of steps the program was on when it went wrong.', why: 'It points to the exact line to look at.' },
  readsavedtheme: { plain: 'readSavedTheme is the name of the step that loads your saved choice.' },
  'race condition': { plain: 'A race condition is when two things finish in an unlucky order and the result comes out wrong.', why: 'It explains why the test failed only sometimes.' },
  linter: { plain: 'A linter is a tool that reads code and points out sloppy spots, a bit like a spell checker.' },
  typecheck: { plain: 'A typecheck confirms that every piece of data is used the way it was meant to be.' },
  'git rebase': { plain: 'A rebase moves your changes so they sit on top of the newest version of the shared code.' },
  rebase: { plain: 'A rebase moves your changes so they sit on top of the newest version of the shared code.' },
  'merge conflict': { plain: 'A merge conflict is when two people changed the same lines and the computer needs a person to pick.', why: 'The agent had to settle it before moving on.' },
  lockfile: { plain: 'A lockfile is a list of the exact versions of the outside code the app uses.', why: 'Regenerating it can quietly change those versions.' },
  dependency: { plain: 'A dependency is outside code that this app relies on.' },
  dark_mode_enabled: { plain: 'This is an on/off setting that keeps the new dark mode hidden until you are ready.' },
  'feature flag': { plain: 'A feature flag is an on/off switch that lets a team ship a feature turned off.' },
  migration: { plain: 'A migration is a planned change to how the app’s stored data is laid out.', why: 'The note says none is needed, which lowers the risk.' },
  ci: { plain: 'CI is a robot that runs the checks automatically each time someone shares a change.', why: '“Green” means every check passed.' },
  staging: { plain: 'Staging is a practice copy of the app where changes are tried before real users see them.' },
  rollback: { plain: 'A rollback is undoing a change to go back to how things were.' },
  'pull request': { plain: 'A pull request is a message that asks teammates to review and accept a set of changes.' },
  cache: { plain: 'A cache is a saved copy kept nearby so things load faster.', why: 'An old saved copy is a common reason a change seems missing.' },
  theme_default: { plain: 'THEME_DEFAULT is a setting, set outside the code, that says which look to start with.' },
  'env var': { plain: 'An env var is a setting stored outside the code, so it can differ from place to place.' },
  stderr: { plain: 'stderr is the channel a program uses to print its error messages.' },
  incident: { plain: 'An incident is a problem that affects real users and gets handled with some urgency.' },
  'on-call': { plain: 'On-call means the person who is on duty to respond if something breaks.' },
  'exit code': { plain: 'An exit code is a number a program gives back to say whether it worked; zero means it did.', why: 'Anything other than zero here means something failed.' },
  '--verbose': { plain: 'This option asks the command to print more detail about what it is doing.' },
  'make test --verbose': { plain: 'This runs the checks and prints extra detail as it goes.' },
};

export interface FakeAdapterOptions {
  onDevice?: OnDeviceStatus;
  /** Make the on-device attempt throw, to exercise the escalation path. */
  failOnDevice?: boolean;
  /** Make every call throw. */
  failAll?: boolean;
  /** Replace the next response text, for example with a malformed answer. */
  respondWith?: (req: InferenceRequest) => string | undefined;
  delayMs?: number;
}

export class FakeAdapter implements InferenceAdapter {
  readonly calls: InferenceRequest[] = [];
  constructor(private readonly opts: FakeAdapterOptions = {}) {}

  async onDeviceStatus(): Promise<OnDeviceStatus> {
    return this.opts.onDevice ?? 'ready';
  }

  async prepareOnDevice(onProgress: (fraction: number) => void): Promise<void> {
    onProgress(1);
  }

  async generate(req: InferenceRequest): Promise<InferenceResult> {
    this.calls.push(req);
    if (this.opts.delayMs) await new Promise((r) => setTimeout(r, this.opts.delayMs));
    if (this.opts.failAll) throw new Error('fake: everything failed');
    if (req.mode === 'prefer-on-device' && this.opts.failOnDevice) throw new Error('fake: on-device failed');
    const text = this.opts.respondWith?.(req) ?? (req.task === 'lookup' ? sampleLookup(req.prompt) : sampleWalkthrough(req.prompt));
    const onDevice = req.mode === 'prefer-on-device' && (this.opts.onDevice ?? 'ready') === 'ready';
    return { text, source: onDevice ? 'on-device' : 'cloud', simulated: true };
  }
}

function sampleLookup(prompt: string): string {
  const term = /^Term: (.*)$/m.exec(prompt)?.[1] ?? '';
  const hit = SAMPLES[term.toLowerCase()];
  const out = hit
    ? { term, plain: hit.plain, ...(hit.why ? { why: hit.why } : {}) }
    : { term, plain: `“${term}” is a technical word. This sample answer is a stand-in, not a real explanation.` };
  return JSON.stringify(out);
}

function sampleWalkthrough(prompt: string): string {
  void prompt;
  return JSON.stringify({
    summary: 'You asked for a dark mode switch. The agent added it, fixed one failing check along the way, and wrote up how to undo it if needed.',
    steps: [
      { title: 'It read how colors work today', detail: 'The agent found the file with the app’s colors and the piece that picks which set to use.' },
      { title: 'It built the switch', detail: 'It made that piece switchable and added one small button, leaving the checkout part alone as you asked.' },
      { title: 'A check failed, and it fixed it', detail: 'Two steps ran in the wrong order, so your saved choice was read too early. The agent made the save finish first.' },
      { title: 'It cleaned up and caught up', detail: 'It tidied two unused lines, then pulled in the latest shared code. A clash in the list of outside code versions was settled by rebuilding that list.' },
      { title: 'It wrote the hand-off notes', detail: 'The new feature is hidden behind an off switch, and the notes say how to turn it off or undo it.' },
      { title: 'It left a troubleshooting guide', detail: 'If the switch misbehaves, the guide says to clear saved copies, check one setting, and call the person on duty.' },
    ],
  });
}
