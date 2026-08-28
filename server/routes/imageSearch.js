// זיהוי-תמונה עדיין הדמיה מוצהרת (אותה שיטת-seed דטרמיניסטית כמו
// src/lib/imageRecognitionMock.js, פשוט הועברה לשרת) — לא מודל-ראייה
// אמיתי. זיהוי-AI אמיתי דורש מפתח-API לשירות-ראייה חיצוני (Google
// Vision/OpenAI וכו') שאין לו גישה בסביבה הזו; זו נקודת-ההרחבה
// המיועדת ל-API-אמיתי בעתיד — לא הוחלף בפועל.

import { Router } from 'express';
import { supabase, h } from '../supabaseClient.js';
import { requireAuth } from '../auth.js';
import { seededRandom } from '../../src/lib/seededRandom.js';

const router = Router();

router.post(
  '/',
  requireAuth,
  h(async (req, res) => {
    const { seed } = req.body || {};
    const { data: products, error } = await supabase.from('products').select('*');
    if (error) throw error;
    const rand = seededRandom(seed || 'seed');
    const scored = (products || []).map((p) => ({ p, r: rand() }));
    scored.sort((a, b) => a.r - b.r);
    res.json({ candidates: scored.slice(0, 3).map((s) => s.p), mock: true });
  })
);

export default router;
