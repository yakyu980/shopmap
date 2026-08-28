import { Router } from 'express';
import { getDb, save } from '../db.js';
import { hashPassword, verifyPassword, createSession, requireAuth, publicUser } from '../auth.js';

const router = Router();

function makeJoinCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

router.post('/register', (req, res) => {
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

  const db = getDb();
  if (db.users.some((u) => u.username.toLowerCase() === trimmedUser.toLowerCase())) {
    return res.status(409).json({ error: 'שם-המשתמש הזה כבר תפוס' });
  }

  let household;
  if (mode === 'join') {
    const code = (householdCode || '').trim().toUpperCase();
    household = db.households.find((h) => h.joinCode === code);
    if (!household) return res.status(404).json({ error: 'קוד-המשפחה לא נמצא' });
  } else {
    const name = (householdName || '').trim() || `המשפחה של ${trimmedUser}`;
    household = { id: 'h' + Date.now(), name, joinCode: makeJoinCode(), createdAt: Date.now() };
    db.households.push(household);
  }

  const user = {
    id: 'u' + Date.now() + Math.round(Math.random() * 1000),
    username: trimmedUser,
    passwordHash: hashPassword(password),
    emoji: emoji || '🙂',
    householdId: household.id,
    createdAt: Date.now(),
    securityQuestion: securityQuestion.trim(),
    // התשובה מנורמלת (lowercase+trim) לפני hash כדי שהשוואה בשחזור לא
    // תיכשל על רגישות-רישיות/רווחים מיותרים.
    securityAnswerHash: hashPassword(securityAnswer.trim().toLowerCase()),
  };
  db.users.push(user);
  save();

  const token = createSession(user.id);
  res.json({ token, user: publicUser(user), household });
});

router.post('/login', (req, res) => {
  const { username, password } = req.body || {};
  const db = getDb();
  const user = db.users.find((u) => u.username.toLowerCase() === (username || '').trim().toLowerCase());
  if (!user || !verifyPassword(password || '', user.passwordHash)) {
    return res.status(401).json({ error: 'שם-משתמש או סיסמה שגויים' });
  }
  const token = createSession(user.id);
  const household = db.households.find((h) => h.id === user.householdId);
  res.json({ token, user: publicUser(user), household });
});

// שחזור-סיסמה — שלב 1: החזרת שאלת-האבטחה שהמשתמש בחר בהרשמה (בלי
// לחשוף אם המשתמש קיים בנפרד משגיאת "לא נמצא" — לצורך-הדגמה זה בסדר,
// לא מוצר-אמיתי-בפרודקשן).
router.post('/forgot-password/question', (req, res) => {
  const { username } = req.body || {};
  const db = getDb();
  const user = db.users.find((u) => u.username.toLowerCase() === (username || '').trim().toLowerCase());
  if (!user) return res.status(404).json({ error: 'שם-המשתמש לא נמצא' });
  res.json({ securityQuestion: user.securityQuestion });
});

// שלב 2: אימות התשובה + קביעת סיסמה חדשה, אטומי (לא שני קריאות נפרדות
// כדי שלא יהיה חלון-זמן שבו יודעים שהתשובה נכונה בלי לשנות כלום).
router.post('/forgot-password/reset', (req, res) => {
  const { username, securityAnswer, newPassword } = req.body || {};
  if (!newPassword || newPassword.length < 4) {
    return res.status(400).json({ error: 'סיסמה חדשה (4+ תווים) נדרשת' });
  }
  const db = getDb();
  const user = db.users.find((u) => u.username.toLowerCase() === (username || '').trim().toLowerCase());
  if (!user) return res.status(404).json({ error: 'שם-המשתמש לא נמצא' });
  if (!verifyPassword((securityAnswer || '').trim().toLowerCase(), user.securityAnswerHash)) {
    return res.status(401).json({ error: 'התשובה לשאלת-האבטחה שגויה' });
  }
  user.passwordHash = hashPassword(newPassword);
  save();
  const token = createSession(user.id);
  const household = db.households.find((h) => h.id === user.householdId);
  res.json({ token, user: publicUser(user), household });
});

router.get('/me', requireAuth, (req, res) => {
  res.json({ user: publicUser(req.user), household: req.household });
});

// עדכון תמונת-פרופיל (data-URL מהמצלמה/מהעלאה, כמו favorites) — לא
// מעלים לאחסון-קבצים נפרד, שומרים ישירות ב-JSON כמו שאר-האפליקציה.
router.patch('/me/photo', requireAuth, (req, res) => {
  const { photo } = req.body || {};
  req.user.photo = photo || null;
  save();
  res.json({ user: publicUser(req.user) });
});

export default router;
