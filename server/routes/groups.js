import { Router } from 'express';
import crypto from 'node:crypto';
import { getDb, save } from '../db.js';
import { requireAuth } from '../auth.js';

const router = Router();

const ROLES = ['admin', 'member', 'restricted'];

function myMembership(db, groupId, userId) {
  return db.groupMemberships.find((m) => m.groupId === groupId && m.userId === userId);
}

function isAdmin(db, groupId, userId) {
  const m = myMembership(db, groupId, userId);
  return !!m && m.status === 'active' && m.role === 'admin';
}

function publicMember(db, m) {
  const user = db.users.find((u) => u.id === m.userId);
  return {
    userId: m.userId,
    username: user?.username || '(נמחק)',
    emoji: user?.emoji || '🙂',
    photo: user?.photo || null,
    role: m.role,
    restriction: m.restriction,
    status: m.status,
  };
}

function serializeGroup(db, group, forUserId) {
  const members = db.groupMemberships.filter((m) => m.groupId === group.id && m.status === 'active');
  const mine = myMembership(db, group.id, forUserId);
  return {
    id: group.id,
    name: group.name,
    photo: group.photo || null,
    ownerId: group.ownerId,
    myRole: mine?.role || null,
    myRestriction: mine?.restriction || null,
    members: members.map((m) => publicMember(db, m)),
  };
}

// כל הקבוצות שהמשתמש חבר-פעיל בהן (לא כולל קבוצות שחסם — ר' /block).
router.get('/', requireAuth, (req, res) => {
  const db = getDb();
  const myGroupIds = db.groupMemberships
    .filter((m) => m.userId === req.user.id && m.status === 'active')
    .map((m) => m.groupId);
  const groups = db.groups
    .filter((g) => myGroupIds.includes(g.id))
    .map((g) => serializeGroup(db, g, req.user.id));
  res.json({ groups });
});

router.post('/', requireAuth, (req, res) => {
  const { name } = req.body || {};
  if (!name || !String(name).trim()) return res.status(400).json({ error: 'שם קבוצה נדרש' });

  const db = getDb();
  const group = { id: 'g' + Date.now(), name: String(name).trim(), photo: null, ownerId: req.user.id, createdAt: Date.now() };
  db.groups.push(group);
  db.groupMemberships.push({
    id: 'gm' + Date.now(),
    groupId: group.id,
    userId: req.user.id,
    role: 'admin',
    restriction: null,
    status: 'active',
    joinedAt: Date.now(),
  });
  save();
  res.json({ group: serializeGroup(db, group, req.user.id) });
});

// יצירת קישור-הזמנה (רק מנהל) — טוקן חד-פעמי-לא, אפשר לשתף שוב ושוב
// עד שמנהל מוחק אותו; פשוט-בכוונה לצורך-הדגמה.
router.post('/:id/invite', requireAuth, (req, res) => {
  const db = getDb();
  const group = db.groups.find((g) => g.id === req.params.id);
  if (!group) return res.status(404).json({ error: 'קבוצה לא נמצאה' });
  if (!isAdmin(db, group.id, req.user.id)) return res.status(403).json({ error: 'רק מנהל-קבוצה יכול ליצור קישור-הזמנה' });

  const token = crypto.randomBytes(9).toString('base64url');
  db.groupInvites.push({ token, groupId: group.id, createdBy: req.user.id, createdAt: Date.now() });
  save();
  res.json({ token });
});

router.post('/join', requireAuth, (req, res) => {
  const { token } = req.body || {};
  const db = getDb();
  const invite = db.groupInvites.find((i) => i.token === token);
  if (!invite) return res.status(404).json({ error: 'קישור-ההזמנה לא תקין או פג-תוקף' });
  const group = db.groups.find((g) => g.id === invite.groupId);
  if (!group) return res.status(404).json({ error: 'הקבוצה כבר לא קיימת' });

  const existing = myMembership(db, group.id, req.user.id);
  if (existing) {
    if (existing.status === 'blocked') {
      return res.status(403).json({ error: 'חסמת את הקבוצה הזו — הסר חסימה כדי להצטרף מחדש' });
    }
    return res.json({ group: serializeGroup(db, group, req.user.id) });
  }

  db.groupMemberships.push({
    id: 'gm' + Date.now(),
    groupId: group.id,
    userId: req.user.id,
    role: 'member',
    restriction: null,
    status: 'active',
    joinedAt: Date.now(),
  });
  save();
  res.json({ group: serializeGroup(db, group, req.user.id) });
});

