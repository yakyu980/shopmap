// היסטוריית-קבלות שנסרקו — מיני-store חיצוני (pub/sub), אותו דפוס
// כמו familyMembers.js/storeConfig.js. תמיד נשמר מקומית (localStorage);
// כשמחוברים *וגם* צוינה חנות, השורות המפוענחות (לא התמונה) משותפות
// גם לשרת (ר' ReceiptScanner.jsx + server/routes/priceObservations.js)
// לצורך השוואה חוצת-חנויות. `venueId` על הקבלה מסמן שהיא כבר-מיוצגת
// שם — כדי ש-getRealPriceHistoryForProduct לא יציג אותה פעם-נוספת
// כשורה מקומית-סתמית לצד השורה-המתויגת מהשרת (ר' ProductDetail.jsx).

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

/**
 * items: [{name, price, discountPercent, matchedProductId}] אחרי עריכת-המשתמש.
 * venueId: מועבר רק אם השורות *כבר* שותפו בהצלחה לשרת עם אותה חנות —
 * ראה ReceiptScanner.jsx (null כשלא-מחוברים/לא-נבחרה-חנות/השרת נכשל).
 */
export function saveReceipt(items, venueId = null) {
  const receipt = { id: 'r' + Date.now(), date: Date.now(), items, venueId };
  update([receipt, ...state]);
  return receipt;
}

export function deleteReceipt(id) {
  update(state.filter((r) => r.id !== id));
}

/**
 * היסטוריית-מחיר אמיתית (לא מוק) למוצר מסוים, מתוך הקבלות שנסרקו
 * בפועל — רק קבלות *בלי* venueId (קבלות מתויגות-חנות כבר מיוצגות
 * ע"י שורות-השרת המתויגות ב-ProductDetail, ר' compareAcrossVenues).
 */
export function getRealPriceHistoryForProduct(productId) {
  const points = [];
  for (const receipt of state) {
    if (receipt.venueId) continue;
    for (const item of receipt.items) {
      if (item.matchedProductId === productId) {
        points.push({ date: receipt.date, price: item.price, discountPercent: item.discountPercent });
      }
    }
  }
  return points.sort((a, b) => a.date - b.date);
}
