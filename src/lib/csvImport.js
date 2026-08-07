// פענוח-CSV אמיתי (Papa Parse — ספרייה חינמית ומוכרת, לא parser
// תפור-בבית) של קובץ מחירים-רשמיים שהמשתמש ייצר בעצמו מחוץ לסביבה
// הזו, ע"י כלי-קוד-פתוח קיים (למשל israeli-supermarket-scraper /
// israeli-supermarket-parsers) שכבר פותר את הבעיה המסובכת של פענוח
// קבצי-XML-רשמיים-של-הרשתות (סכמות שונות בין רשתות) — לא בונים את
// זה מחדש כאן. עמודות מזוהות בגמישות (עברית/אנגלית, לא-תלוי-רישיות).

import Papa from 'papaparse';

const BARCODE_KEYS = ['barcode', 'itemcode', 'ברקוד', 'קוד פריט', 'קוד-פריט'];
const NAME_KEYS = ['name', 'itemname', 'שם', 'שם מוצר', 'שם-מוצר'];
const PRICE_KEYS = ['price', 'itemprice', 'מחיר'];

function findKey(row, candidates) {
  const keys = Object.keys(row);
  for (const c of candidates) {
    const found = keys.find((k) => k.trim().toLowerCase() === c);
    if (found) return found;
  }
  return null;
}

/** מחזיר {rows: [{barcode,name,price}], errors: [string]} */
export function parseOfficialPriceCsv(csvText) {
  const parsed = Papa.parse(csvText.trim(), { header: true, skipEmptyLines: true });
  if (!parsed.data.length) return { rows: [], errors: ['הקובץ ריק'] };

  const first = parsed.data[0];
  const barcodeKey = findKey(first, BARCODE_KEYS);
  const nameKey = findKey(first, NAME_KEYS);
  const priceKey = findKey(first, PRICE_KEYS);
  if (!barcodeKey || !nameKey || !priceKey) {
    return {
      rows: [],
      errors: [`לא זוהו עמודות barcode/name/price בקובץ (עמודות שנמצאו: ${Object.keys(first).join(', ')})`],
    };
  }

  const rows = [];
  const errors = [];
  for (const raw of parsed.data) {
    const barcode = String(raw[barcodeKey] || '').trim();
    const name = String(raw[nameKey] || '').trim();
    const price = parseFloat(raw[priceKey]);
    if (!barcode || !name || !(price > 0)) {
      errors.push(`שורה לא-תקינה דולגה: ${JSON.stringify(raw)}`);
      continue;
    }
    rows.push({ barcode, name, price });
  }
  return { rows, errors };
}
