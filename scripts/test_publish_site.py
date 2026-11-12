import shutil
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from publish_site import publish


class PublishSiteTest(unittest.TestCase):
    def test_switches_complete_releases_and_keeps_only_current_and_previous(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            source, destination = root / "source", root / "public"
            source.mkdir()
            (source / "obsolete.html").write_text("obsolete")
            for version in ("first", "second", "third"):
                (source / "index.html").write_text(version)
                publish(source, destination)
                self.assertEqual(
                    (destination / "current/index.html").read_text(), version
                )
                (source / "obsolete.html").unlink(missing_ok=True)
            self.assertFalse((destination / "current/obsolete.html").exists())
            releases = list(destination.glob("release-*"))
            self.assertEqual(len(releases), 2)
            self.assertEqual(
                {p.joinpath("index.html").read_text() for p in releases},
                {"second", "third"},
            )
            self.assertFalse((destination / ".current").exists())

    def test_copy_failure_preserves_live_site_and_cleans_partial_release(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            source, destination = root / "source", root / "public"
            source.mkdir()
            (source / "index.html").write_text("live")
            publish(source, destination)
            original = (destination / "current").readlink()
            with patch(
                "publish_site.subprocess.run", side_effect=OSError("disk full")
            ):
                with self.assertRaisesRegex(OSError, "disk full"):
                    publish(source, destination)
            self.assertEqual((destination / "current").readlink(), original)
            self.assertEqual((destination / "current/index.html").read_text(), "live")
            self.assertEqual(len(list(destination.glob("release-*"))), 1)
            shutil.rmtree(source)
            with self.assertRaises(FileNotFoundError):
                publish(source, destination)
            self.assertEqual((destination / "current").readlink(), original)


if __name__ == "__main__":
    unittest.main()
