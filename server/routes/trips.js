import { Router } from 'express';
import { getDb, save } from '../db.js';
import { requireAuth } from '../auth.js';

const router = Router();

function findActiveTrip(db, householdId) {
  return db.trips.find((t) => t.householdId === householdId && t.status === 'active');
}

// טיול-קניות משותף: household אחד יכול להחזיק לכל-היותר טיול-פעיל
// אחד בו-זמנית (כמו סל-קניות אחד לכל המשפחה) — כל בן-משפחה-מחובר
// מוסיף/מסמן/מסיר פריטים וכולם רואים את אותו מצב תוך כדי פולינג
// (אותו דפוס בדיוק כמו useHouseholdSync, ר' useTripSync.js).
router.get('/active', requireAuth, (req, res) => {
  const db = getDb();
  const trip = findActiveTrip(db, req.household.id) || null;
  res.json({ trip });
});

router.post('/', requireAuth, (req, res) => {
  const db = getDb();
  const existing = findActiveTrip(db, req.household.id);
  if (existing) return res.json({ trip: existing });

  const { venueId } = req.body || {};
  const trip = {
    id: 't' + Date.now(),
    householdId: req.household.id,
    venueId: venueId || null,
    status: 'active',
    createdBy: req.user.username,
    createdAt: Date.now(),
    items: [],
  };
  db.trips.push(trip);
  save();
  res.json({ trip });
});

router.post('/:id/items', requireAuth, (req, res) => {
  const db = getDb();
  const trip = db.trips.find((t) => t.id === req.params.id && t.householdId === req.household.id);
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
  trip.items.push(item);
  save();
  res.json({ trip });
});

router.post('/:id/items/:itemId/toggle', requireAuth, (req, res) => {
  const db = getDb();
  const trip = db.trips.find((t) => t.id === req.params.id && t.householdId === req.household.id);
  if (!trip) return res.status(404).json({ error: 'טיול לא נמצא' });
  const item = trip.items.find((i) => i.id === req.params.itemId);
  if (!item) return res.status(404).json({ error: 'פריט לא נמצא' });
  item.picked = !item.picked;
  save();
  res.json({ trip });
});

router.post('/:id/items/:itemId/remove', requireAuth, (req, res) => {
  const db = getDb();
  const trip = db.trips.find((t) => t.id === req.params.id && t.householdId === req.household.id);
  if (!trip) return res.status(404).json({ error: 'טיול לא נמצא' });
  trip.items = trip.items.filter((i) => i.id !== req.params.itemId);
  save();
  res.json({ trip });
});

router.post('/:id/finish', requireAuth, (req, res) => {
  const db = getDb();
  const trip = db.trips.find((t) => t.id === req.params.id && t.householdId === req.household.id);
  if (!trip) return res.status(404).json({ error: 'טיול לא נמצא' });
  trip.status = 'done';
  trip.finishedAt = Date.now();
  save();
  res.json({ trip });
});

export default router;
