// ניקוד מקומי (localStorage) — "להנאה" בלבד, בלי מימוש-הטבות/קופונים
// אמיתי (זה דורש שרת+שותפויות-רשתות, עדיין לא קיים).

const STORAGE_KEY = 'supernav_points_v1';
const MAX_LOG = 100;

export const TIERS = [
  { name: 'ברונזה', min: 0, icon: '🥉' },
  { name: 'כסף', min: 50, icon: '🥈' },
  { name: 'זהב', min: 150, icon: '🥇' },
];

function defaultState() {
  return { total: 0, log: [] };
}

function load() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (raw && typeof raw.total === 'number' && Array.isArray(raw.log)) return raw;
  } catch {
    /* localStorage לא זמין/פגום — נופלים לברירת-המחדל */
  }
  return defaultState();
}

function persist(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* אחסון מלא/חסום — מתעלמים */
  }
}

let state = load();
const listeners = new Set();

export function getPointsState() {
  return state;
}

export function subscribePoints(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function addPoints(amount, reason) {
  const log = [...state.log, { amount, reason, ts: Date.now() }].slice(-MAX_LOG);
  state = { total: state.total + amount, log };
  persist(state);
  listeners.forEach((fn) => fn());
}

export function getTier(total) {
  return [...TIERS].reverse().find((t) => total >= t.min) || TIERS[0];
}
