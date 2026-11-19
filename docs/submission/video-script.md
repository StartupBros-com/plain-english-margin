# Demo video (1:47, limit 3:00)

The submitted video is a screen recording of a real run, with narration written to what is on screen. It shows only the app and its code, and nothing about the entrant.

## How it was made

1. The web app was served with a hosted-style config: a real Firebase project, App Check through reCAPTCHA Enterprise, and no debug token.
2. `node scripts/record-demo.mjs http://localhost:5198/` drove headless Chromium through the scenes below and saved `dist/video/footage.webm`, the scene start times and the HTTP status of every Firebase call. The run made one App Check exchange and four model calls, and all five returned 200.
3. The narration lines in [`narration.json`](narration.json) were turned into speech with Piper (voice `en_US-ryan-high`, run locally), one WAV per line.
4. `node scripts/make-video.mjs <wav-dir>` placed each line at the start of its scene, failed if any line ran into the next scene, burned the same lines in as captions below the footage, and wrote `dist/video/plain-english-margin-demo.mp4`.

The recording browser had no on-device model (Chrome on Linux reports `LanguageModel.availability()` as "unavailable"). Every answer in the video came from Gemini in the cloud, and every badge on screen says so. The video makes no on-device claim. The Settings scene shows the on-device model as not available, and the closing card says the recording had no Gemini Nano.

## Scenes

Times are from the final cut.

| Time | On screen | Narration |
| --- | --- | --- |
| 0:00 | Title card | "AI coding agents write long transcripts, full of words like lockfile, rebase and race condition. If you are not an engineer, that is hard to follow." |
| 0:11 | The demo conversation, with the jargon underlined | "Plain-English Margin underlines the jargon as you read." |
| 0:20 | Hover "race condition": the card the model wrote for this sentence | "Hover a word, and you get one plain sentence, written for this sentence, and why it matters here." |
| 0:32 | Hover "lockfile": the badge "In the cloud · Gemini" and its reason | "The badge always says which model answered, and why. This browser has no on-device model, so Gemini in the cloud answered." |
| 0:40 | Press "I know this" on lockfile, then on rebase | "Press, I know this, and the word stops being underlined." |
| 0:54 | "What just happened?": summary and numbered steps, with the reason "This is a lot of text, so the cloud handled it." | "What just happened, turns the whole thread into a short summary and numbered steps. Long text goes straight to the cloud, and the panel says so." |
| 1:10 | The "Terms I know" tab | "The words you know are listed here, and you can undo any of them." |
| 1:16 | The Settings tab: sync off, on-device model not available | "Sync is off by default, and only ever shares that word list. Settings also show whether Gemini Nano is available in this browser." |
| 1:24 | Code card: the router in `src/core/router.ts` and the model setup in `src/core/firebase-adapter.ts` | "Under the hood, one Firebase AI Logic model handles both paths. A router picks prefer on device for short text, and cloud only for long text. The badge reads the SDK's own inference source, and App Check protects every call." |
| 1:39 | Closing card: repository link, licence, and "Recorded in a browser without Gemini Nano" | "Plain-English Margin. A Chrome extension and a web app, open source under Apache 2.0." |

## Not in this video

On-device inference. It needs desktop Chrome with Gemini Nano downloaded, which the recording machine does not have. If it is observed later, a short second clip can show the "On your device · Gemini Nano" badge, but only from a real run.
