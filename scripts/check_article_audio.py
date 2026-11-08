"""Verify that a deployed article serves a playable MP3 from its rendered source."""

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
        if tag == "source" and attributes.get("type") == "audio/mpeg":
            source = attributes.get("src")
            assert source, "Audio source has no URL"
            self.sources.append(source)


article_url = sys.argv[1]
parser = AudioSources()
with urlopen(
    Request(article_url, headers={"User-Agent": "Mozilla/5.0"}), timeout=30
) as response:
    parser.feed(response.read().decode("utf-8"))
assert parser.sources, "Article has no rendered MP3 source"
for source in parser.sources:
    audio_url = urljoin(article_url, source)
    request = Request(
        audio_url, headers={"Range": "bytes=0-127", "User-Agent": "Mozilla/5.0"}
    )
    with urlopen(request, timeout=30) as response:
        assert (
            response.headers.get_content_type() == "audio/mpeg"
        ), "Audio URL returned non-MP3 content"
        prefix = response.read(3)
        assert prefix == b"ID3" or (
            len(prefix) >= 2 and prefix[0] == 0xFF and prefix[1] & 0xE0 == 0xE0
        ), "Invalid MP3 signature"
    print(f"Valid MP3: {audio_url}")
