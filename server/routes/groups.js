import { Router } from 'express';
import crypto from 'node:crypto';
import { supabase, h } from '../supabaseClient.js';
import { requireAuth } from '../auth.js';

const router = Router();

const ROLES = ['admin', 'member', 'restricted'];

async function myMembership(groupId, userId) {
  const { data, error } = await supabase
    .from('group_memberships')
    .select('*')
    .eq('group_id', groupId)
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function isAdmin(groupId, userId) {
  const m = await myMembership(groupId, userId);
  return !!m && m.status === 'active' && m.role === 'admin';
}

async function serializeGroup(group, forUserId) {
  const [{ data: memberships, error: memErr }, mine] = await Promise.all([
    supabase.from('group_memberships').select('*').eq('group_id', group.id).eq('status', 'active'),
    myMembership(group.id, forUserId),
  ]);
  if (memErr) throw memErr;

  const userIds = (memberships || []).map((m) => m.user_id);
  const { data: users, error: usersErr } =
    userIds.length > 0 ? await supabase.from('users').select('*').in('id', userIds) : { data: [] };
  if (usersErr) throw usersErr;
  const userById = new Map((users || []).map((u) => [u.id, u]));

  return {
    id: group.id,
    name: group.name,
    photo: group.photo || null,
    ownerId: group.owner_id,
    myRole: mine?.role || null,
    myRestriction: mine?.restriction || null,
    members: (memberships || []).map((m) => {
      const user = userById.get(m.user_id);
      return {
        userId: m.user_id,
        username: user?.username || '(נמחק)',
        emoji: user?.emoji || '🙂',
        photo: user?.photo || null,
        role: m.role,
        restriction: m.restriction,
        status: m.status,
      };
    }),
  };
}

// כל הקבוצות שהמשתמש חבר-פעיל בהן (לא כולל קבוצות שחסם — ר' /block).
router.get(
  '/',
  requireAuth,
  h(async (req, res) => {
    const { data: memberships, error: memErr } = await supabase
      .from('group_memberships')
      .select('group_id')
      .eq('user_id', req.user.id)
      .eq('status', 'active');
    if (memErr) throw memErr;
    const groupIds = (memberships || []).map((m) => m.group_id);
    if (groupIds.length === 0) return res.json({ groups: [] });

    const { data: groupRows, error: groupsErr } = await supabase.from('groups').select('*').in('id', groupIds);
    if (groupsErr) throw groupsErr;
    const groups = await Promise.all((groupRows || []).map((g) => serializeGroup(g, req.user.id)));
    res.json({ groups });
  })
);

router.post(
  '/',
  requireAuth,
  h(async (req, res) => {
    const { name } = req.body || {};
    if (!name || !String(name).trim()) return res.status(400).json({ error: 'שם קבוצה נדרש' });

    const group = { id: 'g' + Date.now(), name: String(name).trim(), photo: null, owner_id: req.user.id, created_at: Date.now() };
    const { data: inserted, error: groupErr } = await supabase.from('groups').insert(group).select().single();
    if (groupErr) throw groupErr;

    const { error: memErr } = await supabase.from('group_memberships').insert({
      id: 'gm' + Date.now(),
      group_id: group.id,
      user_id: req.user.id,
      role: 'admin',
      restriction: null,
      status: 'active',
      joined_at: Date.now(),
    });
    if (memErr) throw memErr;

    res.json({ group: await serializeGroup(inserted, req.user.id) });
  })
);

// יצירת קישור-הזמנה (רק מנהל) — טוקן חד-פעמי-לא, אפשר לשתף שוב ושוב
// עד שמנהל מוחק אותו; פשוט-בכוונה לצורך-הדגמה.
router.post(
  '/:id/invite',
  requireAuth,
  h(async (req, res) => {
    const { data: group } = await supabase.from('groups').select('id').eq('id', req.params.id).maybeSingle();
    if (!group) return res.status(404).json({ error: 'קבוצה לא נמצאה' });
    if (!(await isAdmin(group.id, req.user.id))) {
      return res.status(403).json({ error: 'רק מנהל-קבוצה יכול ליצור קישור-הזמנה' });
    }

    const token = crypto.randomBytes(9).toString('base64url');
    const { error } = await supabase
      .from('group_invites')
      .insert({ token, group_id: group.id, created_by: req.user.id, created_at: Date.now() });
    if (error) throw error;
    res.json({ token });
  })
);

router.post(
  '/join',
  requireAuth,
  h(async (req, res) => {
    const { token } = req.body || {};
    const { data: invite } = await supabase.from('group_invites').select('*').eq('token', token).maybeSingle();
    if (!invite) return res.status(404).json({ error: 'קישור-ההזמנה לא תקין או פג-תוקף' });
    const { data: group } = await supabase.from('groups').select('*').eq('id', invite.group_id).maybeSingle();
    if (!group) return res.status(404).json({ error: 'הקבוצה כבר לא קיימת' });

    const existing = await myMembership(group.id, req.user.id);
    if (existing) {
      if (existing.status === 'blocked') {
        return res.status(403).json({ error: 'חסמת את הקבוצה הזו — הסר חסימה כדי להצטרף מחדש' });
      }
      return res.json({ group: await serializeGroup(group, req.user.id) });
    }

    const { error } = await supabase.from('group_memberships').insert({
      id: 'gm' + Date.now(),
      group_id: group.id,
      user_id: req.user.id,
      role: 'member',
      restriction: null,
      status: 'active',
      joined_at: Date.now(),
    });
    if (error) throw error;
    res.json({ group: await serializeGroup(group, req.user.id) });
  })
);

// עדכון תפקיד/הגבלה של חבר (רק מנהל) — restriction: null | {type:'category', categories:[...]} | {type:'product', productId}
router.patch(
  '/:id/members/:userId',
  requireAuth,
  h(async (req, res) => {
    const { data: group } = await supabase.from('groups').select('*').eq('id', req.params.id).maybeSingle();
    if (!group) return res.status(404).json({ error: 'קבוצה לא נמצאה' });
    if (!(await isAdmin(group.id, req.user.id))) {
      return res.status(403).json({ error: 'רק מנהל-קבוצה יכול לשנות הרשאות' });
    }

    const member = await myMembership(group.id, req.params.userId);
    if (!member) return res.status(404).json({ error: 'חבר לא נמצא בקבוצה' });

    const { role, restriction } = req.body || {};
    const patch = {};
    if (role !== undefined) {
      if (!ROLES.includes(role)) return res.status(400).json({ error: 'תפקיד לא תקין' });
      const { data: admins, error: adminsErr } = await supabase
        .from('group_memberships')
        .select('id')
        .eq('group_id', group.id)
        .eq('role', 'admin')
        .eq('status', 'active');
      if (adminsErr) throw adminsErr;
      if (member.role === 'admin' && role !== 'admin' && (admins || []).length <= 1) {
        return res.status(400).json({ error: 'לא ניתן להוריד את המנהל האחרון בקבוצה' });
      }
      patch.role = role;
    }
    if (restriction !== undefined) patch.restriction = restriction;

    const { error } = await supabase.from('group_memberships').update(patch).eq('id', member.id);
    if (error) throw error;
    res.json({ group: await serializeGroup(group, req.user.id) });
  })
);

// הוצאת חבר מהקבוצה (רק מנהל)
router.delete(
  '/:id/members/:userId',
  requireAuth,
  h(async (req, res) => {
    const { data: group } = await supabase.from('groups').select('id').eq('id', req.params.id).maybeSingle();
    if (!group) return res.status(404).json({ error: 'קבוצה לא נמצאה' });
    if (!(await isAdmin(group.id, req.user.id))) {
      return res.status(403).json({ error: 'רק מנהל-קבוצה יכול להוציא חברים' });
    }
    if (req.params.userId === req.user.id) return res.status(400).json({ error: 'להסרת עצמך יש "עזוב קבוצה"' });

    const { error } = await supabase
      .from('group_memberships')
      .delete()
      .eq('group_id', group.id)
      .eq('user_id', req.params.userId);
    if (error) throw error;
    res.json({ ok: true });
  })
);

// עזיבת קבוצה (בעצמך) — אם היית המנהל היחיד ויש חברים נוספים, קודם
// יש לקדם מישהו אחר למנהל.
router.post(
  '/:id/leave',
  requireAuth,
  h(async (req, res) => {
    const { data: group } = await supabase.from('groups').select('id').eq('id', req.params.id).maybeSingle();
    if (!group) return res.status(404).json({ error: 'קבוצה לא נמצאה' });
    const mine = await myMembership(group.id, req.user.id);
    if (!mine) return res.status(404).json({ error: 'אינך חבר בקבוצה זו' });

    const { data: activeMembers, error: activeErr } = await supabase
      .from('group_memberships')
      .select('*')
      .eq('group_id', group.id)
      .eq('status', 'active');
    if (activeErr) throw activeErr;
    const others = (activeMembers || []).filter((m) => m.user_id !== req.user.id);
    const admins = (activeMembers || []).filter((m) => m.role === 'admin');
    if (mine.role === 'admin' && admins.length <= 1 && others.length > 0) {
      return res.status(400).json({ error: 'קדם חבר אחר למנהל לפני שאתה עוזב' });
    }

    const { error: delErr } = await supabase
      .from('group_memberships')
      .delete()
      .eq('group_id', group.id)
      .eq('user_id', req.user.id);
    if (delErr) throw delErr;

    if (others.length === 0) {
      // מוחק קבוצה ריקה — invites/memberships נמחקים אוטומטית (on
      // delete cascade, ר' supabase-schema.sql).
      await supabase.from('groups').delete().eq('id', group.id);
    }
    res.json({ ok: true });
  })
);

// חסימת קבוצה (בעצמך) — נשאר רשום כחבר אבל status='blocked': נעלם
// מרשימת-הקבוצות שלך, ולא ניתן להצטרף מחדש דרך קישור עד שתבטל-חסימה.
router.post(
  '/:id/block',
  requireAuth,
  h(async (req, res) => {
    const mine = await myMembership(req.params.id, req.user.id);
    if (!mine) return res.status(404).json({ error: 'אינך חבר בקבוצה זו' });
    const { error } = await supabase.from('group_memberships').update({ status: 'blocked' }).eq('id', mine.id);
    if (error) throw error;
    res.json({ ok: true });
  })
);

router.post(
  '/:id/unblock',
  requireAuth,
  h(async (req, res) => {
    const mine = await myMembership(req.params.id, req.user.id);
    if (!mine) return res.status(404).json({ error: 'אינך חבר בקבוצה זו' });
    const { error } = await supabase.from('group_memberships').update({ status: 'active' }).eq('id', mine.id);
    if (error) throw error;
    const { data: group } = await supabase.from('groups').select('*').eq('id', req.params.id).maybeSingle();
    res.json({ group: await serializeGroup(group, req.user.id) });
  })
);

export default router;
