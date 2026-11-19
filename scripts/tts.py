"""Synthesize each line of docs/submission/narration.json to a WAV with Piper TTS.

    uv run --no-project --python 3.12 --with piper-tts \
        python scripts/tts.py docs/submission/narration.json dist/video/wav <voice.onnx>

Get the voice used for the demo video with
`python -m piper.download_voices en_US-joe-medium --data-dir <dir>` (its model card lists the
training data as CC0). A line's `say` field, when present, is what Piper reads; captions keep `text`.
Writes n00.wav, n01.wav, ... and durations.json, which scripts/make-video.mjs then lays over the footage.
"""

import json
import sys
import wave
from pathlib import Path

from piper import PiperVoice

lines = json.loads(Path(sys.argv[1]).read_text())
out = Path(sys.argv[2])
out.mkdir(parents=True, exist_ok=True)
voice = PiperVoice.load(sys.argv[3])
durs = {}
for i, item in enumerate(lines):
    p = out / f"n{i:02d}.wav"
    with wave.open(str(p), "wb") as w:
        voice.synthesize_wav(item.get("say", item["text"]), w)
    with wave.open(str(p), "rb") as r:
        d = r.getnframes() / r.getframerate()
    durs[item["scene"]] = round(d, 2)
    print(f"{i:02d} {item['scene']:<22} {d:5.2f}s")
(out / "durations.json").write_text(json.dumps(durs, indent=2))
