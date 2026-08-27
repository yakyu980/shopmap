// Open Food Facts — מסד-נתונים גלובלי חינמי וללא-מפתח-API לזיהוי
// מוצר-אמיתי לפי ברקוד (EAN/UPC אמיתי, לא רשימת-הדוגמה שלנו).
// https://world.openfoodfacts.org — ללא-אימות, GET פשוט.
// ⚠️ חשוב: זו זהות-מוצר גלובלית בלבד (שם/מותג/תמונה) — אין לה שום
// מושג של המחיר/מיקום-על-המדף בסניף *שלנו* (זה קיים רק בקטלוג
// המקומי). לכן זה תמיד fallback-לזיהוי בלבד, לא תחליף לקטלוג.
const BASE = 'https://world.openfoodfacts.org/api/v2/product';
const SEARCH_BASE = 'https://world.openfoodfacts.org/cgi/search.pl';

// מטמון-זכרון (session בלבד, לא persistent) כדי לא לשלוח בקשה חוזרת
// לאותו שם-מוצר בכל render — ר' ProductImage.jsx.
const imageCache = new Map();

/**
 * מחפש תמונת-מוצר אמיתית ב-Open Food Facts לפי *שם* (לא ברקוד) — כי
 * קטלוג-הדוגמה שלנו משתמש בברקודי-דמה שלא קיימים במאגר האמיתי. עשוי
 * להחזיר null (לא נמצא / שגיאת-רשת) — תמיד עם fallback לאייקון-
 * מחלקה, ר' ProductImage.jsx.
 */
export async function lookupProductImageByName(name) {
  if (imageCache.has(name)) return imageCache.get(name);
  const promise = (async () => {
    try {
      const url = `${SEARCH_BASE}?search_terms=${encodeURIComponent(name)}&search_simple=1&action=process&json=1&page_size=1`;
      const res = await fetch(url);
      if (!res.ok) return null;
      const data = await res.json();
      const p = data.products?.[0];
      return p?.image_front_small_url || p?.image_url || null;
    } catch {
      return null;
    }
  })();
  imageCache.set(name, promise);
  return promise;
}

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
