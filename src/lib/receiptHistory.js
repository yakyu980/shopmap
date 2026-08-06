// היסטוריית-קבלות שנסרקו — מיני-store חיצוני (pub/sub), אותו דפוס
// כמו familyMembers.js/storeConfig.js. מקומי-בלבד (localStorage),
// לפי בקשת המשתמש המפורשת — לא נשלח לשרת.

const STORAGE_KEY = 'supernav_receipt_history_v1';

function load() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (Array.isArray(raw)) return raw;
  } catch {
    /* localStorage לא זמין/פגום — נופלים לרשימה ריקה */
  }
  return [];
}

function persist(list) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    /* אחסון מלא/חסום — מתעלמים */
  }
}

let state = load();
const listeners = new Set();

function update(next) {
  state = next;
  persist(state);
  listeners.forEach((fn) => fn());
}

export function getReceipts() {
  return state;
}

export function subscribeReceipts(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** items: [{name, price, discountPercent, matchedProductId}] אחרי עריכת-המשתמש */
export function saveReceipt(items) {
  const receipt = { id: 'r' + Date.now(), date: Date.now(), items };
  update([receipt, ...state]);
  return receipt;
}

export function deleteReceipt(id) {
  update(state.filter((r) => r.id !== id));
}

/** היסטוריית-מחיר אמיתית (לא מוק) למוצר מסוים, מתוך הקבלות שנסרקו בפועל. */
export function getRealPriceHistoryForProduct(productId) {
  const points = [];
  for (const receipt of state) {
    for (const item of receipt.items) {
      if (item.matchedProductId === productId) {
        points.push({ date: receipt.date, price: item.price, discountPercent: item.discountPercent });
      }
    }
  }
  return points.sort((a, b) => a.date - b.date);
}
