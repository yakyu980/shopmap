const API = 'https://data.gov.il/api/3/action/';
export const SOURCE = {
  name: 'משרד הכלכלה והתעשייה — מחירי מוצרי צריכה בפיקוח',
  url: 'https://data.gov.il/he/datasets/moital/price_controlled_consumer_products',
  licenseUrl: 'https://data.gov.il/he/terms-of-use',
  resourceId: '0a760550-0426-4eb7-acf6-2ee919bf12e7',
};

export function normalizeControlledPrices(records, now = Date.now()) {
  const latest = new Map();
  for (const row of records) {
    const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(row['update date'] || '');
    if (!match || typeof row.product !== 'string' || !row.product.trim()) continue;
    const [, day, month, year] = match;
    const date = Date.UTC(Number(year), Number(month) - 1, Number(day));
    const parsed = new Date(date);
    if (parsed.getUTCFullYear() !== Number(year) || parsed.getUTCDate() !== Number(day) || parsed.getUTCMonth() !== Number(month) - 1 || date > now) continue;
    const maximumPrice = Number(row['consumers price includes VAT']);
    const eilat = row['consumer price in Eilat'];
    const eilatMaximumPrice = eilat == null || eilat === '' ? null : Number(eilat);
    if (!Number.isFinite(maximumPrice) || maximumPrice <= 0) continue;
    const entry = { name: row.product, maximumPrice, eilatMaximumPrice: Number.isFinite(eilatMaximumPrice) && eilatMaximumPrice > 0 ? eilatMaximumPrice : null, effectiveDate: `${year}-${month}-${day}`, kind: 'controlled-maximum' };
    if (!latest.has(entry.name) || entry.effectiveDate > latest.get(entry.name).effectiveDate) latest.set(entry.name, entry);
  }
  return [...latest.values()].sort((a, b) => a.name.localeCompare(b.name, 'he'));
}

let cached;
let pending;
async function readAction(action) {
  const response = await fetch(API + action, { redirect: 'error', signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new Error('מאגר המחירים הממשלתי אינו זמין כרגע');
  const data = await response.json();
  if (!data.success) throw new Error('קריאת המאגר הממשלתי נכשלה');
  return data.result;
}

export async function getControlledPrices() {
  if (cached && Date.now() - cached.fetchedAt < 3600000) return cached;
  if (pending) return pending;
  pending = (async () => {
    const metadata = await readAction('package_show?id=price_controlled_consumer_products');
    if (metadata.private || metadata.isopen !== true || metadata.license_id !== 'other-open' || metadata.license_url || !metadata.resources?.some((r) => r.id === SOURCE.resourceId && r.datastore_active)) {
      throw new Error('רישיון או מבנה המקור השתנה — הייבוא מושהה לבדיקה');
    }
    const records = [];
    for (let offset = 0; offset < 10000; offset += 1000) {
      const page = await readAction(`datastore_search?resource_id=${SOURCE.resourceId}&limit=1000&offset=${offset}`);
      if (!Array.isArray(page.records)) throw new Error('מבנה נתוני הפיקוח השתנה');
      records.push(...page.records);
      if (records.length >= page.total || page.records.length < 1000) {
        const products = normalizeControlledPrices(records);
        if (!products.length) throw new Error('לא נמצאו מחירי פיקוח תקינים');
        cached = { source: SOURCE, products, fetchedAt: Date.now(), sourceUpdatedAt: metadata.metadata_modified };
        return cached;
      }
    }
    throw new Error('מאגר הפיקוח גדול מהגבול המותר לייבוא');
  })();
  try { return await pending; } finally { pending = null; }
}
