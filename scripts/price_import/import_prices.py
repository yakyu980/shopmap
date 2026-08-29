"""Daily importer for Israel's official supermarket transparency files.

Downloads and parses the retailer-published Stores/PriceFull/PromoFull files,
then writes only prices for cities selected by at least one household. One
retailer failure is recorded and does not make already-imported data look new.
"""

from __future__ import annotations

import csv
import hashlib
import json
import os
import re
import shutil
import sys
import time
import uuid
from pathlib import Path

ROOT = Path(__file__).resolve().parent
DUMPS = ROOT / "work" / "dumps"
OUTPUTS = ROOT / "work" / "outputs"
STATUS = ROOT / "work" / "status"
FILE_TYPES = ["STORE_FILE", "PRICE_FULL_FILE", "PROMO_FULL_FILE"]
BATCH_SIZE = 500


def clean(value):
    return str(value or "").strip()


def first(row, *names):
    normalized = {re.sub(r"[^a-z0-9]", "", key.lower()): value for key, value in row.items()}
    for name in names:
        value = normalized.get(re.sub(r"[^a-z0-9]", "", name.lower()))
        if clean(value):
            return clean(value)
    return ""


def number(value):
    try:
        parsed = float(clean(value).replace(",", "."))
        return parsed if parsed >= 0 else None
    except (TypeError, ValueError):
        return None


def epoch(value, fallback=None):
    digits = re.sub(r"\D", "", clean(value))
    for fmt_len in (14, 12, 8):
        if len(digits) >= fmt_len:
            try:
                import datetime as dt
                fmt = {14: "%Y%m%d%H%M%S", 12: "%Y%m%d%H%M", 8: "%Y%m%d"}[fmt_len]
                return int(dt.datetime.strptime(digits[:fmt_len], fmt).timestamp() * 1000)
            except ValueError:
                pass
    return fallback


def key(value):
    return re.sub(r"[^a-z0-9]+", "-", clean(value).lower()).strip("-") or "unknown"


def city_code(name):
    return hashlib.sha1(clean(name).encode("utf-8")).hexdigest()[:12]


def chunks(rows):
    for index in range(0, len(rows), BATCH_SIZE):
        yield rows[index:index + BATCH_SIZE]


def upsert(client, table, rows, conflict):
    for batch in chunks(rows):
        client.table(table).upsert(batch, on_conflict=conflict).execute()


def csv_rows(path):
    with path.open("r", encoding="utf-8-sig", newline="") as handle:
        yield from csv.DictReader(handle)


def source_name(row, path):
    return first(row, "found_folder", "chainname") or path.stem.split("_", 3)[-1]


def chain_id(row, path):
    return key(first(row, "chainid") or source_name(row, path))


def extract_barcodes(row):
    direct = first(row, "itemcode", "barcode", "itemid")
    found = {direct} if direct else set()
    for value in row.values():
        text = clean(value)
        if not text or text[0:1] not in "[{":
            continue
        try:
            parsed = json.loads(text)
        except json.JSONDecodeError:
            continue
        stack = [parsed]
        while stack:
            item = stack.pop()
            if isinstance(item, dict):
                for item_key, item_value in item.items():
                    if re.sub(r"[^a-z0-9]", "", item_key.lower()) in {"itemcode", "barcode", "itemid"}:
                        found.add(clean(item_value))
                    elif isinstance(item_value, (dict, list)):
                        stack.append(item_value)
            elif isinstance(item, list):
                stack.extend(item)
    return {code for code in found if re.fullmatch(r"\d{6,14}", code)}


def run_download_and_parse():
    from il_supermarket_scarper import ScarpingTask
    from il_supermarket_parsers import ConvertingTask

    shutil.rmtree(ROOT / "work", ignore_errors=True)
    DUMPS.mkdir(parents=True)
    OUTPUTS.mkdir(parents=True)
    STATUS.mkdir(parents=True)
    scraper = ScarpingTask(
        files_types=FILE_TYPES,
        multiprocessing=4,
        output_configuration={"output_mode": "disk", "base_storage_path": str(DUMPS)},
        status_configuration={"database_type": "json", "base_path": str(STATUS / "scraper")},
    )
    scraper.start(single_pass=True)
    scraper.join()
    parser = ConvertingTask(
        source_configuration={"folder": str(DUMPS)},
        output_configuration=[{"output_mode": "csv", "output_folder": str(OUTPUTS)}],
        status_configuration={"database_type": "json", "base_path": str(STATUS / "parser")},
        files_types=FILE_TYPES,
        multiprocessing=4,
    )
    parser.start()
    parser.join()


