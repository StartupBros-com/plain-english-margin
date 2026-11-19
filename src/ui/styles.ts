/** Highlights live in the page itself, so they need their own colors. */
export const PAGE_CSS = `
.pem-term{--pem-accent:#2c6e63;text-decoration:underline dotted var(--pem-accent);text-decoration-thickness:1.5px;text-underline-offset:3px;background:color-mix(in srgb,var(--pem-accent) 11%,transparent);border-radius:3px;cursor:help;transition:background-color .15s cubic-bezier(.2,0,0,1)}
.pem-term:hover,.pem-term[data-open]{background:color-mix(in srgb,var(--pem-accent) 24%,transparent)}
.pem-term:focus-visible{outline:2px solid var(--pem-accent);outline-offset:2px}
@media (prefers-color-scheme:dark){.pem-term{--pem-accent:#7cc4b4}}
@media (prefers-reduced-motion:reduce){.pem-term{transition:none}}
`;

/** Everything else lives in a shadow root so it cannot be restyled by the page it sits on. */
export const SHADOW_CSS = `
:host{all:initial}
*,*::before,*::after{box-sizing:border-box}
:host,.wrap{
  --paper:#fffdf8;--paper-2:#f4f0e6;--ink:#22201c;--muted:#645f55;--line:#e1dacb;
  --accent:#255f55;--accent-ink:#fff;--accent-soft:#e3efeb;--cloud:#3a4f7a;--cloud-soft:#e6ebf5;--warn:#8a4b12;--warn-soft:#fbeedb;
  --shadow:0 1px 2px rgb(40 30 10 / .08),0 8px 24px -4px rgb(40 30 10 / .18),0 24px 48px -12px rgb(40 30 10 / .16);
  --font:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;--mono:ui-monospace,"SF Mono",Menlo,Consolas,monospace;
}
@media (prefers-color-scheme:dark){.wrap{
  --paper:#24221e;--paper-2:#2d2a25;--ink:#efe9dc;--muted:#b3ab9b;--line:#423e35;
  --accent:#8ccfbf;--accent-ink:#10231f;--accent-soft:#1f3631;--cloud:#a9bdf0;--cloud-soft:#27304a;--warn:#f0b878;--warn-soft:#3b2d1b;
  --shadow:0 1px 2px rgb(0 0 0 / .4),0 8px 24px -4px rgb(0 0 0 / .5),0 24px 48px -12px rgb(0 0 0 / .5);
}}
.wrap{font:15px/1.5 var(--font);color:var(--ink)}
button{font:inherit;color:inherit;cursor:pointer}
:focus-visible{outline:2px solid var(--accent);outline-offset:2px}

/* Card */
.card{position:fixed;z-index:2147483646;width:min(344px,calc(100vw - 24px));background:var(--paper);color:var(--ink);border:1px solid var(--line);border-radius:14px;box-shadow:var(--shadow);padding:14px 16px 12px;animation:pop .14s cubic-bezier(.2,0,0,1)}
.card[hidden]{display:none}
@keyframes pop{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:none}}
.card h2{margin:0 0 6px;font:600 13px/1.3 var(--mono);color:var(--accent);overflow-wrap:anywhere}
.plain{margin:0;font-size:16px;line-height:1.5;text-wrap:pretty}
.why{margin:10px 0 0;padding:8px 10px;background:var(--paper-2);border-radius:8px;font-size:14px;color:var(--muted)}
.why b{display:block;font:600 11px/1.2 var(--font);letter-spacing:.06em;text-transform:uppercase;margin-bottom:3px;color:var(--ink)}
.actions{display:flex;gap:8px;margin-top:12px}
.btn{min-height:40px;padding:0 14px;border-radius:10px;border:1px solid var(--line);background:var(--paper);transition:transform .12s cubic-bezier(.2,0,0,1),background-color .12s}
.btn:active{transform:scale(.96)}
.btn:hover{background:var(--paper-2)}
.btn.primary{background:var(--accent);border-color:var(--accent);color:var(--accent-ink);font-weight:600}
.btn.primary:hover{filter:brightness(1.08)}
.btn.quiet{border-color:transparent;background:transparent;color:var(--muted)}
.btn.small{min-height:32px;padding:0 10px;font-size:13px}
.model{margin-top:12px;padding-top:10px;border-top:1px solid var(--line);font-size:12.5px;color:var(--muted);line-height:1.4}
.chip{display:inline-flex;align-items:center;gap:6px;padding:2px 10px 2px 9px;border-radius:999px;font-weight:600;font-size:12px;line-height:1.5;background:var(--accent-soft);color:var(--accent)}
.chip::before{content:"";width:7px;height:7px;border-radius:50%;background:currentColor}
.chip.cloud{background:var(--cloud-soft);color:var(--cloud)}
.chip.cloud::before{border-radius:2px}
.model .why-line{display:block;margin-top:5px}
.model .sim{display:block;margin-top:5px;font-style:italic}
.skel{display:grid;gap:8px;padding:2px 0 4px}
.skel i{display:block;height:12px;border-radius:6px;background:linear-gradient(90deg,var(--paper-2),var(--line),var(--paper-2));background-size:200% 100%;animation:sh 1.2s linear infinite}
.skel i:nth-child(2){width:72%}
@keyframes sh{to{background-position:-200% 0}}
.note{margin:0;padding:8px 10px;border-radius:8px;background:var(--warn-soft);color:var(--warn);font-size:14px}

/* Launcher */
.fab{position:fixed;z-index:2147483645;inset-inline-end:max(16px,env(safe-area-inset-right));bottom:max(16px,env(safe-area-inset-bottom));min-height:48px;padding:0 20px;border:0;border-radius:999px;background:var(--accent);color:var(--accent-ink);font-weight:600;box-shadow:var(--shadow);transition:transform .12s cubic-bezier(.2,0,0,1)}
.fab:active{transform:scale(.96)}
.fab:focus-visible{outline-color:var(--ink);outline-offset:3px}

/* Panel */
.panel{position:fixed;z-index:2147483647;inset-block:0;inset-inline-end:0;width:min(420px,100vw);background:var(--paper);border-inline-start:1px solid var(--line);box-shadow:var(--shadow);display:flex;flex-direction:column;animation:slide .2s cubic-bezier(.2,0,0,1)}
.panel[hidden]{display:none}
@keyframes slide{from{opacity:0;transform:translateX(16px)}to{opacity:1;transform:none}}
.panel header{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px 16px 0}
.panel header h2{margin:0;font:650 17px/1.3 var(--font)}
.tabs{display:flex;gap:4px;padding:10px 12px 0;border-bottom:1px solid var(--line)}
.tab{min-height:40px;padding:0 12px;white-space:nowrap;border:0;border-bottom:2px solid transparent;background:transparent;color:var(--muted);font-weight:500}
.tab[aria-selected=true]{color:var(--ink);border-bottom-color:var(--accent);font-weight:600}
.body{flex:1;overflow:auto;padding:16px;overscroll-behavior:contain}
.body h3{margin:0 0 6px;font:650 15px/1.35 var(--font)}
.summary{margin:0 0 14px;font-size:16px;line-height:1.55;text-wrap:pretty}
.steps{margin:14px 0 0;padding:0;list-style:none;display:grid;gap:14px;counter-reset:s}
.steps li{position:relative;padding-inline-start:38px;counter-increment:s}
.steps li::before{content:counter(s);position:absolute;inset-inline-start:0;top:0;width:26px;height:26px;border-radius:50%;background:var(--accent-soft);color:var(--accent);font:650 13px/26px var(--font);text-align:center}
.steps p{margin:0;color:var(--muted);font-size:14.5px;text-wrap:pretty}
.empty{margin:0;color:var(--muted)}
.chips{display:flex;flex-wrap:wrap;gap:8px;margin:12px 0 0;padding:0;list-style:none}
.known{display:inline-flex;align-items:center;gap:2px;border:1px solid var(--line);border-radius:999px;padding-inline-start:12px;background:var(--paper-2);font:13px/1 var(--mono)}
.known button{min-width:32px;min-height:32px;border:0;background:transparent;border-radius:999px;color:var(--muted);font-size:16px}
.known button:hover{color:var(--ink)}
.count{margin:0;font-size:14.5px;color:var(--muted)}
.count strong{color:var(--ink);font-variant-numeric:tabular-nums}
.setting{display:flex;gap:12px;align-items:flex-start;padding:12px;border:1px solid var(--line);border-radius:12px;margin-bottom:12px}
.setting input{width:20px;height:20px;margin:2px 0 0;accent-color:var(--accent)}
.setting label{display:grid;gap:3px;cursor:pointer}
.setting small{color:var(--muted);font-size:13.5px}
.progress{height:6px;border-radius:3px;background:var(--line);overflow:hidden;margin-top:8px}
.progress i{display:block;height:100%;background:var(--accent);transition:width .2s}
@media (max-width:560px){
  .panel{inset-block:auto 0;inset-inline:0;width:auto;height:72vh;border-inline-start:0;border-top:1px solid var(--line);border-radius:18px 18px 0 0}
  .card{padding:14px}
}
@media (prefers-reduced-motion:reduce){.card,.panel{animation:none}.skel i{animation:none}.btn,.fab{transition:none}}
`;
