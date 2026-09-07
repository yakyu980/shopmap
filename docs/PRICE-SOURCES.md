# Price source status

## Government controlled consumer prices

Reviewed 2026-09-07: `price_controlled_consumer_products` on data.gov.il,
resource `0a760550-0426-4eb7-acf6-2ee919bf12e7`, published by the Ministry
of Economy. Metadata identified it as public, open, `other-open`, with no
dataset-specific license URL. The [portal license](https://data.gov.il/he/terms-of-use)
allows reuse, including commercial use, subject to attribution and its other
conditions. No endorsement, trademarks, images or personal data are imported.

`GET /api/controlled-prices` reads this fixed CKAN source server-side, checks
license metadata, caches for one hour and fails on unexpected metadata. A change
to the portal terms without a metadata change is not detected automatically;
periodic human review remains necessary. This is not a legal opinion.

Home and PriceComparison show the latest effective maximum per exact source
product name, separately from retailer offers, with date, attribution and license.
These are NOT observed branch prices, deals or automatic barcode matches. The
source's product names do not always specify package size; users must check the
official publication. This panel does not yet populate the shopping-list catalog.

## Retailer transparency files

The existing importer previously enabled every adapter by default. It now fails
before network access unless `scripts/price_import/source_policy.json` contains
reviewed sources. The list is deliberately empty pending endpoint, reuse and
adapter review. This stops scheduled retailer imports; existing database rows are
not deleted. The scraper's software license does not establish data reuse rights.

Only official Stores/PriceFull/PromoFull feeds may be considered. Do not enable
shopping-site scraping, CAPTCHA bypass, access-control evasion or third-party
comparison-site extraction. Record the official endpoint, reuse basis, review date
and adapter audit for each enabled source. An empty scraper list must never be
passed to the library, where it would mean all retailers.

Client deployment is independent of the API's Render deployment. Build success
alone does not establish that either the live API or an importer has run.
