import { Router } from 'express';
import { supabase, h } from '../supabaseClient.js';
import { hashPassword, verifyPassword, createSession, requireAuth, publicUser, toHousehold } from '../auth.js';

const router = Router();

function makeJoinCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

router.post(
  '/register',
  h(async (req, res) => {
    const {
      username,
      password,
      mode,
      householdName,
      householdCode,
      emoji,
      securityQuestion,
      securityAnswer,
    } = req.body || {};
    const trimmedUser = (username || '').trim();
    if (!trimmedUser || !password || password.length < 4) {
      return res.status(400).json({ error: 'שם-משתמש וסיסמה (4+ תווים) נדרשים' });
    }
    if (!securityQuestion?.trim() || !securityAnswer?.trim()) {
      return res.status(400).json({ error: 'שאלת-אבטחה ותשובה נדרשות (לשחזור סיסמה)' });
    }

    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .ilike('username', trimmedUser)
      .maybeSingle();
    if (existing) return res.status(409).json({ error: 'שם-המשתמש הזה כבר תפוס' });

    let household;
    if (mode === 'join') {
      const code = (householdCode || '').trim().toUpperCase();
      const { data } = await supabase.from('households').select('*').eq('join_code', code).maybeSingle();
      if (!data) return res.status(404).json({ error: 'קוד-המשפחה לא נמצא' });
      household = data;
    } else {
      const name = (householdName || '').trim() || `המשפחה של ${trimmedUser}`;
      const row = { id: 'h' + Date.now(), name, join_code: makeJoinCode(), created_at: Date.now() };
      const { data, error } = await supabase.from('households').insert(row).select().single();
      if (error) throw error;
      household = data;
    }

    const user = {
      id: 'u' + Date.now() + Math.round(Math.random() * 1000),
      username: trimmedUser,
      password_hash: hashPassword(password),
      emoji: emoji || '🙂',
      household_id: household.id,
      created_at: Date.now(),
      security_question: securityQuestion.trim(),
      // התשובה מנורמלת (lowercase+trim) לפני hash כדי שהשוואה בשחזור לא
      // תיכשל על רגישות-רישיות/רווחים מיותרים.
      security_answer_hash: hashPassword(securityAnswer.trim().toLowerCase()),
    };
    const { error: insertErr } = await supabase.from('users').insert(user);
    if (insertErr) throw insertErr;

    const token = await createSession(user.id);
    res.json({ token, user: publicUser(user), household: toHousehold(household) });
  })
);

router.post(
  '/login',
  h(async (req, res) => {
    const { username, password } = req.body || {};
    const { data: user } = await supabase
      .from('users')
      .select('*')
      .ilike('username', (username || '').trim())
      .maybeSingle();
    if (!user || !verifyPassword(password || '', user.password_hash)) {
      return res.status(401).json({ error: 'שם-משתמש או סיסמה שגויים' });
    }
    const token = await createSession(user.id);
    const { data: household } = await supabase
      .from('households')
      .select('*')
      .eq('id', user.household_id)
      .maybeSingle();
    res.json({ token, user: publicUser(user), household: household ? toHousehold(household) : null });
  })
);

// שחזור-סיסמה — שלב 1: החזרת שאלת-האבטחה שהמשתמש בחר בהרשמה.
router.post(
  '/forgot-password/question',
  h(async (req, res) => {
    const { username } = req.body || {};
    const { data: user } = await supabase
      .from('users')
      .select('security_question')
      .ilike('username', (username || '').trim())
      .maybeSingle();
    if (!user) return res.status(404).json({ error: 'שם-המשתמש לא נמצא' });
    res.json({ securityQuestion: user.security_question });
  })
);

// שלב 2: אימות התשובה + קביעת סיסמה חדשה, אטומי.
router.post(
  '/forgot-password/reset',
  h(async (req, res) => {
    const { username, securityAnswer, newPassword } = req.body || {};
    if (!newPassword || newPassword.length < 4) {
      return res.status(400).json({ error: 'סיסמה חדשה (4+ תווים) נדרשת' });
    }
    const { data: user } = await supabase
      .from('users')
      .select('*')
      .ilike('username', (username || '').trim())
      .maybeSingle();
    if (!user) return res.status(404).json({ error: 'שם-המשתמש לא נמצא' });
    if (!verifyPassword((securityAnswer || '').trim().toLowerCase(), user.security_answer_hash)) {
      return res.status(401).json({ error: 'התשובה לשאלת-האבטחה שגויה' });
    }
    const { error } = await supabase
      .from('users')
      .update({ password_hash: hashPassword(newPassword) })
      .eq('id', user.id);
    if (error) throw error;

    const token = await createSession(user.id);
    const { data: household } = await supabase
      .from('households')
      .select('*')
      .eq('id', user.household_id)
      .maybeSingle();
    res.json({ token, user: publicUser(user), household: household ? toHousehold(household) : null });
  })
);

router.get('/me', requireAuth, (req, res) => {
  res.json({ user: publicUser(req.user), household: req.household });
});

// עדכון תמונת-פרופיל (data-URL מהמצלמה/מהעלאה, כמו favorites).
router.patch(
  '/me/photo',
  requireAuth,
  h(async (req, res) => {
    const { photo } = req.body || {};
    const { error } = await supabase.from('users').update({ photo: photo || null }).eq('id', req.user.id);
    if (error) throw error;
    res.json({ user: publicUser({ ...req.user, photo: photo || null }) });
  })
);

export default router;
