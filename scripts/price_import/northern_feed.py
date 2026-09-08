"""Read only official Shufersal transparency files for the two requested cities.

No webshop scraping, cookies, login, proxy rotation or redirect following.
Stdlib only. JSON goes to stdout for the server-side database importer.
"""
import gzip
import io
import json
import math
import re
import sys
import time
from datetime import datetime
from html.parser import HTMLParser
from urllib.parse import urlparse, urlencode
from urllib.request import Request, build_opener, HTTPRedirectHandler
from xml.etree import ElementTree as ET
from zoneinfo import ZoneInfo

PORTAL = 'https://prices.shufersal.co.il/FileObject/UpdateCategory'
BLOB = 'pricesprodpublic.blob.core.windows.net'
CHAIN = '7290027600007'
CITIES = {'1063': 'מעלות-תרשיחא', '9100': 'נהרייה'}
MAX_BYTES = 40 * 1024 * 1024


class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        raise RuntimeError('Source redirected; review required')


def fetch(url):
    parsed = urlparse(url)
    if parsed.scheme != 'https' or parsed.hostname not in {'prices.shufersal.co.il', BLOB} or parsed.username or parsed.port:
        raise ValueError('Unapproved source URL')
    request = Request(url, headers={'User-Agent': 'SuperNav-price-import/1.0 (https://github.com/yakyu980/shopmap)'})
    with build_opener(NoRedirect()).open(request, timeout=45) as response:
        data = response.read(MAX_BYTES + 1)
    if len(data) > MAX_BYTES:
        raise ValueError('Source exceeds size limit')
    return data


class Links(HTMLParser):
    def __init__(self):
        super().__init__()
        self.urls = []

    def handle_starttag(self, tag, attrs):
        if tag == 'a':
            href = dict(attrs).get('href', '')
            if urlparse(href).hostname == BLOB:
                self.urls.append(href)


def latest_file(category, prefix, store=None):
    params = {'catID': category, 'sort': 'Time', 'sortdir': 'DESC'}
    if store:
        params['storeId'] = store
    listing = PORTAL + '?' + urlencode(params)
    links = Links()
    links.feed(fetch(listing).decode('utf-8-sig'))
    matches = [url for url in links.urls if urlparse(url).path.rsplit('/', 1)[-1].startswith(prefix) and urlparse(url).path.endswith('.gz')]
    if not matches:
        raise RuntimeError('No official file found for ' + prefix)
    # Listing explicitly sorted newest first; links must still match the expected branch.
    return matches[0], listing


def xml_file(url):
    with gzip.GzipFile(fileobj=io.BytesIO(fetch(url))) as compressed:
        xml = compressed.read(MAX_BYTES + 1)
    if len(xml) > MAX_BYTES or b'<!DOCTYPE' in xml.upper() or b'<!ENTITY' in xml.upper():
        raise ValueError('Unsafe or oversized XML')
    return ET.fromstring(xml)


def value(node, name):
    return (node.findtext(name) or '').strip()


def timestamp(text):
    try:
        parsed = datetime.fromisoformat(text)
        if parsed.tzinfo is None:
            parsed = parsed.replace(tzinfo=ZoneInfo('Asia/Jerusalem'))
        return int(parsed.timestamp() * 1000)
    except (ValueError, TypeError):
        return None


def amount(text):
    try:
        number = float(text)
        return number if math.isfinite(number) and number > 0 else None
    except (TypeError, ValueError):
        return None


def read_stores(root, now):
    if value(root, 'ChainID') != CHAIN:
        raise ValueError('Unexpected chain')
    updated = timestamp(value(root, 'LastUpdateDate') + 'T' + value(root, 'LastUpdateTime'))
    stores = []
    for sub in root.findall('./SubChains/SubChain'):
        sub_id = value(sub, 'SubChainID')
        if sub_id == '5':  # BE pharmacy is outside this supermarket pilot.
            continue
        for store in sub.findall('./Stores/Store'):
            city = value(store, 'City')
            external = value(store, 'StoreID')
            if city not in CITIES or not external.isdigit():
                continue
            stores.append({'id': f'{CHAIN}:{sub_id}:{external}', 'chain_id': CHAIN,
                           'external_id': f'{sub_id}:{external}', 'name': value(store, 'StoreName'),
                           'city_code': city, 'city_name': CITIES[city], 'address': value(store, 'Address'),
                           'source_updated_at': updated, 'imported_at': now})
    if set(s['city_code'] for s in stores) != set(CITIES):
        raise ValueError('Missing requested city in official store file')
    return stores


def read_prices(root, store, source_url, filename, now):
    sub, external = store['external_id'].split(':')
    if value(root, 'ChainID') != CHAIN or int(value(root, 'SubChainID')) != int(sub) or int(value(root, 'StoreID')) != int(external):
        raise ValueError('Price file does not match branch')
    match = re.search(r'-(\d{8})-(\d{6})\.gz$', filename)
    if not match:
        raise ValueError('Missing source publication timestamp')
    published = timestamp(datetime.strptime(''.join(match.groups()), '%Y%m%d%H%M%S').isoformat())
    if not published or published > now:
        raise ValueError('Invalid source publication timestamp')
    products, prices = {}, []
    for item in root.findall('./Items/Item'):
        barcode, name = value(item, 'ItemCode'), value(item, 'ItemName')
        price = amount(value(item, 'ItemPrice'))
        updated = timestamp(value(item, 'PriceUpdateTime'))
        # Internal retailer codes must not be matched across retailers or to photos.
        if value(item, 'ItemType') != '1' or value(item, 'ItemStatus') == '0' or not re.fullmatch(r'\d{8,14}', barcode) or not name or not price or not updated or updated > now:
            continue
        products[barcode] = {'barcode': barcode, 'name': name, 'manufacturer': value(item, 'ManufactureName'),
                             'unit_quantity': ' '.join(filter(None, [value(item, 'Quantity'), value(item, 'UnitQty')])), 'updated_at': updated}
        prices.append({'barcode': barcode, 'store_id': store['id'], 'price': price,
                       'unit_price': amount(value(item, 'UnitOfMeasurePrice')), 'unit_measure': value(item, 'UnitOfMeasure'),
                       'source_file': filename, 'source_url': source_url, 'source_updated_at': published, 'imported_at': now})
    if len(products) < 100:
        raise ValueError('Fewer than 100 valid products: inspect source schema')
    return products, prices


def main():
    now = int(time.time() * 1000)
    url, _ = latest_file('5', 'Stores' + CHAIN)
    stores = read_stores(xml_file(url), now)
    products, prices = {}, []
    for store in stores:
        sub, external = store['external_id'].split(':')
        time.sleep(2)
        url, listing = latest_file('2', f'PriceFull{CHAIN}-{int(sub):03d}-{int(external):03d}-', external)
        parsed_products, parsed_prices = read_prices(xml_file(url), store, listing, urlparse(url).path.rsplit('/', 1)[-1], now)
        for barcode, product in parsed_products.items():
            if barcode not in products or product['updated_at'] > products[barcode]['updated_at']:
                products[barcode] = product
        prices.extend(parsed_prices)
        print(f"Read {len(parsed_prices)} prices for branch {external}", file=sys.stderr)
    print(json.dumps({'cities': [{'code': code, 'name': name, 'updated_at': now} for code, name in CITIES.items()],
                      'chains': [{'id': CHAIN, 'name': 'שופרסל', 'source_name': 'https://prices.shufersal.co.il/', 'updated_at': now}],
                      'stores': stores, 'products': list(products.values()), 'prices': prices}, ensure_ascii=False))


if __name__ == '__main__':
    main()
