import io
import runpy
import unittest
from email.message import Message
from pathlib import Path
from unittest.mock import patch


class Response(io.BytesIO):
    def __init__(self, body: bytes, content_type: str) -> None:
        super().__init__(body)
        self.headers = Message()
        self.headers["Content-Type"] = content_type


class CheckArticleAudioTest(unittest.TestCase):
    def verify(self, content_type: str, body: bytes) -> None:
        html = b'<audio><source src="/audio/article.ogg?v=updated" type="audio/ogg; codecs=opus"></audio>'
        with (
            patch(
                "sys.argv",
                ["check_article_audio.py", "https://example.com/blog/article"],
            ),
            patch(
                "urllib.request.urlopen",
                side_effect=[Response(html, "text/html"), Response(body, content_type)],
            ) as request,
        ):
            runpy.run_path(str(Path(__file__).with_name("check_article_audio.py")))
        self.assertEqual(
            request.call_args_list[1].args[0].full_url,
            "https://example.com/audio/article.ogg?v=updated",
        )

    def test_accepts_ogg_opus_and_rejects_html_or_another_codec(self) -> None:
        self.verify("audio/ogg", b"OggS\x00OpusHead")
        with self.assertRaisesRegex(AssertionError, "non-Ogg"):
            self.verify("text/html", b"<html>SPA fallback</html>")
        with self.assertRaisesRegex(AssertionError, "Invalid Ogg Opus"):
            self.verify("audio/ogg", b"OggS\x00vorbis")


if __name__ == "__main__":
    unittest.main()
