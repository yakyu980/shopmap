import { Router } from 'express';
import { getDb } from '../db.js';
import { requireAuth } from '../auth.js';
import { PRODUCTS } from '../../src/data/storeData.js';

const router = Router();

function venueLabel(venueById, venueId) {
  const v = venueById.get(venueId);
  return v ? `${v.chainName} · ${v.branchName}` : 'חנות לא ידועה';
}

// "דילים בין רשתות" — מאגד officialPrices (ייבוא-CSV, household-scoped
// דרך venues) ו-priceObservations (קבלות-שנסרקו, household-scoped
// ישירות) לפי ברקוד, ומחזיר רק מוצרים שכבר יש להם נתונים מ-2+ venues
// שונים בפועל. אין feed חי — זה תמיד מבוסס-על-מה-שהמשתמש-כבר-הזין,
// ר' CLAUDE.md §16. לא-household-scoped ל-officialPrices עצמו (אין
// שם householdId) — הסינון עובר דרך רשימת ה-venues של ה-household.
router.get('/', requireAuth, (req, res) => {
  const db = getDb();
  const myVenueIds = new Set(db.venues.filter((v) => v.householdId === req.household.id).map((v) => v.id));
  const venueById = new Map(db.venues.map((v) => [v.id, v]));
  const productByBarcode = new Map(PRODUCTS.map((p) => [p.barcode, p]));

  // barcode -> [{price, venueId, venueName}]
  const byBarcode = new Map();

  for (const p of db.officialPrices) {
    if (!myVenueIds.has(p.venueId)) continue;
    if (!byBarcode.has(p.barcode)) byBarcode.set(p.barcode, []);
    byBarcode.get(p.barcode).push({ price: p.price, venueId: p.venueId, venueName: venueLabel(venueById, p.venueId) });
  }

  for (const obs of db.priceObservations) {
    if (obs.householdId !== req.household.id) continue;
    for (const item of obs.items) {
      if (!item.matchedProductId) continue;
      const product = PRODUCTS.find((p) => p.id === item.matchedProductId);
      if (!product) continue;
      if (!byBarcode.has(product.barcode)) byBarcode.set(product.barcode, []);
      byBarcode.get(product.barcode).push({
        price: item.price,
        venueId: obs.venueId,
        venueName: venueLabel(venueById, obs.venueId),
      });
    }
  }

  const deals = [];
  for (const [barcode, rows] of byBarcode) {
    const distinctVenues = new Set(rows.map((r) => r.venueId));
    if (distinctVenues.size < 2) continue; // צריך השוואה אמיתית בין 2+ מקומות, לא נקודת-נתון בודדת
    const product = productByBarcode.get(barcode);
    if (!product) continue;
    const sorted = [...rows].sort((a, b) => a.price - b.price);
    const cheapest = sorted[0];
    const priciest = sorted[sorted.length - 1];
    deals.push({
      productId: product.id,
      barcode: product.barcode,
      name: product.name,
      cheapest: { price: cheapest.price, venueName: cheapest.venueName },
      priciest: { price: priciest.price, venueName: priciest.venueName },
      diffPercent: priciest.price > 0 ? Math.round(((priciest.price - cheapest.price) / priciest.price) * 100) : 0,
      // כל השורות (לא רק זול/יקר ביותר) — כדי לאפשר סינון לפי רשת/סניף
      // בצד-הלקוח (ר' src/components/DealsTab.jsx) בלי לפגוע בהתנהגות
      // הקיימת של השדות למעלה.
      rows: sorted.map((r) => ({ price: r.price, venueName: r.venueName })),
    });
  }

  deals.sort((a, b) => b.diffPercent - a.diffPercent);
  res.json({ deals });
});

export default router;
