// חיפוש תמונת-מוצר לפי *שם* מול Open Food Facts — משמש רק כשאין לנו
// כבר imageUrl מדויק (מהתאמת-ברקוד). ⚠️ חיפוש-שם יכול להחזיר מוצר
// לא-קשור מהמאגר הגלובלי (למשל "עגבניות" עלול להחזיר רוטב-עגבניות
// ממותג) — התמונה עלולה להיות לא-מדויקת. cache מודול-גלובלי כדי לא
// לשלוח את אותה בקשה פעמיים לאותו שם על פני רכיבים/רינדורים שונים.
const cache = new Map(); // name -> Promise<string|null>

export function lookupProductPhotoByName(name) {
  const key = name.trim().toLowerCase();
  if (!key) return Promise.resolve(null);
  if (cache.has(key)) return cache.get(key);

  const url =
    'https://world.openfoodfacts.org/cgi/search.pl?json=1&page_size=1&fields=image_front_small_url,image_url&search_terms=' +
    encodeURIComponent(name);
  const promise = fetch(url)
    .then((res) => (res.ok ? res.json() : null))
    .then((data) => {
      const product = data?.products?.[0];
      return product?.image_front_small_url || product?.image_url || null;
    })
    .catch(() => null);
  cache.set(key, promise);
  return promise;
}
