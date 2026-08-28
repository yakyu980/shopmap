import { Router } from 'express';
import { supabase, h } from '../supabaseClient.js';
import { requireAuth, publicUser } from '../auth.js';

const router = Router();

// זה מה שבאמת מסתנכרן בין מכשירים: מוסיפים בן-משפחה פעם אחת (נרשם
// כמשתמש בקוד-המשפחה המשותף), וכל מכשיר-מחובר רואה את אותה רשימה.
router.get(
  '/members',
  requireAuth,
  h(async (req, res) => {
    const { data: members, error } = await supabase
      .from('users')
      .select('*')
      .eq('household_id', req.household?.id || '');
    if (error) throw error;
    res.json({ household: req.household, members: (members || []).map(publicUser) });
  })
);

export default router;
