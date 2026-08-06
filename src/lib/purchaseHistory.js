// היסטוריית-רכישות מקומית (localStorage) — משמשת לחיזוי "כנראה נגמר
// לך X" לפי מרווחי-רכישה חוזרים אמיתיים (לא ניחוש/AI). מוצר שנרכש
// פעם אחת בלבד לא מקבל תחזית — אין מספיק נתונים.
//
// computePredictions טהורה (entries-in, predictions-out) כדי שאפשר
// יהיה לבדוק אותה ישירות בלי דפדפן/localStorage; getPredictions היא
// העטיפה שקוראת מה-storage האמיתי.

const STORAGE_KEY = 'supernav_purchase_history_v1';
const MAX_ENTRIES = 200;
const MIN_PURCHASES_FOR_PREDICTION = 2;
const DUE_THRESHOLD = 0.8; // מציעים כשעברו 80% מהמרווח-הממוצע
const DAY_MS = 86_400_000;

function load() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

function save(entries) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(-MAX_ENTRIES)));
  } catch {
    /* אחסון מלא/חסום — מתעלמים */
  }
}

export function recordPurchase(productIds, ts = Date.now()) {
  const entries = load();
  for (const productId of productIds) {
    entries.push({ productId, ts });
  }
  save(entries);
}

/** productLookup: (id) => product|undefined — מוזרק כדי לא ליצור תלות מעגלית ב-storeData.js. */
export function computePredictions(entries, productLookup, now = Date.now()) {
  const byProduct = new Map();
  for (const e of entries) {
    if (!byProduct.has(e.productId)) byProduct.set(e.productId, []);
    byProduct.get(e.productId).push(e.ts);
  }

  const predictions = [];
  for (const [productId, timestamps] of byProduct) {
    if (timestamps.length < MIN_PURCHASES_FOR_PREDICTION) continue;
    const sorted = [...timestamps].sort((a, b) => a - b);
    const intervals = [];
    for (let i = 1; i < sorted.length; i++) intervals.push(sorted[i] - sorted[i - 1]);
    const avgInterval = intervals.reduce((s, v) => s + v, 0) / intervals.length;
    const last = sorted[sorted.length - 1];
    const dueAt = last + avgInterval * DUE_THRESHOLD;
    if (now >= dueAt) {
      const product = productLookup(productId);
      if (product) {
        const daysSince = Math.round((now - last) / DAY_MS);
        predictions.push({ product, daysSince });
      }
    }
  }
  return predictions.sort((a, b) => b.daysSince - a.daysSince);
}

export function getPredictions(productLookup, now = Date.now()) {
  return computePredictions(load(), productLookup, now);
}
