import { Router } from 'express';
import { supabase, h } from '../supabaseClient.js';
import { requireAuth } from '../auth.js';

const router = Router();

const STORE_TYPES = ['supermarket', 'mini_market', 'kiosk'];
const DEFAULT_NEARBY_RADIUS_METERS = 5000;
const MAX_NEARBY_RADIUS_METERS = 20000;

function nearbySupermarket(feature) {
  const properties = feature?.properties || {};
  const name = String(properties.name || properties.address_line1 || '').trim();
  if (!name || !Number.isFinite(properties.lat) || !Number.isFinite(properties.lon)) return null;

  return {
    id: properties.place_id || `${properties.lat},${properties.lon}`,
    name,
    branchName: String(properties.suburb || properties.city || properties.address_line2 || properties.formatted || name).trim(),
    address: String(properties.formatted || '').trim(),
    lat: properties.lat,
    lng: properties.lon,
    distance: Number.isFinite(properties.distance) ? Math.round(properties.distance) : null,
  };
}

function toVenue(row) {
  return {
    id: row.id,
    householdId: row.household_id,
    chainName: row.chain_name,
    branchName: row.branch_name,
    storeType: row.store_type,
    address: row.address,
    createdBy: row.created_by,
    createdAt: row.created_at,
  };
}

// venues (רשת+סניף+סוג-חנות) שייכים ל-household — כל בן-משפחה-מחובר
// רואה ומוסיף לאותה רשימה, בדיוק כמו בני-המשפחה עצמם (household.js).
router.get(
  '/',
  requireAuth,
  h(async (req, res) => {
    const { data, error } = await supabase.from('venues').select('*').eq('household_id', req.household.id);
    if (error) throw error;
    res.json({ venues: (data || []).map(toVenue) });
  })
);

router.get(
  '/nearby',
  requireAuth,
  h(async (req, res) => {
    const lat = Number(req.query.lat);
    const lng = Number(req.query.lng);
    const requestedRadius = Number(req.query.radius);
    const radius = Number.isFinite(requestedRadius)
      ? Math.min(Math.max(Math.round(requestedRadius), 100), MAX_NEARBY_RADIUS_METERS)
      : DEFAULT_NEARBY_RADIUS_METERS;

    if (!Number.isFinite(lat) || lat < -90 || lat > 90 || !Number.isFinite(lng) || lng < -180 || lng > 180) {
      return res.status(400).json({ error: 'נדרשים קווי אורך ורוחב תקינים' });
    }

    const apiKey = process.env.GEOAPIFY_API_KEY;
    if (!apiKey) {
      return res.status(503).json({ error: 'שירות איתור הסופרים אינו מוגדר' });
    }

    const params = new URLSearchParams({
      categories: 'commercial.supermarket',
      filter: `circle:${lng},${lat},${radius}`,
      bias: `proximity:${lng},${lat}`,
      limit: '20',
      apiKey,
    });
    const response = await fetch(`https://api.geoapify.com/v2/places?${params}`, {
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      console.error(`Geoapify nearby search failed with status ${response.status}`);
      return res.status(502).json({ error: 'שירות איתור הסופרים אינו זמין כרגע' });
    }

    const data = await response.json();
    const supermarkets = (data.features || []).map(nearbySupermarket).filter(Boolean);
    res.json({ supermarkets, radius });
  })
);

router.post(
  '/',
  requireAuth,
  h(async (req, res) => {
    const { chainName, branchName, storeType, address } = req.body || {};
    if (!chainName || !branchName) {
      return res.status(400).json({ error: 'chainName/branchName נדרשים' });
    }
    if (storeType && !STORE_TYPES.includes(storeType)) {
      return res.status(400).json({ error: 'storeType לא תקין' });
    }

    const row = {
      id: 'v' + Date.now(),
      household_id: req.household.id,
      chain_name: String(chainName).trim(),
      branch_name: String(branchName).trim(),
      store_type: storeType || 'supermarket',
      address: address ? String(address).trim() : '',
      created_by: req.user.username,
      created_at: Date.now(),
    };
    const { data, error } = await supabase.from('venues').insert(row).select().single();
    if (error) throw error;
    res.json({ venue: toVenue(data) });
  })
);

export default router;
