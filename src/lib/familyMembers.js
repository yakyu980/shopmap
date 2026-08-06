// בני-משפחה — מיני-store חיצוני (pub/sub), אותו דפוס כמו storeConfig.js.
// מקומי-בלבד: אין סנכרון בין מכשירים (זה דורש שרת, עדיין לא קיים).

const STORAGE_KEY = 'supernav_family_v1';

function defaultConfig() {
  return { members: [], activeMemberId: null };
}

function loadConfig() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (raw && Array.isArray(raw.members)) return raw;
  } catch {
    /* localStorage לא זמין/פגום — נופלים לברירת-המחדל */
  }
  return defaultConfig();
}

function persist(config) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch {
    /* אחסון מלא/חסום — מתעלמים */
  }
}

let state = loadConfig();
const listeners = new Set();

export function getFamilyState() {
  return state;
}

export function subscribeFamily(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function update(next) {
  state = next;
  persist(state);
  listeners.forEach((fn) => fn());
}

export function addMember(name, emoji) {
  const trimmed = (name || '').trim();
  if (!trimmed) return;
  const id = 'm' + Date.now() + Math.round(Math.random() * 1000);
  update({
    ...state,
    members: [...state.members, { id, name: trimmed, emoji: emoji || '🙂' }],
  });
}

export function removeMember(id) {
  update({
    ...state,
    members: state.members.filter((m) => m.id !== id),
    activeMemberId: state.activeMemberId === id ? null : state.activeMemberId,
  });
}

export function setActiveMember(id) {
  update({ ...state, activeMemberId: id });
}
