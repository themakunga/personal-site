import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from generate_audio import markdown_to_text, read_article


class GenerateAudioTest(unittest.TestCase):
    def test_reads_supported_language_and_cleans_markdown(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            article = Path(directory) / "article.md"
            article.write_text(
                "---\ntitle: Test\naudio: es-MX\n---\n# Title\nA [link](https://example.com).\n```js\nignored()\n```\n",
                encoding="utf-8",
            )

            language, markdown = read_article(article)

        self.assertEqual(language, "es-MX")
        self.assertEqual(markdown_to_text(markdown), "Title A link.")

    def test_rejects_unknown_language(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            article = Path(directory) / "article.md"
            article.write_text("---\naudio: fr-FR\n---\nBonjour\n", encoding="utf-8")

            with self.assertRaisesRegex(ValueError, "Unsupported audio language"):
                read_article(article)


if __name__ == "__main__":
    unittest.main()
