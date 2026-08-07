// מסד-נתונים קליל מבוסס-קובץ (JSON) — לא SQLite/Postgres, החלטת-סקופ
// מכוונת כדי להימנע מסיכון build של מודול-native בסביבת-סנדבוקס. זה
// עדיין שרת-HTTP-אמיתי עם זיכרון-משותף-בין-כל-המשתמשים (לא
// localStorage-בתחפושת) — רק מנוע-האחסון פשוט. לכתיבה נעשה
// fs.writeFileSync סינכרוני אחרי כל שינוי; מספיק לקנה-מידה-של-הדגמה.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PRODUCTS } from '../src/data/storeData.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_FILE = path.join(__dirname, 'data.json');

function seedProducts() {
  return PRODUCTS.map((p) => ({
    id: p.id,
    name: p.name,
    barcode: p.barcode,
    department: p.department,
    shelf: p.shelf,
    zone: p.zone,
    price: p.price,
    category: p.category,
    salePercent: p.salePercent || null,
    updatedAt: Date.now(),
  }));
}

function emptyDb() {
  return {
    users: [],
    households: [],
    sessions: [],
    products: seedProducts(),
    priceHistory: [],
    locationHistory: [],
    verifications: {}, // productId -> {confirmed, notFound}
    venues: [], // {id, householdId, chainName, branchName, storeType, address, createdBy, createdAt}
    trips: [], // {id, householdId, venueId, status, createdBy, createdAt, items: [...]}
    priceObservations: [], // {id, householdId, userId, venueId, items:[...], purchasedAt, createdAt}
    officialPrices: [], // {barcode, venueId, name, price, importedAt} — snapshot מיובא-CSV, לא audit-log
  };
}

let db;
try {
  db = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
} catch {
  db = emptyDb();
}

export function save() {
  fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2));
}

export function getDb() {
  return db;
}

export function resetDb() {
  db = emptyDb();
  save();
  return db;
}
