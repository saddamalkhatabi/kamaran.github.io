"""Create actual group-three English MP3 recordings with same-synthesis word timings.

Never fabricate voice clips, word times, or claim that an asset exists before it is
produced and verified. This script runs in CI with edge-tts and ffprobe.
"""
import argparse
import asyncio
import hashlib
import base64
import json
from pathlib import Path

import edge_tts
from render_pattern_audio import cue_words, duration_ms

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data/group-three.json"
OUT = ROOT / "assets/group-three-audio"
INDEX = ROOT / "data/group-three-audio-index.json"
VOICE = "en-US-JennyNeural"
RATE = "-8%"
VOICE_CANDIDATES = ("en-US-JennyNeural", "en-US-AriaNeural", "en-GB-SoniaNeural", "en-US-GuyNeural", "en-AU-NatashaNeural", "en-US-JennyNeural")

def clips():
    patterns = json.loads(DATA.read_text(encoding="utf-8"))["items"]
    result = []
    for p in patterns:
        stem = f"p{p['id']:02d}"
        result.append((f"{stem}/intro", p["explanationEn"]))
        result.extend((f"{stem}/scene-{s['id']}", s["en"]) for s in p["scenes"])
        result.extend((f"{stem}/story-{s['id']}", s["en"]) for s in p["story"])
        result.extend((f"{stem}/dialogue-{s['id']}", s["en"]) for s in p["dialogue"])
    chapters = json.loads(DATA.read_text(encoding="utf-8")).get("chapters", [])
    for chapter in chapters:
        stem=f"chapters/c{chapter['id']:02d}"
        result.extend((f"{stem}/line-{line['id']}", line["en"]) for line in chapter["lines"])
    return result

def preexisting():
    known = {}
    for index_file in ["data/audio-word-cues.json", "data/pattern-audio-index.json"]:
        src = ROOT / index_file
        if not src.exists():
            continue
        index = json.loads(src.read_text(encoding="utf-8"))
        for key, item in index.get("items", {}).items():
            path = key if key.endswith(".mp3") else item.get("path")
            if not path:
                continue
            target = ROOT / path
            if (target.is_file() and item.get("audio_sha256")
                and hashlib.sha256(target.read_bytes()).hexdigest() == item["audio_sha256"]):
                known.setdefault(item["text"], path)
    return known

async def one(key, text, semaphore, tries):
    path = OUT / (key + ".mp3")
    metadata = OUT / (key + ".jsonl")
    path.parent.mkdir(parents=True, exist_ok=True)
    async with semaphore:
        for attempt in range(1, tries + 1):
            try:
                if not (path.exists() and metadata.exists() and metadata.stat().st_size):
                    voice = VOICE_CANDIDATES[(attempt - 1) % len(VOICE_CANDIDATES)]
                    client = edge_tts.Communicate(text, voice=voice, rate=RATE,
                                                  boundary="WordBoundary")
                    await asyncio.wait_for(client.save(str(path), str(metadata)), timeout=100)
                words = [json.loads(s) for s in metadata.read_text(encoding="utf-8").splitlines() if s.strip()]
                ms = duration_ms(path)
                cues, repairs = cue_words(text, words, ms)
                row = {
                    "text": text, "path": str(path.relative_to(ROOT)).replace("\\", "/"),
                    "audio_sha256": hashlib.sha256(path.read_bytes()).hexdigest(),
                    "duration_ms": ms, "language": "en", "voice": voice,
                    "timing_source": "WordBoundary from the same Edge Neural TTS MP3",
                    "small_overlap_repairs": repairs, "cues": cues,
                }
                metadata.unlink(missing_ok=True)
                return key, row
            except Exception as exc:
                path.unlink(missing_ok=True)
                metadata.unlink(missing_ok=True)
                if attempt == tries:
                    raise RuntimeError(f"{key}: failed to synthesize and verify {text}: {exc}") from exc
                await asyncio.sleep(attempt * 2)

async def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--concurrency", type=int, default=3)
    ap.add_argument("--retries", type=int, default=4)
    ap.add_argument("--only-pattern", type=int)
    args = ap.parse_args()
    raw = clips()
    if len(raw) != 198 or len(set(key for key, _ in raw)) != len(raw):
        raise ValueError("Expect exactly 180 unique third-group clip IDs")
    if args.only_pattern:
        raw = [(k, t) for k, t in raw if k.startswith(f"p{args.only_pattern:02d}/")]
    # Public standalone preview must include every clip in its lazy JS bundles; do not skip source voice clips.
    original = {}
    current = json.loads(INDEX.read_text(encoding="utf-8")) if INDEX.exists() else {"schema": 1, "items": {}}
    current["schema"] = 1
    current["source"] = "Only verified group-three MP3s and measured same-synthesis word boundaries"
    current.setdefault("items", {})
    pending = []
    for key, text in raw:
        if text in original:
            print(f"REUSE verified existing recording: {key} <- {original[text]}", flush=True)
            current["items"].pop(key, None)
            continue
        old = current["items"].get(key)
        path = ROOT / old["path"] if old and old.get("path") else None
        if (old and old.get("text") == text and path and path.exists()
                and hashlib.sha256(path.read_bytes()).hexdigest() == old.get("audio_sha256")):
            continue
        pending.append((key, text))
    semaphore = asyncio.Semaphore(args.concurrency)
    for i in range(0, len(pending), 12):
        batch = pending[i:i + 12]
        records = await asyncio.gather(*(one(key, text, semaphore, args.retries) for key, text in batch))
        for key, row in records:
            current["items"][key] = row
        print(f"RENDERED {i + len(batch)} / {len(pending)} new recordings", flush=True)
    current["verified_count"] = len(current["items"])
    INDEX.write_text(json.dumps(current, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    bundles = {}
    for key,row in current["items"].items():
        group=key.split("/")[0]
        path=ROOT/row["path"]
        assert path.is_file(), f"Missing verified MP3 for {key}"
        assert hashlib.sha256(path.read_bytes()).hexdigest()==row["audio_sha256"]
        bundles.setdefault(group,{})[key]=base64.b64encode(path.read_bytes()).decode("ascii")
    target=ROOT/"assets/group-three-audio-bundles"
    target.mkdir(parents=True,exist_ok=True)
    for group,entries in bundles.items():
        p=target/(group+".js")
        p.write_text("window.LE_GROUP_THREE_AUDIO=Object.assign(window.LE_GROUP_THREE_AUDIO||{},"
                     +json.dumps(entries,separators=(",",":"))+");\n",encoding="utf-8")
    print(f"BUNDLED {len(bundles)} lazy voice scripts with {sum(map(len,bundles.values()))} verified clips",flush=True)
    print(f"COMPLETE {len(raw)} requested, {len(pending)} synthesized, {len(raw) - len(pending)} reused", flush=True)

if __name__ == "__main__":
    asyncio.run(main())
