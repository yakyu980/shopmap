import { Router } from 'express';
import { supabase, h } from '../supabaseClient.js';
import { requireAuth } from '../auth.js';

const router = Router();

// שורות-מחיר שנגזרו מקבלות שהמשתמש עצמו סרק (לא feed-רשמי-חי — ר'
// CLAUDE.md §16 "השוואת-מחירים חוצת-קבלות"). נשלח לשרת *רק* כשהמשתמש
// מחובר ובחר venue מפורש בסקירת-הקבלה; ללא-כך הקבלה נשארת local-only
// (ReceiptScanner.jsx לא קורא לנתיב הזה כלל).
router.post(
  '/',
  requireAuth,
  h(async (req, res) => {
    const { venueId, items, purchasedAt } = req.body || {};
    if (!venueId || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'venueId/items נדרשים' });
    }

    const { data: venue } = await supabase
      .from('venues')
      .select('id')
      .eq('id', venueId)
      .eq('household_id', req.household.id)
      .maybeSingle();
    if (!venue) return res.status(404).json({ error: 'venue לא נמצא' });

    const row = {
      id: 'po' + Date.now(),
      household_id: req.household.id,
      user_id: req.user.id,
      venue_id: venueId,
      items: items.map((it) => ({
        name: it.name,
        price: it.price,
        discountPercent: it.discountPercent ?? null,
        matchedProductId: it.matchedProductId || null,
      })),
      purchased_at: purchasedAt || Date.now(),
      created_at: Date.now(),
    };
    const { data, error } = await supabase.from('price_observations').insert(row).select().single();
    if (error) throw error;
    res.json({ observation: { ...data, householdId: data.household_id, userId: data.user_id, venueId: data.venue_id, purchasedAt: data.purchased_at, createdAt: data.created_at } });
  })
);

// כל השורות (מכל בני ה-household) עבור מוצר-קטלוג ספציפי, עם שם-venue
// מצורף — household-scoped, לא חוצה-בתים (מודל-פרטיות פשוט, לא ציבורי).
router.get(
  '/:productId',
  requireAuth,
  h(async (req, res) => {
    const [{ data: venues, error: venuesErr }, { data: observations, error: obsErr }] = await Promise.all([
      supabase.from('venues').select('*'),
      supabase.from('price_observations').select('*').eq('household_id', req.household.id),
    ]);
    if (venuesErr) throw venuesErr;
    if (obsErr) throw obsErr;

    const venueById = new Map((venues || []).map((v) => [v.id, v]));
    const rows = [];
    for (const obs of observations || []) {
      const venue = venueById.get(obs.venue_id);
      for (const it of obs.items || []) {
        if (it.matchedProductId !== req.params.productId) continue;
        rows.push({
          price: it.price,
          discountPercent: it.discountPercent,
          purchasedAt: obs.purchased_at,
          venueName: venue ? `${venue.chain_name} · ${venue.branch_name}` : 'חנות לא ידועה',
        });
      }
    }
    rows.sort((a, b) => a.purchasedAt - b.purchasedAt);
    res.json({ rows });
  })
);

export default router;
