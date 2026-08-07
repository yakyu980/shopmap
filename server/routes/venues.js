import { Router } from 'express';
import { getDb, save } from '../db.js';
import { requireAuth } from '../auth.js';

const router = Router();

const STORE_TYPES = ['supermarket', 'mini_market', 'kiosk'];

// venues (רשת+סניף+סוג-חנות) שייכים ל-household — כל בן-משפחה-מחובר
// רואה ומוסיף לאותה רשימה, בדיוק כמו בני-המשפחה עצמם (household.js).
router.get('/', requireAuth, (req, res) => {
  const db = getDb();
  const venues = db.venues.filter((v) => v.householdId === req.household.id);
  res.json({ venues });
});

router.post('/', requireAuth, (req, res) => {
  const { chainName, branchName, storeType, address } = req.body || {};
  if (!chainName || !branchName) {
    return res.status(400).json({ error: 'chainName/branchName נדרשים' });
  }
  if (storeType && !STORE_TYPES.includes(storeType)) {
    return res.status(400).json({ error: 'storeType לא תקין' });
  }

  const db = getDb();
  const venue = {
    id: 'v' + Date.now(),
    householdId: req.household.id,
    chainName: String(chainName).trim(),
    branchName: String(branchName).trim(),
    storeType: storeType || 'supermarket',
    address: address ? String(address).trim() : '',
    createdBy: req.user.username,
    createdAt: Date.now(),
  };
  db.venues.push(venue);
  save();
  res.json({ venue });
});

export default router;
