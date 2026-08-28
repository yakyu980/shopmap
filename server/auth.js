// hash/אימות-סיסמה עם crypto.scrypt המובנה (אין תלות-חיצונית כמו
// bcrypt), וטוקן-התחברות אטום (crypto.randomBytes) — נשמר בטבלת
// sessions בסופרבייס, לא JWT, כדי לא להוסיף תלות מיותרת לשרת-הדגמה.

import crypto from 'node:crypto';
import { supabase } from './supabaseClient.js';

export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password, stored) {
  if (!stored) return false;
  const [salt, hash] = stored.split(':');
  const check = crypto.scryptSync(password, salt, 64).toString('hex');
  const a = Buffer.from(hash, 'hex');
  const b = Buffer.from(check, 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export function makeToken() {
  return crypto.randomBytes(24).toString('hex');
}

export async function createSession(userId) {
  const token = makeToken();
  const { error } = await supabase
    .from('sessions')
    .insert({ token, user_id: userId, created_at: Date.now() });
  if (error) throw error;
  return token;
}

export async function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'לא מחובר' });

  const { data: session } = await supabase.from('sessions').select('user_id').eq('token', token).maybeSingle();
  if (!session) return res.status(401).json({ error: 'התחברות לא תקפה, יש להתחבר מחדש' });

  const { data: user } = await supabase.from('users').select('*').eq('id', session.user_id).maybeSingle();
  if (!user) return res.status(401).json({ error: 'משתמש לא נמצא' });

  req.user = user;
  if (user.household_id) {
    const { data: household } = await supabase
      .from('households')
      .select('*')
      .eq('id', user.household_id)
      .maybeSingle();
    req.household = household ? toHousehold(household) : null;
  } else {
    req.household = null;
  }
  next();
}

// ---- ממירים snake_case (עמודות-Postgres) ל-camelCase (מה שכל שאר
// השרת/הלקוח כבר מצפים לו) — נקודת-מעבר יחידה, כדי לא לפזר את זה
// בכל route. ----
export function toHousehold(row) {
  return { id: row.id, name: row.name, joinCode: row.join_code, createdAt: row.created_at };
}

export function publicUser(user) {
  return {
    id: user.id,
    username: user.username,
    emoji: user.emoji,
    photo: user.photo || null,
    householdId: user.household_id,
  };
}
