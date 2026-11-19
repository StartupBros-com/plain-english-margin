# Demo video script (target 2:40, hard limit 3:00)

Draft for the owner to record. It describes what the app does and shows nothing about the entrant. Record it only after the Firebase project, config file and App Check debug token are in place, and only claim what you actually see on screen. If Gemini Nano is not working on the recording machine, do not record the on-device beats; say so instead.

Before recording: desktop Chrome 139+, the flag on, the model downloaded (`await LanguageModel.availability()` says `available`), the extension loaded from `dist/extension`, DevTools open on the Network tab, and the demo conversation open in the web app. No third-party logos or brand names on screen: use a clean browser window, hide bookmarks and other extensions, and refer to "an AI coding agent".

| Time | On screen | Say |
| --- | --- | --- |
| 0:00-0:15 | The demo conversation, with the underlined words | "AI coding agents write long transcripts full of words like lockfile, rebase and race condition. If you are not an engineer, that is hard to follow. Plain-English Margin explains them as you read." |
| 0:15-0:50 | Hover "race condition". The card appears. Point at the Network panel: **no requests** while the card loads. Point at the badge: "On your device, Gemini Nano", and the line "Short lookups stay on your device." | "One plain sentence, written for this sentence. The lookup ran on this device with Gemini Nano through Firebase AI Logic. The Network panel is quiet, so the text on the page did not leave the machine. The badge always says which model answered and why." Show a second term quickly. |
| 0:50-1:15 | Turn on Chrome's offline mode in DevTools (Network > Offline). Hover another term. Card still answers. | "Offline, and it still works, because short lookups need no network." Only say this if it works on the recording machine. Turn the network back on. |
| 1:15-1:50 | Click "What just happened?". The panel opens and shows "Reading the thread...", then the summary and steps. Point at the badge: "In the cloud, Gemini", reason "This is a lot of text, so the cloud handled it." In Network, show the one request. | "A long thread is too much for the small on-device model, so the app routes it to cloud Gemini, and says so. Same Firebase AI Logic code, a different mode." |
| 1:50-2:20 | Hover a term, press **I know this**. The underline disappears. Open the "Terms I know" tab: the list grows and the "underlined on this page" count drops. Repeat for two more terms. | "When you know a word, say so. It stops being underlined, and the list stays on your device. Sync is an optional setting that is off by default, and it only ever sends the word list, never page text." |
| 2:20-2:40 | Show the extension working on the same page opened with `?plain=1` (toolbar button), then the repo README. | "It is a Chrome extension and a web app on one shared core, built with Firebase AI Logic hybrid inference, App Check, and Apache-2.0 code you can read. Plain-English Margin: read what your agent wrote, in plain English." |

## Checks before you upload

- Every claim in the narration matches something visible in the recording.
- The badge on screen says "Gemini Nano" only if the on-device path really answered; the badge reads the SDK's own `inferenceSource`, so it is honest, but check it.
- No sample-mode pill ("Sample mode · answers are stand-ins") is visible.
- No API keys, config values or debug tokens are visible in DevTools or the address bar.
- Length is under three minutes.
