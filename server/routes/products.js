import { Router } from 'express';
import { supabase, h } from '../supabaseClient.js';
import { requireAuth } from '../auth.js';

const router = Router();

function toProduct(row, verification) {
  return {
    id: row.id,
    name: row.name,
    barcode: row.barcode,
    department: row.department,
    shelf: row.shelf,
    zone: row.zone,
    price: row.price,
    category: row.category,
    salePercent: row.sale_percent || null,
    imageUrl: row.image_url || null,
    updatedAt: row.updated_at,
    verification,
  };
}

function toVerification(row) {
  const confirmed = row?.confirmed || 0;
  const notFound = row?.not_found || 0;
  return { confirmed, notFound, flagged: notFound - confirmed >= 3 };
}

// פתוח בלי טוקן — הקטלוג נגיש מיד גם למי שלא התחבר.
router.get(
  '/',
  h(async (req, res) => {
    const [{ data: products, error: prodErr }, { data: verifications, error: verErr }] = await Promise.all([
      supabase.from('products').select('*'),
      supabase.from('verifications').select('*'),
    ]);
    if (prodErr) throw prodErr;
    if (verErr) throw verErr;
    const verByProduct = new Map((verifications || []).map((v) => [v.product_id, v]));
    res.json({ products: (products || []).map((p) => toProduct(p, toVerification(verByProduct.get(p.id)))) });
  })
);

// יצירת מוצר חדש בקטלוג — למשל אחרי סריקת ברקוד/זיהוי-תמונה שלא
// נמצא אצלנו. priceSource מתועד רק לתצוגה בצד-לקוח (לא נשמר כאן):
// 'official' אם המחיר הגיע מ-official_prices (חוק שקיפות-מחירים),
// 'manual' אם המשתמש הקליד אותו בעצמו.
router.post(
  '/',
  requireAuth,
  h(async (req, res) => {
    const { name, barcode, department, shelf, zone, price, category, imageDataUrl } = req.body || {};
    if (!name || typeof price !== 'number' || price < 0) {
      return res.status(400).json({ error: 'שם מוצר נדרש; מחיר חייב להיות מספר שאינו שלילי' });
    }
    if (imageDataUrl && imageDataUrl.length > 1_500_000) {
      return res.status(400).json({ error: 'תמונה גדולה מדי' });
    }
    const row = {
      id: 'p' + Date.now() + Math.round(Math.random() * 1000),
      name: String(name).slice(0, 120),
      barcode: barcode ? String(barcode).slice(0, 40) : null,
      department: department || 'other',
      shelf: shelf || 1,
      zone: zone || 1,
      price,
      category: category || null,
      image_url: imageDataUrl || null,
      updated_at: Date.now(),
    };
    const { data: created, error } = await supabase.from('products').insert(row).select().single();
    if (error) throw error;
    res.json({ product: toProduct(created) });
  })
);

router.get(
  '/:id/price-history',
  h(async (req, res) => {
    const { data, error } = await supabase
      .from('price_history')
      .select('*')
      .eq('product_id', req.params.id)
      .order('created_at', { ascending: true });
    if (error) throw error;
    res.json({
      history: (data || []).map((r) => ({
        id: r.id,
        productId: r.product_id,
        price: r.price,
        salePercent: r.sale_percent,
        changedBy: r.changed_by,
        createdAt: r.created_at,
        note: r.note,
      })),
    });
  })
);

router.get(
  '/:id/location-history',
  h(async (req, res) => {
    const { data, error } = await supabase
      .from('location_history')
      .select('*')
      .eq('product_id', req.params.id)
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json({
      history: (data || []).map((r) => ({
        id: r.id,
        productId: r.product_id,
        department: r.department,
        shelf: r.shelf,
        zone: r.zone,
        changedBy: r.changed_by,
        createdAt: r.created_at,
        note: r.note,
      })),
    });
  })
);

router.post(
  '/:id/location',
  requireAuth,
  h(async (req, res) => {
    const { data: product } = await supabase.from('products').select('*').eq('id', req.params.id).maybeSingle();
    if (!product) return res.status(404).json({ error: 'מוצר לא נמצא' });

    const { departmentId, shelf, zone } = req.body || {};
    if (!departmentId || !shelf || !zone) {
      return res.status(400).json({ error: 'departmentId/shelf/zone נדרשים' });
    }

    await supabase.from('location_history').insert({
      id: 'lh' + Date.now(),
      product_id: product.id,
      department: product.department,
      shelf: product.shelf,
      zone: product.zone,
      changed_by: req.user.username,
      created_at: Date.now(),
      note: 'מיקום-קודם, לפני העדכון הזה',
    });

    const { data: updated, error } = await supabase
      .from('products')
      .update({ department: departmentId, shelf, zone, updated_at: Date.now() })
      .eq('id', product.id)
      .select()
      .single();
    if (error) throw error;
    res.json({ product: toProduct(updated) });
  })
);

router.post(
  '/:id/verify',
  requireAuth,
  h(async (req, res) => {
    const { data: product } = await supabase.from('products').select('id').eq('id', req.params.id).maybeSingle();
    if (!product) return res.status(404).json({ error: 'מוצר לא נמצא' });

    const { data: existing } = await supabase
      .from('verifications')
      .select('*')
      .eq('product_id', product.id)
      .maybeSingle();
    const next = {
      product_id: product.id,
      confirmed: (existing?.confirmed || 0) + (req.body?.found ? 1 : 0),
      not_found: (existing?.not_found || 0) + (req.body?.found ? 0 : 1),
    };
    const { error } = await supabase.from('verifications').upsert(next, { onConflict: 'product_id' });
    if (error) throw error;
    res.json({ verification: toVerification(next) });
  })
);

// בהדגמה כל משתמש-מחובר יכול לעדכן מחיר; במוצר-אמיתי זה יוגבל
// למנהל-חנות (דורש מודל-הרשאות שאין בהיקף הזה) — מתועד גם ב-UI.
router.post(
  '/:id/price',
  requireAuth,
  h(async (req, res) => {
    const { data: product } = await supabase.from('products').select('*').eq('id', req.params.id).maybeSingle();
    if (!product) return res.status(404).json({ error: 'מוצר לא נמצא' });

    const { price, salePercent } = req.body || {};
    if (typeof price !== 'number' || price <= 0) {
      return res.status(400).json({ error: 'price חייב להיות מספר חיובי' });
    }

    await supabase.from('price_history').insert({
      id: 'ph' + Date.now(),
      product_id: product.id,
      price: product.price,
      sale_percent: product.sale_percent,
      changed_by: req.user.username,
      created_at: Date.now(),
      note: 'מחיר-קודם, לפני העדכון הזה',
    });

    const { data: updated, error } = await supabase
      .from('products')
      .update({ price, sale_percent: salePercent || null, updated_at: Date.now() })
      .eq('id', product.id)
      .select()
      .single();
    if (error) throw error;
    res.json({ product: toProduct(updated) });
  })
);

export default router;
