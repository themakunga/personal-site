import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).parent))

from generate_audio import generate, markdown_to_text, read_article, synthesize


class GenerateAudioTest(unittest.TestCase):
    def test_reads_supported_language_and_cleans_markdown(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            article = Path(directory) / "article.md"
            article.write_text(
                "---\ntitle: Test\naudio: es-CL\n---\n# Title\nA [link](https://example.com).\n```js\nignored()\n```\n",
                encoding="utf-8",
            )

            language, markdown = read_article(article)

        self.assertEqual(language, "es-CL")
        self.assertEqual(markdown_to_text(markdown), "Title A link.")

    def test_rejects_unknown_language(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            article = Path(directory) / "article.md"
            article.write_text("---\naudio: fr-FR\n---\nBonjour\n", encoding="utf-8")

            with self.assertRaisesRegex(ValueError, "Unsupported audio language"):
                read_article(article)

    def test_encodes_ogg_opus_and_preserves_existing_audio_when_encoding_fails(
        self,
    ) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            destination = root / "article.ogg"

            def run(command: list[str], **_kwargs: object) -> None:
                if command[0] == "opusenc":
                    self.assertIn("32", command)
                    self.assertIn("--speech", command)
                    self.assertIn("--downmix-mono", command)
                    Path(command[-1]).write_bytes(b"OggS\x00OpusHead")
                else:
                    Path(command[-1]).write_bytes(b"RIFFwave")

            with (
                patch("generate_audio.ensure_voice", return_value=root / "voice.onnx"),
                patch("generate_audio.subprocess.run", side_effect=run),
            ):
                synthesize("Example", "voice", root, destination)
            self.assertEqual(destination.read_bytes(), b"OggS\x00OpusHead")

            def fail_encoding(command: list[str], **kwargs: object) -> None:
                if command[0] == "opusenc":
                    raise subprocess.CalledProcessError(1, command)
                run(command, **kwargs)

            with (
                patch("generate_audio.ensure_voice", return_value=root / "voice.onnx"),
                patch("generate_audio.subprocess.run", side_effect=fail_encoding),
                self.assertRaises(subprocess.CalledProcessError),
            ):
                synthesize("Changed", "voice", root, destination)
            self.assertEqual(destination.read_bytes(), b"OggS\x00OpusHead")

    def test_ogg_cache_reuses_audio_and_invalidates_changed_encoder_settings(
        self,
    ) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            content = root / "posts"
            content.mkdir()
            article = content / "article.md"
            article.write_text("---\naudio: en-US\n---\nExample\n")
            output = root / "output"

            def write_audio(
                _text: str, _voice: str, _voices: Path, destination: Path
            ) -> None:
                self.assertEqual(destination.suffix, ".ogg")
                destination.parent.mkdir(parents=True, exist_ok=True)
                destination.write_bytes(b"OggS\x00OpusHead")

            with patch("generate_audio.synthesize", side_effect=write_audio) as render:
                for _ in range(2):
                    generate(content, output, root / "cache", root / "voices", False)
                self.assertEqual(render.call_count, 1)
                article.write_text("---\naudio: en-US\n---\nChanged\n")
                generate(content, output, root / "cache", root / "voices", False)
                self.assertEqual(render.call_count, 2)
                with patch(
                    "generate_audio.OPUS_ENCODER", ("opusenc", "--bitrate", "40")
                ):
                    generate(content, output, root / "cache", root / "voices", False)
                self.assertEqual(render.call_count, 3)


if __name__ == "__main__":
    unittest.main()
