import { Router } from 'express';
import { getDb, save } from '../db.js';
import { requireAuth } from '../auth.js';

const router = Router();

// שורות-מחיר שנגזרו מקבלות שהמשתמש עצמו סרק (לא feed-רשמי-חי — ר'
// CLAUDE.md §16 "השוואת-מחירים חוצת-קבלות"). נשלח לשרת *רק* כשהמשתמש
// מחובר ובחר venue מפורש בסקירת-הקבלה; ללא-כך הקבלה נשארת local-only
// (ReceiptScanner.jsx לא קורא לנתיב הזה כלל).
router.post('/', requireAuth, (req, res) => {
  const { venueId, items, purchasedAt } = req.body || {};
  if (!venueId || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'venueId/items נדרשים' });
  }

  const db = getDb();
  const venue = db.venues.find((v) => v.id === venueId && v.householdId === req.household.id);
  if (!venue) return res.status(404).json({ error: 'venue לא נמצא' });

  const observation = {
    id: 'po' + Date.now(),
    householdId: req.household.id,
    userId: req.user.id,
    venueId,
    items: items.map((it) => ({
      name: it.name,
      price: it.price,
      discountPercent: it.discountPercent ?? null,
      matchedProductId: it.matchedProductId || null,
    })),
    purchasedAt: purchasedAt || Date.now(),
    createdAt: Date.now(),
  };
  db.priceObservations.push(observation);
  save();
  res.json({ observation });
});

// כל השורות (מכל בני ה-household) עבור מוצר-קטלוג ספציפי, עם שם-venue
// מצורף — household-scoped, לא חוצה-בתים (מודל-פרטיות פשוט, לא ציבורי).
router.get('/:productId', requireAuth, (req, res) => {
  const db = getDb();
  const venueById = new Map(db.venues.map((v) => [v.id, v]));
  const rows = [];
  for (const obs of db.priceObservations) {
    if (obs.householdId !== req.household.id) continue;
    const venue = venueById.get(obs.venueId);
    for (const it of obs.items) {
      if (it.matchedProductId !== req.params.productId) continue;
      rows.push({
        price: it.price,
        discountPercent: it.discountPercent,
        purchasedAt: obs.purchasedAt,
        venueName: venue ? `${venue.chainName} · ${venue.branchName}` : 'חנות לא ידועה',
      });
    }
  }
  rows.sort((a, b) => a.purchasedAt - b.purchasedAt);
  res.json({ rows });
});

export default router;
