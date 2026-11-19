/**
 * A made-up conversation with an AI coding agent, written for this project.
 * The app, the people and every file name in it are invented. Nothing here comes from a real session.
 */
export interface Turn {
  kind: 'you' | 'agent' | 'tool' | 'pr' | 'runbook';
  label: string;
  /** Paragraphs. `backticks` become inline code. */
  paragraphs?: string[];
  /** A block of terminal-style output. */
  code?: string;
}

export const DEMO_TITLE = 'Adding a dark mode switch to Recipe Box';

export const DEMO_TRANSCRIPT: Turn[] = [
  {
    kind: 'you',
    label: 'You',
    paragraphs: [
      'Can you add a dark mode switch to the Recipe Box app? Keep the change small, and please do not touch the checkout flow.',
    ],
  },
  {
    kind: 'agent',
    label: 'Your AI coding agent',
    paragraphs: [
      'Sure. I started by reading how the theme works today. The colors live in `src/styles/tokens.css` as CSS variables, and a single `ThemeProvider` component picks the active set. It reads the saved choice from `localStorage` when the page loads.',
      'My plan is a refactor of that provider so it can also be switched by a toggle, plus one new component for the switch itself. I will not change any other files.',
    ],
  },
  {
    kind: 'tool',
    label: 'Command output',
    code: '$ make test\nFAIL  tests/theme.test.ts > remembers the choice\nAssertionError: expected "light" to equal "dark"\n    at readSavedTheme (src/theme/storage.ts:14:9)\nExit code 1',
  },
  {
    kind: 'agent',
    label: 'Your AI coding agent',
    paragraphs: [
      'One test failed. The stack trace points at `readSavedTheme`: it ran before the toggle had finished saving, which is a race condition. I made the save finish first, and the test now passes.',
      'Next I ran the linter, which flagged two unused imports, and the typecheck, which was clean. Then I tried a git rebase onto the latest main branch and hit a merge conflict in the lockfile. I deleted the lockfile, regenerated it, and checked that no dependency versions moved.',
    ],
  },
  {
    kind: 'tool',
    label: 'Command output',
    code: '$ make lint\nsrc/theme/toggle.ts: 2 warnings (unused import)\n$ make typecheck\n0 errors\n$ make test\n42 passed, 0 failed\nExit code 0',
  },
  {
    kind: 'agent',
    label: 'Your AI coding agent',
    paragraphs: [
      'Everything is green now. One more thing I want you to know about: the test for the settings endpoint is flaky, meaning it fails now and then for reasons unrelated to this change. It passed three times in a row here, so I left it alone, but someone should look at it later.',
      'I also deployed the branch to staging and checked it by hand. The switch works, the saved choice survives a reload, and the checkout page looks exactly as before. I did not run a migration, because the toggle only stores one value in the browser.',
    ],
  },
  {
    kind: 'pr',
    label: 'Pull request description',
    paragraphs: [
      'Summary: adds a dark mode toggle behind the feature flag `dark_mode_enabled`, which is off by default. No database migration is needed.',
      'Testing: unit tests pass, the linter is clean, and CI is green. I checked the change on staging with the flag turned on.',
      'Rollback: revert the commit, or switch the flag off. Nothing else depends on it.',
    ],
  },
  {
    kind: 'runbook',
    label: 'Runbook note',
    paragraphs: [
      'If the toggle misbehaves in production, first clear the cache and reload. Then check the env var `THEME_DEFAULT` and look for errors on stderr in the server logs. If it is still wrong, turn the flag off and open an incident so the on-call person can look at it.',
      'Run `make test --verbose` and share the exit code if you need help.',
    ],
  },
];
