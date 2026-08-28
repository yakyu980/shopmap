import { Router } from 'express';
import { supabase, h } from '../supabaseClient.js';
import { requireAuth } from '../auth.js';

const router = Router();

const STORE_TYPES = ['supermarket', 'mini_market', 'kiosk'];

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
