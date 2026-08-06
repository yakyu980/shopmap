import { Router } from 'express';
import { getDb } from '../db.js';
import { requireAuth, publicUser } from '../auth.js';

const router = Router();

// זה מה שבאמת מסתנכרן בין מכשירים: מוסיפים בן-משפחה פעם אחת (נרשם
// כמשתמש בקוד-המשפחה המשותף), וכל מכשיר-מחובר רואה את אותה רשימה.
router.get('/members', requireAuth, (req, res) => {
  const db = getDb();
  const members = db.users.filter((u) => u.householdId === req.household.id).map(publicUser);
  res.json({ household: req.household, members });
});

export default router;
