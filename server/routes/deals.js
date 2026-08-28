import { Router } from 'express';
import { supabase, h } from '../supabaseClient.js';
import { requireAuth } from '../auth.js';

const router = Router();

function venueLabel(venueById, venueId) {
  const v = venueById.get(venueId);
  return v ? `${v.chain_name} · ${v.branch_name}` : 'חנות לא ידועה';
}

// "דילים בין רשתות" — מאגד official_prices (ייבוא-CSV, household-scoped
// דרך venues) ו-price_observations (קבלות-שנסרקו, household-scoped
// ישירות) לפי ברקוד, ומחזיר רק מוצרים שכבר יש להם נתונים מ-2+ venues
// שונים בפועל. אין feed חי — זה תמיד מבוסס-על-מה-שהמשתמש-כבר-הזין,
// ר' CLAUDE.md §16.
router.get(
  '/',
  requireAuth,
  h(async (req, res) => {
    const [{ data: venues, error: venuesErr }, { data: officialPrices, error: opErr }, { data: observations, error: obsErr }, { data: products, error: prodErr }] =
      await Promise.all([
        supabase.from('venues').select('*'),
        supabase.from('official_prices').select('*'),
        supabase.from('price_observations').select('*').eq('household_id', req.household.id),
        supabase.from('products').select('*'),
      ]);
    if (venuesErr) throw venuesErr;
    if (opErr) throw opErr;
    if (obsErr) throw obsErr;
    if (prodErr) throw prodErr;

    const myVenueIds = new Set((venues || []).filter((v) => v.household_id === req.household.id).map((v) => v.id));
    const venueById = new Map((venues || []).map((v) => [v.id, v]));
    const productByBarcode = new Map((products || []).map((p) => [p.barcode, p]));
    const productById = new Map((products || []).map((p) => [p.id, p]));

    // barcode -> [{price, venueId, venueName}]
    const byBarcode = new Map();

    for (const p of officialPrices || []) {
      if (!myVenueIds.has(p.venue_id)) continue;
      if (!byBarcode.has(p.barcode)) byBarcode.set(p.barcode, []);
      byBarcode.get(p.barcode).push({ price: p.price, venueId: p.venue_id, venueName: venueLabel(venueById, p.venue_id) });
    }

    for (const obs of observations || []) {
      for (const item of obs.items || []) {
        if (!item.matchedProductId) continue;
        const product = productById.get(item.matchedProductId);
        if (!product) continue;
        if (!byBarcode.has(product.barcode)) byBarcode.set(product.barcode, []);
        byBarcode.get(product.barcode).push({
          price: item.price,
          venueId: obs.venue_id,
          venueName: venueLabel(venueById, obs.venue_id),
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
        rows: sorted.map((r) => ({ price: r.price, venueName: r.venueName })),
      });
    }

    deals.sort((a, b) => b.diffPercent - a.diffPercent);
    res.json({ deals });
  })
);

export default router;
