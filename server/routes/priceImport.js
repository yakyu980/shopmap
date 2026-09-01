import { Router } from 'express';
import { supabase, h } from '../supabaseClient.js';
import { requireAuth } from '../auth.js';
import { pricesForBarcode, searchProducts } from '../priceData.js';

const router = Router();

// מחירים-רשמיים מיובאים (לא קבלה אישית, לא feed חי) — המשתמש הריץ
// בעצמו כלי-קוד-פתוח קיים (ר' CLAUDE.md) שמפענח את קובצי-ה-XML
// הרשמיים של הרשתות ומייצא CSV מנורמל; כאן רק שומרים את התוצאה,
// keyed by barcode+venueId — "current price snapshot", לא audit-log
// (בניגוד ל-priceObservations שהוא היסטוריית-קניות-אמיתית).
router.post(
  '/',
  requireAuth,
  h(async (req, res) => {
    const { venueId, rows } = req.body || {};
    if (!venueId || !Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ error: 'venueId/rows נדרשים' });
    }
    if (rows.length > 20000) {
      return res.status(400).json({ error: 'קובץ גדול מדי (מעל 20,000 שורות) — פצלו לכמה ייבואים' });
    }

    const { data: venue } = await supabase
      .from('venues')
      .select('id')
      .eq('id', venueId)
      .eq('household_id', req.household.id)
      .maybeSingle();
    if (!venue) return res.status(404).json({ error: 'venue לא נמצא' });

    const validRows = rows.filter(
      (row) => row?.barcode && row?.name && typeof row.price === 'number' && row.price > 0
    );
    const importedAt = Date.now();
    const upsertRows = validRows.map((row) => ({
      barcode: row.barcode,
      venue_id: venueId,
      name: row.name,
      price: row.price,
      imported_at: importedAt,
    }));

    // upsert לפי (barcode, venue_id) — טבלה שיש עליה unique constraint,
    // ר' supabase-schema.sql, אותה סמנטיקה בדיוק כמו "עדכן אם קיים,
    // הוסף אם לא" שהייתה בקובץ ה-JSON הישן.
    if (upsertRows.length > 0) {
      const { error } = await supabase.from('official_prices').upsert(upsertRows, { onConflict: 'barcode,venue_id' });
      if (error) throw error;
    }
    res.json({ imported: upsertRows.length, total: rows.length });
  })
);

// חיפוש-חופשי בקטלוג המחירים-הרשמיים (לא לפי ברקוד מדויק) — לצורך
// הוספת מוצר להשוואה-מרובה לפי שם. מקבץ לפי ברקוד ומחזיר לכל מוצר
// את שם-התצוגה (מהייבוא האחרון), מספר-הסניפים עם מחיר, והמחיר הזול
// ביותר שנצפה — לא ממוצע, כדי לא להטעות לגבי "הכי משתלם".
router.get(
  '/catalog/search',
  requireAuth,
  h(async (req, res) => {
    const q = (req.query.q || '').trim().toLowerCase();
    if (q.length < 2) return res.json({ products: [] });

    const official = await searchProducts(req.household.id, q);
    if (official.products.length > 0 || official.cityCode) return res.json(official);

    const { data: matches, error } = await supabase.from('official_prices').select('*').ilike('name', `%${q}%`);
    if (error) throw error;

    const byBarcode = new Map();
    for (const row of matches || []) {
      const existing = byBarcode.get(row.barcode);
      if (!existing || row.imported_at > existing.importedAt) {
        byBarcode.set(row.barcode, { barcode: row.barcode, name: row.name, importedAt: row.imported_at });
      }
    }
    const products = [];
    for (const { barcode, name } of byBarcode.values()) {
      const { data: allForBarcode } = await supabase.from('official_prices').select('price').eq('barcode', barcode);
      const prices = (allForBarcode || []).map((p) => p.price);
      products.push({ barcode, name, minPrice: Math.min(...prices), venueCount: prices.length });
      if (products.length >= 20) break;
    }
    res.json({ products });
  })
);

router.get(
  '/:barcode',
  requireAuth,
  h(async (req, res) => {
    const official = await pricesForBarcode(req.household.id, req.params.barcode);
    if (official.rows.length > 0 || official.cityCode) return res.json(official);

    const [{ data: rows, error: rowsErr }, { data: venues, error: venuesErr }] = await Promise.all([
      supabase.from('official_prices').select('*').eq('barcode', req.params.barcode),
      supabase.from('venues').select('*'),
    ]);
    if (rowsErr) throw rowsErr;
    if (venuesErr) throw venuesErr;
    const venueById = new Map((venues || []).map((v) => [v.id, v]));
    const result = (rows || []).map((p) => {
      const v = venueById.get(p.venue_id);
      const importedAt = Number(p.imported_at);
      return {
        barcode: p.barcode,
        venueId: p.venue_id,
        name: p.name,
        price: p.price,
        importedAt,
        sourceUpdatedAt: importedAt,
        stale: Date.now() - importedAt > 36 * 60 * 60 * 1000,
        venueName: v ? `${v.chain_name} · ${v.branch_name}` : 'חנות לא ידועה',
      };
    });
    res.json({ rows: result });
  })
);

export default router;
