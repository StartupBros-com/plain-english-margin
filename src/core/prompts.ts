const VOICE =
  'You explain technical words to a friendly, non-technical reader who now works with AI coding agents. ' +
  'Use short, everyday words. Never use the term you are explaining inside its own explanation. ' +
  'Never invent details that are not in the text you are given. Answer in English.';

export const LOOKUP_SYSTEM =
  `${VOICE} Reply with JSON only. "term" must repeat the term exactly as given. ` +
  '"plain" is ONE sentence that fits the sentence the term appears in. ' +
  '"why" is optional: one short line on why it matters in this spot.';

export const WALKTHROUGH_SYSTEM =
  `${VOICE} You are given part of a conversation with an AI coding agent. Reply with JSON only: ` +
  'a "summary" of what happened, and "steps" in the order they happened, each with a short "title" and a plain "detail". ' +
  'Use at most 8 steps.';

export function lookupPrompt(term: string, sentence: string): string {
  return `Term: ${term}\nSentence it appears in: ${sentence}`;
}

export function walkthroughPrompt(text: string): string {
  return `Walk me through what just happened in this conversation:\n\n${text}`;
}
