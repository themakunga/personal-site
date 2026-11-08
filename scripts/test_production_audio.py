import os
import shutil
import subprocess
import tempfile
import unittest
from pathlib import Path


class ProductionAudioTest(unittest.TestCase):
    def test_generates_audio_before_build_and_stops_on_failure(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            site = root / "personal-site"
            site.mkdir()
            content = root / "personal-content" / "posts"
            content.mkdir(parents=True)
            (content / "article.md").write_text("---\naudio: es-CL\n---\nArticle\n")
            shutil.copyfile(
                Path(__file__).resolve().parents[1] / "Makefile", site / "Makefile"
            )
            bin_dir = root / "bin"
            bin_dir.mkdir()
            docker = bin_dir / "docker"
            docker.write_text(
                "#!/bin/sh\n"
                "set -eu\n"
                'case "$*" in\n'
                '  "compose -f docker-compose.local.yml build tts") ;;\n'
                '  "compose -f docker-compose.local.yml run --rm tts --once")\n'
                '    test "${FAIL_TTS:-0}" = 0 || exit 23\n'
                "    mkdir -p apps/web/public/audio\n"
                "    printf ID3fixture > apps/web/public/audio/article.mp3 ;;\n"
                '  "compose -p personal-site-prod -f docker-compose.yml up --build -d")\n'
                "    test -s apps/web/public/audio/article.mp3\n"
                "    test -f .content/posts/article.md\n"
                "    touch web-built ;;\n"
                "  *) exit 24 ;;\n"
                "esac\n"
            )
            docker.chmod(0o755)
            environment = {
                **os.environ,
                "PATH": str(bin_dir) + os.pathsep + os.environ["PATH"],
            }
            result = subprocess.run(
                ["make", "prod"],
                cwd=site,
                env=environment,
                capture_output=True,
                text=True,
            )
            self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
            self.assertTrue((site / "web-built").exists())
            (site / "web-built").unlink()
            result = subprocess.run(
                ["make", "prod"],
                cwd=site,
                env={**environment, "FAIL_TTS": "1"},
                capture_output=True,
                text=True,
            )
            self.assertNotEqual(result.returncode, 0)
            self.assertFalse((site / "web-built").exists())


if __name__ == "__main__":
    unittest.main()
