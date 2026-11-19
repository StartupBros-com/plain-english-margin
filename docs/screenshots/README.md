# Screenshots

**These are fake-adapter screenshots.** They were taken by `pnpm screenshots` (headless Chromium, the built web app, `?adapter=fake`). The answers on screen are canned stand-ins. No Gemini model, on-device or cloud, produced any of them, and the on-device badge in these images is not evidence that Gemini Nano ran. Each card says "Sample answer for the demo: no model ran." for that reason.

What they do show: layout, the hover card, the model badge with its reason line, the walkthrough, and the known-terms list shrinking the underlines.

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
