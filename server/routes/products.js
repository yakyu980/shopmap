import { Router } from 'express';
import { getDb, save } from '../db.js';
import { requireAuth } from '../auth.js';

const router = Router();

function getVerification(db, productId) {
  const rec = db.verifications[productId] || { confirmed: 0, notFound: 0 };
  return { ...rec, flagged: rec.notFound - rec.confirmed >= 3 };
}

// פתוח בלי טוקן — הקטלוג נגיש מיד גם למי שלא התחבר.
router.get('/', (req, res) => {
  const db = getDb();
  const products = db.products.map((p) => ({ ...p, verification: getVerification(db, p.id) }));
  res.json({ products });
});

router.get('/:id/price-history', (req, res) => {
  const db = getDb();
  const history = db.priceHistory
    .filter((h) => h.productId === req.params.id)
    .sort((a, b) => a.createdAt - b.createdAt);
  res.json({ history });
});

router.get('/:id/location-history', (req, res) => {
  const db = getDb();
  const history = db.locationHistory
    .filter((h) => h.productId === req.params.id)
    .sort((a, b) => b.createdAt - a.createdAt);
  res.json({ history });
});

router.post('/:id/location', requireAuth, (req, res) => {
  const db = getDb();
  const product = db.products.find((p) => p.id === req.params.id);
  if (!product) return res.status(404).json({ error: 'מוצר לא נמצא' });

  const { departmentId, shelf, zone } = req.body || {};
  if (!departmentId || !shelf || !zone) {
    return res.status(400).json({ error: 'departmentId/shelf/zone נדרשים' });
  }

  db.locationHistory.push({
    id: 'lh' + Date.now(),
    productId: product.id,
    department: product.department,
    shelf: product.shelf,
    zone: product.zone,
    changedBy: req.user.username,
    createdAt: Date.now(),
    note: 'מיקום-קודם, לפני העדכון הזה',
  });

  product.department = departmentId;
  product.shelf = shelf;
  product.zone = zone;
  product.updatedAt = Date.now();
  save();
  res.json({ product });
});

router.post('/:id/verify', requireAuth, (req, res) => {
  const db = getDb();
  const product = db.products.find((p) => p.id === req.params.id);
  if (!product) return res.status(404).json({ error: 'מוצר לא נמצא' });

  const rec = db.verifications[product.id] || { confirmed: 0, notFound: 0 };
  if (req.body?.found) rec.confirmed += 1;
  else rec.notFound += 1;
  db.verifications[product.id] = rec;
  save();
  res.json({ verification: getVerification(db, product.id) });
});

// בהדגמה כל משתמש-מחובר יכול לעדכן מחיר; במוצר-אמיתי זה יוגבל
// למנהל-חנות (דורש מודל-הרשאות שאין בהיקף הזה) — מתועד גם ב-UI.
router.post('/:id/price', requireAuth, (req, res) => {
  const db = getDb();
  const product = db.products.find((p) => p.id === req.params.id);
  if (!product) return res.status(404).json({ error: 'מוצר לא נמצא' });

  const { price, salePercent } = req.body || {};
  if (typeof price !== 'number' || price <= 0) {
    return res.status(400).json({ error: 'price חייב להיות מספר חיובי' });
  }

  db.priceHistory.push({
    id: 'ph' + Date.now(),
    productId: product.id,
    price: product.price,
    salePercent: product.salePercent,
    changedBy: req.user.username,
    createdAt: Date.now(),
    note: 'מחיר-קודם, לפני העדכון הזה',
  });

  product.price = price;
  product.salePercent = salePercent || null;
  product.updatedAt = Date.now();
  save();
  res.json({ product });
});

export default router;
