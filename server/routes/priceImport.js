import { Router } from 'express';
import { getDb, save } from '../db.js';
import { requireAuth } from '../auth.js';

const router = Router();

// מחירים-רשמיים מיובאים (לא קבלה אישית, לא feed חי) — המשתמש הריץ
// בעצמו כלי-קוד-פתוח קיים (ר' CLAUDE.md) שמפענח את קובצי-ה-XML
// הרשמיים של הרשתות ומייצא CSV מנורמל; כאן רק שומרים את התוצאה,
// keyed by barcode+venueId — "current price snapshot", לא audit-log
// (בניגוד ל-priceObservations שהוא היסטוריית-קניות-אמיתית).
router.post('/', requireAuth, (req, res) => {
  const { venueId, rows } = req.body || {};
  if (!venueId || !Array.isArray(rows) || rows.length === 0) {
    return res.status(400).json({ error: 'venueId/rows נדרשים' });
  }
  if (rows.length > 20000) {
    return res.status(400).json({ error: 'קובץ גדול מדי (מעל 20,000 שורות) — פצלו לכמה ייבואים' });
  }

  const db = getDb();
  const venue = db.venues.find((v) => v.id === venueId && v.householdId === req.household.id);
  if (!venue) return res.status(404).json({ error: 'venue לא נמצא' });

  let imported = 0;
  for (const row of rows) {
    const { barcode, name, price } = row || {};
    if (!barcode || !name || typeof price !== 'number' || !(price > 0)) continue;
    const existing = db.officialPrices.find((p) => p.barcode === barcode && p.venueId === venueId);
    if (existing) {
      existing.name = name;
      existing.price = price;
      existing.importedAt = Date.now();
    } else {
      db.officialPrices.push({ barcode, venueId, name, price, importedAt: Date.now() });
    }
    imported += 1;
  }
  save();
  res.json({ imported, total: rows.length });
});

// חיפוש-חופשי בקטלוג המחירים-הרשמיים (לא לפי ברקוד מדויק) — לצורך
// הוספת מוצר להשוואה-מרובה לפי שם. מקבץ לפי ברקוד ומחזיר לכל מוצר
// את שם-התצוגה (מהייבוא האחרון), מספר-הסניפים עם מחיר, והמחיר הזול
// ביותר שנצפה — לא ממוצע, כדי לא להטעות לגבי "הכי משתלם".
router.get('/catalog/search', requireAuth, (req, res) => {
  const q = (req.query.q || '').trim().toLowerCase();
  if (q.length < 2) return res.json({ products: [] });

  const db = getDb();
  const byBarcode = new Map();
  for (const row of db.officialPrices) {
    if (!row.name.toLowerCase().includes(q)) continue;
    const existing = byBarcode.get(row.barcode);
    if (!existing || row.importedAt > existing.importedAt) {
      byBarcode.set(row.barcode, { barcode: row.barcode, name: row.name, importedAt: row.importedAt });
    }
  }
  const products = [...byBarcode.values()]
    .map(({ barcode, name }) => {
      const prices = db.officialPrices.filter((p) => p.barcode === barcode).map((p) => p.price);
      return { barcode, name, minPrice: Math.min(...prices), venueCount: prices.length };
    })
    .slice(0, 20);
  res.json({ products });
});

router.get('/:barcode', requireAuth, (req, res) => {
  const db = getDb();
  const venueById = new Map(db.venues.map((v) => [v.id, v]));
  const rows = db.officialPrices
    .filter((p) => p.barcode === req.params.barcode)
    .map((p) => ({
      ...p,
      venueName: venueById.get(p.venueId) ? `${venueById.get(p.venueId).chainName} · ${venueById.get(p.venueId).branchName}` : 'חנות לא ידועה',
    }));
  res.json({ rows });
});

export default router;
