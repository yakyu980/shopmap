import unittest
from xml.etree import ElementTree as ET
from northern_feed import fetch, read_stores, read_prices, amount, timestamp


class NorthernFeedTest(unittest.TestCase):
    def test_non_official_hosts_rejected_before_network(self):
        for url in ['https://example.com/a.gz', 'http://prices.shufersal.co.il/', 'https://prices.shufersal.co.il.evil.test/']:
            with self.assertRaises(ValueError):
                fetch(url)

    def test_invalid_values_not_invented(self):
        for item in ['NaN', 'Infinity', '-1', '', '0']:
            self.assertIsNone(amount(item))
        self.assertIsNone(timestamp('invalid'))

    def test_wrong_city_and_chain_rejected(self):
        with self.assertRaises(ValueError):
            read_stores(ET.fromstring('<Chain><ChainID>other</ChainID></Chain>'), 0)

    def test_wrong_branch_rejected(self):
        root = ET.fromstring('<Root><ChainID>7290027600007</ChainID><SubChainID>002</SubChainID><StoreID>999</StoreID></Root>')
        with self.assertRaises(ValueError):
            read_prices(root, {'external_id': '2:344'}, '', '', 0)
