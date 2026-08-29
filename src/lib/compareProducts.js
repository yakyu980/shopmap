// רשימת-המוצרים המושווים בלשונית "השוואת מחירים" — mini-store חיצוני
// (pub/sub), כדי שגם MultiProductCompare (למעלה בעמוד) וגם רשימות-
// הקטלוג הרגילות (PriceComparison) יוכלו להוסיף אליה מוצר באותה
// דרך: לחיצה על מוצר בקטלוג מוסיפה אותו ישירות להשוואה, לא פותחת
// חלון-פרטים נפרד.

const STORAGE_KEY = 'supernav_price_comparison_products_v1';

function loadSaved() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return Array.isArray(saved) ? saved.filter((product) => product?.barcode && product?.name).slice(0, 20) : [];
  } catch {
    return [];
  }
}

let products = loadSaved();
const listeners = new Set();

function commit(next) {
  products = next;
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(products)); } catch { /* storage unavailable */ }
  listeners.forEach((listener) => listener());
}

export function subscribeCompareProducts(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getCompareProducts() {
  return products;
}

export function addCompareProduct(product) {
  if (!product?.barcode || !product?.name) return;
  if (products.some((item) => item.barcode === product.barcode)) return;
  commit([...products, product]);
}

export function removeCompareProduct(barcode) {
  commit(products.filter((product) => product.barcode !== barcode));
}

export function clearCompareProducts() {
  commit([]);
}
