// זריעת קטלוג-המוצרים הסטטי (src/data/storeData.js) לטבלת products
// בסופרבייס, פעם אחת בהפעלת-שרת — upsert לפי id כדי שלא לדרוס עדכוני
// מחיר/מיקום שכבר נשמרו בטבלה (products.js) בהרצות קודמות.
import { supabase } from './supabaseClient.js';
import { PRODUCTS } from '../src/data/storeData.js';

export async function seedProducts() {
  const { data: existing, error: countErr } = await supabase.from('products').select('id');
  if (countErr) throw countErr;
  const existingIds = new Set((existing || []).map((p) => p.id));
  const missing = PRODUCTS.filter((p) => !existingIds.has(p.id)).map((p) => ({
    id: p.id,
    name: p.name,
    barcode: p.barcode,
    department: p.department,
    shelf: p.shelf,
    zone: p.zone,
    price: p.price,
    category: p.category,
    sale_percent: p.salePercent || null,
    updated_at: Date.now(),
  }));
  if (missing.length === 0) return;
  const { error } = await supabase.from('products').insert(missing);
  if (error) throw error;
  console.log(`SuperNav AI: seeded ${missing.length} products into Supabase`);
}