def main():
    from supabase import create_client

    url = os.environ.get("SUPABASE_URL")
    secret = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("SUPABASE_SECRET_KEY")
    if not url or not secret:
        raise RuntimeError("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required")
    client = create_client(url, secret)
    started = int(time.time() * 1000)
    run_download_and_parse()

    store_files = list(OUTPUTS.glob("store_file_*.csv"))
    price_files = list(OUTPUTS.glob("price_full_file_*.csv"))
    promo_files = list(OUTPUTS.glob("promo_full_file_*.csv"))
    stores_by_external = {}
    stores, cities, chains = [], {}, {}
    now = int(time.time() * 1000)

    for path in store_files:
        for row in csv_rows(path):
            chain = chain_id(row, path)
            external = first(row, "storeid", "storecode", "branchid")
            city = first(row, "city", "cityname", "town")
            if not external or not city:
                continue
            code = city_code(city)
            store_id = f"{chain}:{key(external)}"
            chains[chain] = {"id": chain, "name": first(row, "chainname") or source_name(row, path), "source_name": source_name(row, path), "updated_at": now}
            cities[code] = {"code": code, "name": city, "updated_at": now}
            store = {
                "id": store_id, "chain_id": chain, "external_id": external,
                "name": first(row, "storename", "branchname") or external,
                "city_code": code, "city_name": city,
                "address": first(row, "address", "storeaddress"),
                "source_updated_at": epoch(first(row, "lastupdatedate", "updatedate"), now),
                "imported_at": now,
            }
            stores.append(store)
            stores_by_external[(chain, external)] = store

    upsert(client, "price_cities", list(cities.values()), "code")
    upsert(client, "retail_chains", list(chains.values()), "id")
    upsert(client, "retail_stores", stores, "id")
    preferences = client.table("household_price_preferences").select("city_code").execute().data or []
    active_cities = {row["city_code"] for row in preferences if row.get("city_code")}
    active_store_ids = {store["id"] for store in stores if store["city_code"] in active_cities}

    products, prices = {}, []
    imported_by_chain = {}
    for path in price_files:
        for row in csv_rows(path):
            chain = chain_id(row, path)
            external = first(row, "storeid", "storecode", "branchid")
            store = stores_by_external.get((chain, external))
            barcode = first(row, "itemcode", "barcode", "itemid")
            price = number(first(row, "itemprice", "price"))
            name = first(row, "itemname", "productname")
            if not store or store["id"] not in active_store_ids or not re.fullmatch(r"\d{6,14}", barcode) or not name or not price:
                continue
            updated = epoch(first(row, "priceupdatedate", "lastupdatedate", "updatedate"), epoch(path.name, now))
            products[barcode] = {
                "barcode": barcode, "name": name,
                "manufacturer": first(row, "manufacturename", "manufacturer"),
                "unit_quantity": first(row, "quantity", "unitqty", "unitofmeasure"),
                "updated_at": updated,
            }
            prices.append({
                "barcode": barcode, "store_id": store["id"], "price": price,
                "unit_price": number(first(row, "unitofmeasureprice", "unitprice")),
                "unit_measure": first(row, "unitofmeasure"), "source_file": first(row, "file_name") or path.name,
                "source_url": None, "source_updated_at": updated, "imported_at": now,
            })
            imported_by_chain[chain] = imported_by_chain.get(chain, 0) + 1

    upsert(client, "retail_products", list(products.values()), "barcode")
    upsert(client, "retail_prices", prices, "barcode,store_id")

    promotions, promotion_items = [], []
    for path in promo_files:
        for row in csv_rows(path):
            chain = chain_id(row, path)
            external = first(row, "storeid", "storecode", "branchid")
            store = stores_by_external.get((chain, external))
            if not store or store["id"] not in active_store_ids:
                continue
            external_promo = first(row, "promotionid", "promoid", "saleid")
            barcodes = extract_barcodes(row)
            if not external_promo or not barcodes:
                continue
            promo_id = f"{store['id']}:{key(external_promo)}"
            updated = epoch(first(row, "lastupdatedate", "updatedate"), epoch(path.name, now))
            promotions.append({
                "id": promo_id, "store_id": store["id"],
                "description": first(row, "promotiondescription", "description", "promodescription"),
                "discounted_price": number(first(row, "discountedprice", "promotionprice", "promoprice")),
                "min_quantity": number(first(row, "minqty", "minimumquantity", "quantity")),
                "club_only": bool(first(row, "clubid", "clubname", "membersonly")),
                "starts_at": epoch(first(row, "promotionstartdate", "startdate")),
                "ends_at": epoch(first(row, "promotionenddate", "enddate")),
                "source_file": first(row, "file_name") or path.name,
                "source_updated_at": updated, "imported_at": now,
            })
            for barcode in barcodes:
                if barcode in products:
                    promotion_items.append({"promotion_id": promo_id, "barcode": barcode})

    upsert(client, "retail_promotions", promotions, "id")
    upsert(client, "retail_promotion_items", promotion_items, "promotion_id,barcode")

    for chain, chain_row in chains.items():
        client.table("price_import_runs").insert({
            "id": str(uuid.uuid4()), "chain_id": chain,
            "status": "success" if imported_by_chain.get(chain, 0) else "stores_only",
            "stores_imported": sum(1 for store in stores if store["chain_id"] == chain),
            "prices_imported": imported_by_chain.get(chain, 0),
            "promotions_imported": sum(1 for promo in promotions if promo["store_id"].startswith(f"{chain}:")),
            "started_at": started, "finished_at": int(time.time() * 1000),
        }).execute()
    print(json.dumps({"cities": len(cities), "stores": len(stores), "prices": len(prices), "promotions": len(promotions)}, ensure_ascii=False))


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:  # workflow must surface a clear failure
        print(f"price import failed: {exc}", file=sys.stderr)
        raise
