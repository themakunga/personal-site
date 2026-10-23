#!/usr/bin/env python3

import argparse
import hashlib
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import time
from pathlib import Path

import yaml

VOICES = {
    "es-CL": "es_AR-daniela-high",
    "es-MX": "es_MX-ald-medium",
    "en-US": "en_US-lessac-medium",
}


def read_article(path: Path) -> tuple[str | None, str]:
    raw = path.read_text(encoding="utf-8")
    if not raw.startswith("---"):
        return None, raw

    parts = raw.split("---", 2)
    if len(parts) != 3:
        raise ValueError(f"Invalid frontmatter in {path}")

    metadata = yaml.safe_load(parts[1]) or {}
    language = metadata.get("audio")
    if language is not None and language not in VOICES:
        supported = ", ".join(VOICES)
        raise ValueError(f"Unsupported audio language {language!r} in {path}; use {supported}")
    return language, parts[2]


def markdown_to_text(markdown: str) -> str:
    text = re.sub(r"```.*?```|~~~.*?~~~", " ", markdown, flags=re.DOTALL)
    text = re.sub(r"!\[[^]]*]\([^)]*\)", " ", text)
    text = re.sub(r"\[([^]]+)]\([^)]*\)", r"\1", text)
    text = re.sub(r"`[^`]*`", " ", text)
    text = re.sub(r"<[^>]+>", " ", text)
    text = re.sub(r"(?m)^\s{0,3}(?:#{1,6}\s+|>\s?|[-*+]\s+|\d+[.)]\s+)", "", text)
    text = re.sub(r"[*_~]", "", text)
    return re.sub(r"\s+", " ", text).strip()


def load_cache(path: Path) -> dict[str, str]:
    if not path.exists():
        return {}
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return {}


def ensure_voice(voice: str, voices_dir: Path) -> Path:
    model = voices_dir / f"{voice}.onnx"
    config = voices_dir / f"{voice}.onnx.json"
    if model.exists() and config.exists():
        return model

    print(f"Downloading Piper voice {voice}...")
    subprocess.run(
        [sys.executable, "-m", "piper.download_voices", "--data-dir", str(voices_dir), voice],
        check=True,
    )
    return model


def synthesize(text: str, voice: str, voices_dir: Path, destination: Path) -> None:
    model = ensure_voice(voice, voices_dir)
    destination.parent.mkdir(parents=True, exist_ok=True)

    with tempfile.TemporaryDirectory() as temporary_dir:
        temporary = Path(temporary_dir)
        source_text = temporary / "article.txt"
        wav = temporary / "article.wav"
        mp3 = temporary / "article.mp3"
        source_text.write_text(text, encoding="utf-8")
        subprocess.run(
            [
                sys.executable,
                "-m",
                "piper",
                "-m",
                str(model),
                "--input-file",
                str(source_text),
                "-f",
                str(wav),
            ],
            check=True,
        )
        subprocess.run(
            ["lame", "--silent", "-b", "96", str(wav), str(mp3)],
            check=True,
        )
        staged = destination.with_suffix(".mp3.tmp")
        shutil.copyfile(mp3, staged)
        staged.replace(destination)


def generate(content_dir: Path, output_dir: Path, cache_dir: Path, voices_dir: Path, force: bool) -> None:
    cache_path = cache_dir / "audio.json"
    cache = load_cache(cache_path)
    changed = False

    for article in sorted(content_dir.rglob("*.md")):
        language, markdown = read_article(article)
        if language is None:
            continue

        text = markdown_to_text(markdown)
        if not text:
            raise ValueError(f"Article has no narratable text: {article}")

        relative = article.relative_to(content_dir).with_suffix(".mp3")
        destination = output_dir / relative
        voice = VOICES[language]
        digest = hashlib.sha256(f"{voice}\0{text}".encode()).hexdigest()
        key = relative.as_posix()
        if not force and destination.exists() and cache.get(key) == digest:
            print(f"Unchanged: {key}")
            continue

        print(f"Generating {key} ({language})...")
        synthesize(text, voice, voices_dir, destination)
        cache[key] = digest
        changed = True

    if changed:
        cache_dir.mkdir(parents=True, exist_ok=True)
        cache_path.write_text(json.dumps(cache, indent=2, sort_keys=True) + "\n", encoding="utf-8")


def snapshot(content_dir: Path) -> tuple[tuple[str, int, int], ...]:
    return tuple(
        (str(path), path.stat().st_mtime_ns, path.stat().st_size)
        for path in sorted(content_dir.rglob("*.md"))
    )


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate article audio with Piper")
    parser.add_argument("--once", action="store_true", help="Generate audio and exit")
    parser.add_argument("--watch", action="store_true")
    parser.add_argument("--force", action="store_true")
    args = parser.parse_args()

    content_dir = Path(os.environ.get("CONTENT_DIR", "/content/posts"))
    output_dir = Path(os.environ.get("OUTPUT_DIR", "/output"))
    cache_dir = Path(os.environ.get("CACHE_DIR", "/cache"))
    voices_dir = Path(os.environ.get("VOICES_DIR", "/voices"))

    if not content_dir.is_dir():
        raise SystemExit(f"Content directory does not exist: {content_dir}")

    generate(content_dir, output_dir, cache_dir, voices_dir, args.force)
    if not args.watch:
        return

    previous = snapshot(content_dir)
    print(f"Watching {content_dir} for article changes...")
    while True:
        time.sleep(2)
        current = snapshot(content_dir)
        if current == previous:
            continue
        try:
            generate(content_dir, output_dir, cache_dir, voices_dir, False)
            previous = current
        except Exception as error:
            print(f"Audio generation failed; retrying after the next change: {error}", file=sys.stderr)
            previous = current


if __name__ == "__main__":
    main()
