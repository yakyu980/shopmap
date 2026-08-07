// Open Food Facts — מסד-נתונים גלובלי חינמי וללא-מפתח-API לזיהוי
// מוצר-אמיתי לפי ברקוד (EAN/UPC אמיתי, לא רשימת-הדוגמה שלנו).
// https://world.openfoodfacts.org — ללא-אימות, GET פשוט.
// ⚠️ חשוב: זו זהות-מוצר גלובלית בלבד (שם/מותג/תמונה) — אין לה שום
// מושג של המחיר/מיקום-על-המדף בסניף *שלנו* (זה קיים רק בקטלוג
// המקומי). לכן זה תמיד fallback-לזיהוי בלבד, לא תחליף לקטלוג.
const BASE = 'https://world.openfoodfacts.org/api/v2/product';

export async function lookupBarcodeExternal(barcode) {
  const res = await fetch(`${BASE}/${encodeURIComponent(barcode)}.json`);
  if (!res.ok) return null;
  const data = await res.json();
  if (data.status !== 1 || !data.product) return null;
  const p = data.product;
  const name = p.product_name_he || p.product_name || null;
  if (!name) return null;
  return {
    barcode,
    name,
    brand: p.brands || '',
    imageUrl: p.image_front_small_url || p.image_url || null,
  };
}
