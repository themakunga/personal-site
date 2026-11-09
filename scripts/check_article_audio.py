"""Verify that a deployed article serves Ogg Opus from its rendered source."""

import sys
from html.parser import HTMLParser
from urllib.parse import urljoin
from urllib.request import Request, urlopen


class AudioSources(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.sources: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        attributes = dict(attrs)
        media_type = attributes.get("type") or ""
        if (
            tag == "source"
            and media_type.split(";", 1)[0].strip().lower() == "audio/ogg"
        ):
            source = attributes.get("src")
            assert source, "Audio source has no URL"
            self.sources.append(source)


article_url = sys.argv[1]
parser = AudioSources()
with urlopen(
    Request(article_url, headers={"User-Agent": "Mozilla/5.0"}), timeout=30
) as response:
    parser.feed(response.read().decode("utf-8"))
assert parser.sources, "Article has no rendered Ogg source"
for source in parser.sources:
    audio_url = urljoin(article_url, source)
    request = Request(
        audio_url, headers={"Range": "bytes=0-127", "User-Agent": "Mozilla/5.0"}
    )
    with urlopen(request, timeout=30) as response:
        assert response.headers.get_content_type() == "audio/ogg", (
            "Audio URL returned non-Ogg content"
        )
        prefix = response.read(128)
        assert prefix.startswith(b"OggS") and b"OpusHead" in prefix, (
            "Invalid Ogg Opus signature"
        )
    print(f"Valid Ogg Opus: {audio_url}")
