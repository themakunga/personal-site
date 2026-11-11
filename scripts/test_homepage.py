"""Build a fixture site and check homepage selection, static pagination and comment flags."""

import json
import os
from pathlib import Path
import subprocess
from tempfile import TemporaryDirectory
from html.parser import HTMLParser

from check_blog_navigation import Page

ROOT = Path(__file__).resolve().parents[1]
WEB = ROOT / "apps/web"


class Home(HTMLParser):
    def __init__(self, html):
        super().__init__()
        self.section = None
        self.posts = {key: [] for key in ("featured-post", "hero-tiles", "latest-posts")}
        self.links = []
        self.current = []
        self.in_pagination = False
        self.feed(html)

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if attrs.get("id") in self.posts:
            self.section = attrs["id"]
        if tag == "nav" and attrs.get("aria-label") == "Paginación de entradas":
            self.in_pagination = True
        if tag == "a":
            href = attrs.get("href", "")
            self.links.append(href)
            if self.section and href.startswith("/blog/"):
                self.posts[self.section].append(href)
            if self.in_pagination and attrs.get("aria-current") == "page":
                self.current.append(href)

    def handle_endtag(self, tag):
        if tag == "nav":
            self.in_pagination = False
        if tag == "section":
            self.section = None


def run(args, **kwargs):
    subprocess.run(["node", *args], check=True, **kwargs)


def main():
    content = Path(os.environ.get("CONTENT_DIR", ROOT.parent / "personal-content"))
    assert (content / "site.yaml").is_file(), "CONTENT_DIR must point to the source content repository"
    with TemporaryDirectory(prefix="homepage-content-") as directory:
        source = Path(directory)
        for name in ("posts", "assets", "portfolio/example"):
            (source / name).mkdir(parents=True)
        (source / "site.yaml").write_text(json.dumps({
            "site": {"name": "Fixture", "title": "Fixture blog", "url": "https://example.com"},
            "profile": {"displayName": "Example", "email": "example@example.com"},
            "blog": {"postPerPage": 5},
            "navigation": [{"label": "Home", "path": "/"}],
        }))
        (source / "assets/hero.svg").write_text('<svg xmlns="http://www.w3.org/2000/svg"/>')
        (source / "portfolio/example/README.md").write_text("---\ntitle: Example\n---\nExample")
        for index in range(14):
            metadata = {
                "title": f"Post {index:02}", "created_at": f"2026-11-11T{index:02}:00:00Z",
                "featured": index in (8, 10, 13), "draft": index == 13,
                "updated_at": "2026-11-11T12:30:00Z" if index == 0 else f"2026-11-11T{12 if index == 11 else index:02}:00:00Z",
                "image": "/assets/hero.svg" if 5 <= index <= 11 or index == 13 else "  ",
                "show_comments": index in (1, 3), "enable_comments": index in (2, 3),
            }
            (source / f"posts/post-{index:02}.md").write_text(
                "---\n" + json.dumps(metadata) + "\n---\nExample post.\n"
            )
        try:
            run(["--import", "tsx", "scripts/prepare-content.ts"], cwd=ROOT,
                env={**os.environ, "CONTENT_DIR": str(source)})
            run(["node_modules/nuxt/bin/nuxt.mjs", "generate"], cwd=WEB)
            public = WEB / ".output/public"
            path = lambda index: f"/blog/post-{index:02}"
            all_posts = []
            for number, indices in ((1, [0, 12, 11, 10, 9]), (2, range(8, 3, -1)), (3, range(3, 0, -1))):
                route = "/" if number == 1 else f"/page/{number}"
                html = (public / route.lstrip("/") / "index.html").read_text()
                home = Home(html)
                assert home.posts["featured-post"] == [path(10)], home.posts
                assert home.posts["hero-tiles"] == [path(i) for i in range(11, 5, -1)], home.posts
                assert home.posts["latest-posts"] == [path(i) for i in indices], home.posts
                assert home.current == [route + "#latest-posts"], home.current
                assert all(f"/page/{page}#latest-posts" in home.links for page in (2, 3))
                assert "/#latest-posts" in home.links
                payload = Page(html).payload
                assert payload[payload[0]["path"]] == route, "Incorrect prerendered route"
                all_posts.extend(home.posts["latest-posts"])
            assert all_posts == [path(0), *[path(i) for i in range(12, 0, -1)]]
            assert not (public / "blog/post-13/index.html").exists(), "Draft was prerendered"
            for index in range(4):
                html = (public / f"blog/post-{index:02}/index.html").read_text()
                assert ('class="comments"' in html) == (index > 0)
                assert ("Aún no hay comentarios." in html) == (index in (1, 3))
                assert ('class="comments__form"' in html) == (index in (2, 3))
            print("Homepage checks passed: featured, six image tiles, 5/5/3 pagination, drafts, reloads and independent comment flags")
        finally:
            run(["--import", "tsx", "scripts/prepare-content.ts"], cwd=ROOT)


if __name__ == "__main__":
    main()
