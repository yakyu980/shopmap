// "קבוצות-קניות" — כמו קבוצות בוואטסאפ, בלי צ'אט: משתמש יכול להיות
// בכמה קבוצות, לכל קבוצה מנהלים/חברים/חברים-מוגבלים (הגבלת-קטלוג או
// מוצר-בודד, "מצב-ילד"), קישורי-הזמנה, הוצאה/עזיבה/חסימה. שונה
// מ"household" הישן (יחיד-לכל-משתמש, בלי תפקידים) — ר' server/routes/groups.js.
import { api } from './apiClient';

let groups = [];
const listeners = new Set();

function update(next) {
  groups = next;
  listeners.forEach((fn) => fn());
}

export function getGroupsState() {
  return groups;
}

export function subscribeGroups(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export async function fetchGroups() {
  const data = await api.get('/groups');
  update(data.groups);
  return data.groups;
}

export async function createGroup(name) {
  const data = await api.post('/groups', { name });
  update([...groups, data.group]);
  return data.group;
}

export async function updateGroupPhoto(groupId, photo) {
  const data = await api.patch(`/groups/${groupId}/photo`, { photo: photo || null });
  update(groups.map((group) => (group.id === groupId ? data.group : group)));
  return data.group;
}

export async function createInvite(groupId) {
  const data = await api.post(`/groups/${groupId}/invite`);
  return data.token;
}

export async function joinGroup(token) {
  const data = await api.post('/groups/join', { token });
  const exists = groups.some((g) => g.id === data.group.id);
  update(exists ? groups.map((g) => (g.id === data.group.id ? data.group : g)) : [...groups, data.group]);
  return data.group;
}

export async function updateMember(groupId, userId, changes) {
  const data = await api.patch(`/groups/${groupId}/members/${userId}`, changes);
  update(groups.map((g) => (g.id === groupId ? data.group : g)));
  return data.group;
}

export async function removeMember(groupId, userId) {
  await api.del(`/groups/${groupId}/members/${userId}`);
  await fetchGroups();
}

export async function leaveGroup(groupId) {
  await api.post(`/groups/${groupId}/leave`);
  update(groups.filter((g) => g.id !== groupId));
}

export async function blockGroup(groupId) {
  await api.post(`/groups/${groupId}/block`);
  update(groups.filter((g) => g.id !== groupId));
}
