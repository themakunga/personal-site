"""Check rendered blog routes, adjacent posts and RSS on a running static site."""

import argparse
import json
from html.parser import HTMLParser
from urllib.parse import urljoin, urlparse
from urllib.request import urlopen
import xml.etree.ElementTree as ET


class Page(HTMLParser):
    def __init__(self, html):
        super().__init__()
        self.payload = None
        self.read_payload = False
        self.in_navigation = False
        self.seen_post_body = False
        self.navigation_before_body = []
        self.neighbors = {}
        self.rss = None
        self.feed_link = False
        self.feed(html)

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        self.read_payload = tag == "script" and attrs.get("id") == "__NUXT_DATA__"
        if "post__body" in attrs.get("class", "").split():
            self.seen_post_body = True
        if tag == "nav" and attrs.get("aria-label") == "Post navigation":
            self.in_navigation = True
            self.navigation_before_body.append(not self.seen_post_body)
        if tag == "a":
            if self.in_navigation:
                for rel in attrs.get("rel", "").split():
                    if rel in ("prev", "next"):
                        self.neighbors[rel] = attrs["href"]
            if attrs.get("href") == "/rss":
                self.feed_link = True
        if tag == "link" and attrs.get("type") == "application/rss+xml":
            self.rss = attrs.get("href")

    def handle_endtag(self, tag):
        if tag == "nav":
            self.in_navigation = False
        if tag == "script":
            self.read_payload = False

    def handle_data(self, data):
        if self.read_payload:
            self.payload = json.loads(data)


def check_page(base, path):
    with urlopen(urljoin(base, path), timeout=20) as response:
        page = Page(response.read().decode())
    assert page.payload is not None, f"Missing Nuxt payload for {path}"
    rendered_path = page.payload[page.payload[0]["path"]]
    assert rendered_path == urlparse(path).path, (
        f"Reload renders {rendered_path!r} instead of {path!r}"
    )
    return page


def check_site(base):
    with urlopen(urljoin(base, "/rss.xml"), timeout=20) as response:
        assert "application/rss+xml" in response.headers["Content-Type"]
        rss = ET.fromstring(response.read())
    assert rss.tag == "rss" and rss.attrib["version"] == "2.0"
    channel = rss.find("channel")
    assert channel is not None
    posts = channel.findall("item")
    for post in posts:
        content = post.findtext("{http://purl.org/rss/1.0/modules/content/}encoded")
        assert content and "<p>" in content, "RSS item is missing its complete HTML body"
    paths = [urlparse(post.findtext("link")).path for post in posts]
    assert len(paths) == len(set(paths)), "RSS contains duplicate posts"
    for index, path in enumerate(paths):
        page = check_page(base, path)
        expected = {}
        if index + 1 < len(paths):
            expected["prev"] = paths[index + 1]
        if index > 0:
            expected["next"] = paths[index - 1]
        assert page.neighbors == expected, (path, page.neighbors, expected)
        assert page.navigation_before_body == ([True, False] if expected else []), (
            f"Expected adjacent-post navigation before and after the article: {path}"
        )
        assert page.rss and urlparse(page.rss).path == "/rss.xml"
        assert page.feed_link, "Missing visible RSS link"
        check_page(base, path + "?reload-check=1")
    for path in ("/", "/blog", "/about", "/portfolio", "/rss"):
        page = check_page(base, path)
        assert page.rss and page.feed_link, f"Missing RSS discovery on {path}"
    print(
        f"Blog checks passed: {len(paths)} posts, adjacent links, direct loads and full-content RSS"
    )


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("base_url")
    parser.add_argument("path", nargs="?")
    args = parser.parse_args()
    if args.path:
        check_page(args.base_url, args.path)
    else:
        check_site(args.base_url)
