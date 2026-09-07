import unittest
from unittest.mock import patch, mock_open
import import_prices


class SourcePolicyTest(unittest.TestCase):
    def test_no_approved_sources_stops_before_network(self):
        with self.assertRaisesRegex(RuntimeError, "downloads disabled"):
            import_prices.main()

    def test_incomplete_review_is_rejected(self):
        with patch("pathlib.Path.open", mock_open(read_data='{"reviewed_sources":[{"scraper":"SHUFERSAL"}]}')):
            with self.assertRaisesRegex(RuntimeError, "Incomplete"):
                import_prices.reviewed_scrapers()


if __name__ == "__main__":
    unittest.main()
