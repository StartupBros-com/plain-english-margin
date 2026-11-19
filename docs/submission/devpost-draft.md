# Devpost draft: Plain-English Margin

Text for the Devpost form. It makes no claim about the entrant's background. Do not state that on-device inference works until it has been seen working in desktop Chrome with Gemini Nano.

## Tagline

Read what your AI coding agent wrote, in plain English.

## Inspiration

More people now work with AI coding agents without being engineers. The agent's transcripts, pull requests and runbooks are full of words like lockfile, rebase and race condition. Looking each one up in another tab breaks the reading. A margin note that explains the word where it sits does not.

## What it does

Plain-English Margin is a Chrome extension and a web app that share one core. It underlines likely jargon in the text you are reading. Point at a word and a small card gives one plain sentence that fits the sentence around it, and sometimes a short "why it matters here" line. Press "I know this" and the word stops being underlined. Press "What just happened?" and a long thread is walked through in plain steps. Every answer shows which model produced it, on-device Gemini Nano or cloud Gemini, and why it was routed there.

## How we built it with Firebase AI Logic

The app calls Gemini through the Firebase AI Logic hybrid web SDK (`firebase/ai`).

- **Short lookups:** `getGenerativeModel` in `PREFER_ON_DEVICE` mode, so the text around a word stays on the machine and each hover costs nothing.
- **Long walkthroughs, and browsers without the on-device model:** `ONLY_IN_CLOUD` mode, which calls cloud Gemini.
- **On-device failure:** the app retries once in the cloud and labels the answer that way.
- **Structured output:** one JSON schema, passed as `onDeviceParams.promptOptions.responseConstraint` for the on-device model and as `inCloudParams.generationConfig.responseSchema` for the cloud model.
- **Honest labels:** the badge reads `inferenceSource` from the SDK's own response rather than assuming where the answer came from.
- **App Check** protects every model call: reCAPTCHA Enterprise on the hosted web page, and the debug provider in the extension, because reCAPTCHA does not run in a Manifest V3 extension.
- **Optional sync:** Firebase Auth (anonymous) and Firestore can sync the list of known term names. It is a setting, off by default, and it never sends page text.

The model's reply is never trusted blindly. A parser rejects any reply that misses schema fields, answers a different word than the one asked, or names a word that is not in the page text. Those show as a plain "couldn't get a trustworthy answer" note.

## Challenges

- The Prompt API needs a document, not a service worker, so the extension keeps the Firebase client in an offscreen page and the page script talks to it.
- On-device models have small windows, so routing by input length, model availability and failure is a small tested function, not an afterthought.
- Keeping the explanations plain and short, written for a non-technical reader.

## What we are proud of

A single code path that is honest about where each answer came from, a reader-owned "known terms" list that makes the interface quieter the more you use it, and a parser that prefers showing nothing over showing a guess.

## What is next

Real-model evaluation of explanation quality, App Check for the extension without a debug token, more languages, and sites that stream text in as it is generated.

## Built with

TypeScript, Vite, Firebase AI Logic (`firebase/ai`), Firebase App Check, Firebase Auth, Cloud Firestore, Chrome Prompt API (Gemini Nano), Manifest V3.

## AI tools used to build it

Claude Code (Anthropic) wrote the code, the docs and the demo video's narration script, all during the Submission Period, starting 2026-11-18. The video's voice is synthetic: Piper TTS with the en_US-joe-medium voice, run locally.

## Links

- Repository: https://github.com/StartupBros-com/plain-english-margin
- Video: https://youtu.be/ugyyq-dxL5I
- Hosted demo: https://startupbros-com.github.io/plain-english-margin-demo/
- Extension: build it with your own Firebase config and load `dist/extension` unpacked; see the README
