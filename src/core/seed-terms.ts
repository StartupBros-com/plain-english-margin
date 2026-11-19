/**
 * Curated terms used for DETECTION ONLY. They decide what gets highlighted.
 * The words you read in a hover card always come from the model, never from this list.
 */
export const SEED_TERMS: readonly string[] = [
  'api', 'endpoint', 'webhook', 'payload', 'schema', 'json', 'yaml', 'regex', 'cli', 'sdk',
  'repo', 'repository', 'branch', 'commit', 'merge', 'rebase', 'cherry-pick', 'force push', 'git',
  'pull request', 'diff', 'patch', 'stash', 'checkout', 'merge conflict', 'fast-forward', 'squash',
  'lockfile', 'dependency', 'dependencies', 'monorepo', 'package manager', 'bundler', 'transpile',
  'linter', 'lint', 'formatter', 'typecheck', 'type error', 'unit test', 'integration test',
  'regression', 'flaky', 'flaky test', 'fixture', 'mock', 'stub', 'snapshot', 'coverage',
  'refactor', 'hotfix', 'rollback', 'revert', 'migration', 'deploy', 'deployment', 'staging',
  'production', 'ci', 'cd', 'pipeline', 'workflow', 'runner', 'artifact', 'build', 'cache',
  'container', 'image', 'docker', 'kubernetes', 'pod', 'cluster', 'terraform', 'ssh', 'sudo',
  'env var', 'environment variable', 'secret', 'token', 'api key', 'oauth', 'jwt', 'cors',
  'dns', 'cdn', 'proxy', 'port', 'localhost', 'timeout', 'rate limit', 'retry', 'backoff',
  'latency', 'throughput', 'queue', 'cron', 'daemon', 'process', 'thread', 'async', 'promise',
  'callback', 'middleware', 'handler', 'hook', 'component', 'props', 'state', 'render',
  'sandbox', 'context window', 'prompt', 'tool call', 'subagent', 'agent', 'llm', 'embedding',
  'hallucination', 'token limit', 'stack trace', 'traceback', 'exception', 'null pointer',
  'race condition', 'deadlock', 'memory leak', 'idempotent', 'orm', 'sql', 'query', 'index',
  'foreign key', 'transaction', 'cache hit', 'cache miss', 'feature flag', 'canary', 'blue-green',
  'runbook', 'postmortem', 'incident', 'on-call', 'sla', 'slo', 'observability', 'telemetry',
  'log level', 'stdout', 'stderr', 'exit code', 'shell', 'terminal', 'script', 'binary',
  'dotfile', 'gitignore', 'readme', 'changelog', 'semver', 'breaking change', 'deprecated',
  'sudo', 'chmod', 'pipe', 'glob', 'wildcard', 'recursive', 'boilerplate', 'scaffold',
];

/** Short all-caps words that are not jargon. */
export const ACRONYM_IGNORE: ReadonlySet<string> = new Set([
  'OK', 'AM', 'PM', 'US', 'UK', 'EU', 'AI', 'ID', 'TV', 'NO', 'YES', 'IF', 'OR', 'AND', 'NOT',
  'THE', 'FOR', 'TODO', 'NOTE', 'FIXME', 'ASAP', 'FYI', 'PS', 'VS', 'MB', 'GB', 'KB',
]);
