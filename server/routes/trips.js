import { Router } from 'express';
import { supabase, h } from '../supabaseClient.js';
import { requireAuth } from '../auth.js';

const router = Router();

function toTrip(row) {
  return {
    id: row.id,
    householdId: row.household_id,
    venueId: row.venue_id,
    status: row.status,
    createdBy: row.created_by,
    createdAt: row.created_at,
    finishedAt: row.finished_at,
    items: row.items || [],
  };
}

async function findActiveTrip(householdId) {
  const { data, error } = await supabase
    .from('trips')
    .select('*')
    .eq('household_id', householdId)
    .eq('status', 'active')
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function findTrip(id, householdId) {
  const { data, error } = await supabase
    .from('trips')
    .select('*')
    .eq('id', id)
    .eq('household_id', householdId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

// טיול-קניות משותף: household אחד יכול להחזיק לכל-היותר טיול-פעיל
// אחד בו-זמנית (כמו סל-קניות אחד לכל המשפחה) — כל בן-משפחה-מחובר
// מוסיף/מסמן/מסיר פריטים וכולם רואים את אותו מצב תוך כדי פולינג
// (אותו דפוס בדיוק כמו useHouseholdSync, ר' useTripSync.js).
router.get(
  '/active',
  requireAuth,
  h(async (req, res) => {
    const trip = await findActiveTrip(req.household.id);
    res.json({ trip: trip ? toTrip(trip) : null });
  })
);

router.post(
  '/',
  requireAuth,
  h(async (req, res) => {
    const existing = await findActiveTrip(req.household.id);
    if (existing) return res.json({ trip: toTrip(existing) });

    const { venueId } = req.body || {};
    const row = {
      id: 't' + Date.now(),
      household_id: req.household.id,
      venue_id: venueId || null,
      status: 'active',
      created_by: req.user.username,
      created_at: Date.now(),
      items: [],
    };
    const { data, error } = await supabase.from('trips').insert(row).select().single();
    if (error) throw error;
    res.json({ trip: toTrip(data) });
  })
);

router.post(
  '/:id/items',
  requireAuth,
  h(async (req, res) => {
    const trip = await findTrip(req.params.id, req.household.id);
    if (!trip) return res.status(404).json({ error: 'טיול לא נמצא' });

    const { productId, name, price, department, shelf, zone, barcode } = req.body || {};
    if (!name || typeof price !== 'number') {
      return res.status(400).json({ error: 'name/price נדרשים' });
    }
    const item = {
      id: 'ti' + Date.now() + Math.random().toString(36).slice(2, 6),
      productId: productId || null,
      name,
      price,
      department: department || null,
      shelf: shelf || null,
      zone: zone || null,
      barcode: barcode || null,
      picked: false,
      addedBy: req.user.username,
      addedAt: Date.now(),
    };
    const items = [...(trip.items || []), item];
    const { data, error } = await supabase.from('trips').update({ items }).eq('id', trip.id).select().single();
    if (error) throw error;
    res.json({ trip: toTrip(data) });
  })
);

router.post(
  '/:id/items/:itemId/toggle',
  requireAuth,
  h(async (req, res) => {
    const trip = await findTrip(req.params.id, req.household.id);
    if (!trip) return res.status(404).json({ error: 'טיול לא נמצא' });
    const items = (trip.items || []).map((i) => (i.id === req.params.itemId ? { ...i, picked: !i.picked } : i));
    const { data, error } = await supabase.from('trips').update({ items }).eq('id', trip.id).select().single();
    if (error) throw error;
    res.json({ trip: toTrip(data) });
  })
);

router.post(
  '/:id/items/:itemId/remove',
  requireAuth,
  h(async (req, res) => {
    const trip = await findTrip(req.params.id, req.household.id);
    if (!trip) return res.status(404).json({ error: 'טיול לא נמצא' });
    const items = (trip.items || []).filter((i) => i.id !== req.params.itemId);
    const { data, error } = await supabase.from('trips').update({ items }).eq('id', trip.id).select().single();
    if (error) throw error;
    res.json({ trip: toTrip(data) });
  })
);

router.post(
  '/:id/finish',
  requireAuth,
  h(async (req, res) => {
    const trip = await findTrip(req.params.id, req.household.id);
    if (!trip) return res.status(404).json({ error: 'טיול לא נמצא' });
    const { data, error } = await supabase
      .from('trips')
      .update({ status: 'done', finished_at: Date.now() })
      .eq('id', trip.id)
      .select()
      .single();
    if (error) throw error;
    res.json({ trip: toTrip(data) });
  })
);

export default router;
