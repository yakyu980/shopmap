// קטלוג-מוצרים: הבסיס-הסטטי (storeData.js, נתוני-דמה) ממוזג עם
// מוצרים שנוצרו בפועל בשרת (Supabase) — כדי שמוצר חדש שנוסף דרך
// "הוסף מוצר חדש" (אחרי סריקה/זיהוי-תמונה שלא נמצא) יהיה זמין מיד
// לחיפוש/סריקה חוזרת, גם אחרי רענון הדף. pub/sub באותה תבנית כמו
// compareProducts.js/useAuth.js (useSyncExternalStore).

import { PRODUCTS as STATIC_PRODUCTS } from '../data/storeData';
import { api } from './apiClient';

const staticIds = new Set(STATIC_PRODUCTS.map((p) => p.id));
let dynamicProducts = [];
let loaded = false;
const listeners = new Set();

function commit(next) {
  dynamicProducts = next;
  listeners.forEach((listener) => listener());
}

export function subscribeCatalog(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getDynamicProducts() {
  return dynamicProducts;
}

export function getAllProducts() {
  return dynamicProducts.length ? [...STATIC_PRODUCTS, ...dynamicProducts] : STATIC_PRODUCTS;
}

export function getProductByBarcode(code) {
  const trimmed = String(code).trim();
  return (
    dynamicProducts.find((p) => p.barcode === trimmed) ||
    STATIC_PRODUCTS.find((p) => p.barcode === trimmed)
  );
}

// חיפוש לפי תחילית-שם, כמו searchProducts ב-storeData.js — כאן כולל
// גם מוצרים-חדשים-שנוספו.
export function searchCatalog(query) {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return getAllProducts().filter((p) => p.name.toLowerCase().startsWith(q));
}

export async function ensureCatalogLoaded() {
  if (loaded) return;
  loaded = true;
  try {
    const data = await api.get('/products');
    commit((data.products || []).filter((p) => !staticIds.has(p.id)));
  } catch {
    loaded = false; // נכשל (למשל אופליין) — ננסה שוב בפעם הבאה שמישהו קורא ל-ensure
  }
}

export function addProductToCatalog(product) {
  commit([product, ...dynamicProducts.filter((p) => p.id !== product.id)]);
}
