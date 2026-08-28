// לקוח-Supabase בצד-השרת בלבד — service-role key (עוקף RLS), אף פעם
// לא נחשף ללקוח/לריפו (מגיע מ-env vars, ר' render.yaml). כל ה-routes
// עברו מ-JSON-מקומי (server/db.js הישן) לטבלאות אמיתיות בסופרבייס.
import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;

if (!url || !key) {
  throw new Error('חסרים SUPABASE_URL/SUPABASE_SECRET_KEY — ר\' README להפעלת השרת');
}

export const supabase = createClient(url, key, {
  auth: { persistSession: false },
});

// עוטף route אסינכרוני כדי ששגיאה לא-צפויה (רשת/שאילתה) תחזיר 500
// מסודר במקום להפיל בקשה בלי מענה — אותו תפקיד בדיוק כמו
// try/catch שהיה בכל route ב-db.js הישן, רק לא-חוזר על עצמו בכל קובץ.
export function h(fn) {
  return (req, res) => {
    fn(req, res).catch((err) => {
      console.error(err);
      if (!res.headersSent) res.status(500).json({ error: 'שגיאת-שרת' });
    });
  };
}