// עדכון תפקיד/הגבלה של חבר (רק מנהל) — restriction: null | {type:'category', categories:[...]} | {type:'product', productId}
router.patch('/:id/members/:userId', requireAuth, (req, res) => {
  const db = getDb();
  const group = db.groups.find((g) => g.id === req.params.id);
  if (!group) return res.status(404).json({ error: 'קבוצה לא נמצאה' });
  if (!isAdmin(db, group.id, req.user.id)) return res.status(403).json({ error: 'רק מנהל-קבוצה יכול לשנות הרשאות' });

  const member = myMembership(db, group.id, req.params.userId);
  if (!member) return res.status(404).json({ error: 'חבר לא נמצא בקבוצה' });

  const { role, restriction } = req.body || {};
  if (role !== undefined) {
    if (!ROLES.includes(role)) return res.status(400).json({ error: 'תפקיד לא תקין' });
    const admins = db.groupMemberships.filter((m) => m.groupId === group.id && m.role === 'admin' && m.status === 'active');
    if (member.role === 'admin' && role !== 'admin' && admins.length <= 1) {
      return res.status(400).json({ error: 'לא ניתן להוריד את המנהל האחרון בקבוצה' });
    }
    member.role = role;
  }
  if (restriction !== undefined) member.restriction = restriction;
  save();
  res.json({ group: serializeGroup(db, group, req.user.id) });
});

// הוצאת חבר מהקבוצה (רק מנהל)
router.delete('/:id/members/:userId', requireAuth, (req, res) => {
  const db = getDb();
  const group = db.groups.find((g) => g.id === req.params.id);
  if (!group) return res.status(404).json({ error: 'קבוצה לא נמצאה' });
  if (!isAdmin(db, group.id, req.user.id)) return res.status(403).json({ error: 'רק מנהל-קבוצה יכול להוציא חברים' });
  if (req.params.userId === req.user.id) return res.status(400).json({ error: 'להסרת עצמך יש "עזוב קבוצה"' });

  db.groupMemberships = db.groupMemberships.filter(
    (m) => !(m.groupId === group.id && m.userId === req.params.userId)
  );
  save();
  res.json({ ok: true });
});

// עזיבת קבוצה (בעצמך) — אם היית המנהל היחיד ויש חברים נוספים, קודם
// יש לקדם מישהו אחר למנהל.
router.post('/:id/leave', requireAuth, (req, res) => {
  const db = getDb();
  const group = db.groups.find((g) => g.id === req.params.id);
  if (!group) return res.status(404).json({ error: 'קבוצה לא נמצאה' });
  const mine = myMembership(db, group.id, req.user.id);
  if (!mine) return res.status(404).json({ error: 'אינך חבר בקבוצה זו' });

  const others = db.groupMemberships.filter((m) => m.groupId === group.id && m.userId !== req.user.id && m.status === 'active');
  const admins = db.groupMemberships.filter((m) => m.groupId === group.id && m.role === 'admin' && m.status === 'active');
  if (mine.role === 'admin' && admins.length <= 1 && others.length > 0) {
    return res.status(400).json({ error: 'קדם חבר אחר למנהל לפני שאתה עוזב' });
  }

  db.groupMemberships = db.groupMemberships.filter((m) => !(m.groupId === group.id && m.userId === req.user.id));
  if (others.length === 0) {
    db.groups = db.groups.filter((g) => g.id !== group.id);
    db.groupInvites = db.groupInvites.filter((i) => i.groupId !== group.id);
  }
  save();
  res.json({ ok: true });
});

// חסימת קבוצה (בעצמך) — נשאר רשום כחבר אבל status='blocked': נעלם
// מרשימת-הקבוצות שלך, ולא ניתן להצטרף מחדש דרך קישור עד שתבטל-חסימה.
router.post('/:id/block', requireAuth, (req, res) => {
  const db = getDb();
  const mine = myMembership(db, req.params.id, req.user.id);
  if (!mine) return res.status(404).json({ error: 'אינך חבר בקבוצה זו' });
  mine.status = 'blocked';
  save();
  res.json({ ok: true });
});

router.post('/:id/unblock', requireAuth, (req, res) => {
  const db = getDb();
  const mine = myMembership(db, req.params.id, req.user.id);
  if (!mine) return res.status(404).json({ error: 'אינך חבר בקבוצה זו' });
  mine.status = 'active';
  save();
  res.json({ group: serializeGroup(db, db.groups.find((g) => g.id === req.params.id), req.user.id) });
});

export default router;
