// אימות קהילתי (mock, localStorage) — "נמצא"/"לא נמצא" למיקום מוצר.
// אם notFound עולה משמעותית על confirmed, המיקום מסומן כ"ייתכן שעבר מקום".

const KEY = 'supernav_verification_v1';
const FLAG_THRESHOLD = 3; // notFound - confirmed >= זה => מסומן כחשוד

function load() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || {};
  } catch {
    return {};
  }
}

function save(data) {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    /* אחסון מלא/חסום — מתעלמים, זו רק שכבת mock */
  }
}

export function getVerification(productId) {
  const data = load();
  const rec = data[productId] || { confirmed: 0, notFound: 0 };
  return {
    ...rec,
    flagged: rec.notFound - rec.confirmed >= FLAG_THRESHOLD,
  };
}

export function markFound(productId) {
  const data = load();
  const rec = data[productId] || { confirmed: 0, notFound: 0 };
  rec.confirmed += 1;
  data[productId] = rec;
  save(data);
  return getVerification(productId);
}

export function markNotFound(productId) {
  const data = load();
  const rec = data[productId] || { confirmed: 0, notFound: 0 };
  rec.notFound += 1;
  data[productId] = rec;
  save(data);
  return getVerification(productId);
}
