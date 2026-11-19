// Turn dist/video/footage.webm + scenes.json into a captioned, narrated MP4.
//   node scripts/make-video.mjs <dir-with-nNN.wav-narration-clips>
// The clips are one WAV per line of docs/submission/narration.json, in order (n00.wav, n01.wav, ...),
// made with any text-to-speech tool. Captions are the same lines, timed to the recorded scenes.
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const wavDir = resolve(process.argv[2] ?? 'dist/video/wav');
const dir = 'dist/video';
const { scenes } = JSON.parse(readFileSync(join(dir, 'scenes.json'), 'utf8'));
const lines = JSON.parse(readFileSync('docs/submission/narration.json', 'utf8'));
const at = Object.fromEntries(scenes.map((s) => [s.id, s.t]));
const end = at.end + 0.4;

const dur = (f) => Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f]).toString().trim());
const ts = (s) => {
  const ms = Math.round(s * 1000);
  const p = (n, w = 2) => String(n).padStart(w, '0');
  return `${p(Math.floor(ms / 3600000))}:${p(Math.floor(ms / 60000) % 60)}:${p(Math.floor(ms / 1000) % 60)},${p(ms % 1000, 3)}`;
};

const cues = lines.map((l, i) => {
  if (!(l.scene in at)) throw new Error(`scene ${l.scene} was not recorded`);
  const wav = join(wavDir, `n${String(i).padStart(2, '0')}.wav`);
  const start = at[l.scene] + 0.3;
  return { ...l, wav, start, stop: start + dur(wav) };
});
for (let i = 1; i < cues.length; i++) {
  if (cues[i].start < cues[i - 1].stop) throw new Error(`narration "${cues[i - 1].scene}" overlaps "${cues[i].scene}"`);
}
if (cues.at(-1).stop > end) throw new Error('narration runs past the end of the footage');

// Captions: split long lines into two cues so each stays short on screen.
const srt = [];
for (const c of cues) {
  const words = c.text.split(' ');
  const parts = words.length > 16 ? [words.slice(0, Math.ceil(words.length / 2)), words.slice(Math.ceil(words.length / 2))] : [words];
  const total = c.stop - c.start;
  let t = c.start;
  for (const [k, w] of parts.entries()) {
    const d = (total * w.length) / words.length;
    // Only the last part lingers; an earlier part ends exactly where the next begins, so two never show at once.
    const stop = k === parts.length - 1 ? Math.min(t + d + 0.15, c.stop + 0.4) : t + d;
    srt.push(`${srt.length + 1}\n${ts(t)} --> ${ts(stop)}\n${w.join(' ').replace(/A\.I\./g, 'AI').replace(/S\.D\.K\./g, 'SDK')}\n`);
    t += d;
  }
}
writeFileSync(join(dir, 'captions.srt'), srt.join('\n'));

const inputs = ['-y', '-hide_banner', '-loglevel', 'error', '-i', join(dir, 'footage.webm')];
const delays = [];
cues.forEach((c, i) => {
  inputs.push('-i', c.wav);
  const ms = Math.round(c.start * 1000);
  delays.push(`[${i + 1}:a]adelay=${ms}|${ms},aresample=48000[a${i}]`);
});
// Captions sit in their own strip under the footage, so they never cover the UI.
// ASS units: the 288-line script canvas scales to 720 px, so FontSize 9 is about 22 px.
const style = 'FontName=DejaVu Sans,FontSize=9,PrimaryColour=&H00FFFFFF,BorderStyle=1,Outline=0,Shadow=0,MarginV=9';
const filter = [
  ...delays,
  `${cues.map((_, i) => `[a${i}]`).join('')}amix=inputs=${cues.length}:normalize=0,apad[aout]`,
  `[0:v]fps=30,scale=1138:640,pad=1280:720:71:0:color=0x111111,subtitles=${join(dir, 'captions.srt')}:force_style='${style}'[vout]`,
].join(';');
execFileSync('ffmpeg', [
  ...inputs, '-filter_complex', filter, '-map', '[vout]', '-map', '[aout]', '-t', end.toFixed(2),
  '-c:v', 'libx264', '-preset', 'medium', '-crf', '20', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '160k', '-movflags', '+faststart',
  join(dir, 'plain-english-margin-demo.mp4'),
], { stdio: 'inherit' });
console.log(`wrote ${join(dir, 'plain-english-margin-demo.mp4')} (${end.toFixed(1)} s) and captions.srt with ${srt.length} cues`);
