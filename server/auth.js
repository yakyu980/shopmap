// hash/אימות-סיסמה עם crypto.scrypt המובנה (אין תלות-חיצונית כמו
// bcrypt), וטוקן-התחברות אטום (crypto.randomBytes) בטבלת sessions —
// לא JWT, כדי לא להוסיף תלות מיותרת לשרת-הדגמה.

import crypto from 'node:crypto';
import { getDb, save } from './db.js';

export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password, stored) {
  const [salt, hash] = stored.split(':');
  const check = crypto.scryptSync(password, salt, 64).toString('hex');
  const a = Buffer.from(hash, 'hex');
  const b = Buffer.from(check, 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export function makeToken() {
  return crypto.randomBytes(24).toString('hex');
}

export function createSession(userId) {
  const db = getDb();
  const token = makeToken();
  db.sessions.push({ token, userId, createdAt: Date.now() });
  save();
  return token;
}

export function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'לא מחובר' });

  const db = getDb();
  const session = db.sessions.find((s) => s.token === token);
  if (!session) return res.status(401).json({ error: 'התחברות לא תקפה, יש להתחבר מחדש' });

  const user = db.users.find((u) => u.id === session.userId);
  if (!user) return res.status(401).json({ error: 'משתמש לא נמצא' });

  req.user = user;
  req.household = db.households.find((h) => h.id === user.householdId);
  next();
}

export function publicUser(user) {
  return { id: user.id, username: user.username, emoji: user.emoji, householdId: user.householdId };
}
