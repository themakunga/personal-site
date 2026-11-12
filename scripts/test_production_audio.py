import os
import shutil
import subprocess
import tempfile
import unittest
from pathlib import Path


class ProductionAudioTest(unittest.TestCase):
    def test_reuses_images_and_stops_before_publication_on_tool_failure(self) -> None:
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
                'test "${PODMAN_COMPOSE_WARNING_LOGS:-}" = false\n'
                'case "$*" in\n'
                '  "volume create personal-site_web_image_cache" | "volume create personal-site_tts_audio_cache" | "volume create personal-site_tts_voice_models") touch "$3" ;;\n'
                '  "compose -p personal-site-prod -f docker-compose.yml pull --policy missing web api renderer tts cloudflared")\n'
                "    test -f personal-site_web_image_cache\n"
                "    test -f personal-site_tts_audio_cache\n"
                "    test -f personal-site_tts_voice_models ;;\n"
                '  "compose -p personal-site-prod -f docker-compose.yml run --rm --no-deps tts --once")\n'
                '    test "${FAIL_TTS:-0}" = 0 || exit 23\n'
                "    mkdir -p apps/web/public/audio\n"
                "    printf OggSfixture > apps/web/public/audio/article.ogg ;;\n"
                '  "compose -p personal-site-prod -f docker-compose.yml run --rm --no-deps renderer")\n'
                "    test -s apps/web/public/audio/article.ogg\n"
                '    test "${FAIL_RENDER:-0}" = 0 || exit 25\n'
                "    touch site-published ;;\n"
                '  "compose -p personal-site-prod -f docker-compose.yml up -d --no-build --pull never web api cloudflared")\n'
                "    test -f site-published\n"
                "    touch services-started ;;\n"
                "  *) exit 24 ;;\n"
                "esac\n"
            )
            docker.chmod(0o755)
            environment = {
                **os.environ,
                "PATH": str(bin_dir) + os.pathsep + os.environ["PATH"],
                "SITE_IMAGE_TAG": "sha-fixture",
            }
            result = subprocess.run(
                ["make", "prod"],
                cwd=site,
                env=environment,
                capture_output=True,
                text=True,
            )
            self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
            self.assertTrue((site / "services-started").exists())
            for failure in ("FAIL_TTS", "FAIL_RENDER"):
                with self.subTest(failure=failure):
                    (site / "site-published").unlink(missing_ok=True)
                    (site / "services-started").unlink(missing_ok=True)
                    result = subprocess.run(
                        ["make", "prod"],
                        cwd=site,
                        env={**environment, failure: "1"},
                        capture_output=True,
                        text=True,
                    )
                    self.assertNotEqual(result.returncode, 0)
                    self.assertFalse((site / "site-published").exists())
                    self.assertFalse((site / "services-started").exists())


if __name__ == "__main__":
    unittest.main()
