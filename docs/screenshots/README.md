# Screenshots

## From a real run (`real-cloud-*.png`)

These come from a real run against a Firebase project, recorded by `scripts/record-demo.mjs` (headless Chromium, the web app with a hosted-style config, App Check through reCAPTCHA Enterprise). Every answer on screen was written by `gemini-3.5-flash-lite` in the cloud through Firebase AI Logic. The browser had no on-device model, so every badge reads "In the cloud · Gemini" and gives the reason. None of these images shows Gemini Nano running.

| File | Size | Shows |
| --- | --- | --- |
| `real-cloud-1-hover-card.png` | 1280x720 | Hover card for "race condition", written by the model for that sentence, with the cloud badge and the reason "no on-device model ready" |
| `real-cloud-2-walkthrough.png` | 1280x720 | "What just happened?" for the demo thread: summary and numbered steps, routed to the cloud because the thread is long |
| `real-cloud-3-terms-you-know.png` | 1280x720 | The known-terms list after pressing "I know this" on two words |
| `real-cloud-4-settings.png` | 1280x720 | Settings: sync off by default, and the on-device model shown as not available in this browser |

Regenerate by serving the web app with a real config and running `node scripts/record-demo.mjs <url>`. The stills land in `dist/video/stills/`.

## Layout screenshots with a stand-in model (`desktop-*.png`, `mobile-*.png`)

**These are fake-adapter screenshots.** They were taken by `pnpm screenshots` (headless Chromium, the built web app, `?adapter=fake`). The answers on screen are canned stand-ins. No Gemini model, on-device or cloud, produced any of them, and the on-device badge in these images is not evidence that Gemini Nano ran. Each card says "Sample answer for the demo: no model ran." for that reason.

What they do show: layout, the hover card, the model badge with its reason line, the walkthrough, the known-terms list shrinking the underlines, the dark colour scheme and the phone layout.

| File | Size | Shows |
| --- | --- | --- |
| `desktop-1-hover-card.png` | 1280x800 | Hover card with a plain sentence, "why it matters here", and the badge for a short lookup |
| `desktop-2-model-badge-cloud.png` | 1280x800 | Same card with the cloud badge and the reason "no on-device model ready" |
| `desktop-3-walkthrough.png` | 1280x800 | "What just happened?" for the long demo thread, routed to the cloud because it is long |
| `desktop-4-terms-you-know.png` | 1280x800 | The known-terms list after pressing "I know this", with the underline count |
| `desktop-5-dark.png` | 1280x800 | Dark colour scheme |
| `mobile-1-hover-card.png` | 390x844 | Card on a phone-sized screen |
| `mobile-2-walkthrough.png` | 390x844 | Walkthrough as a bottom sheet |

Regenerate with `pnpm build && pnpm screenshots`. The script also checks a few behaviours (the badge text, a known term stops being underlined, the long thread routes to the cloud) and fails if they break.
