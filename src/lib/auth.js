// מצב-התחברות — מיני-store חיצוני (pub/sub), אותו דפוס כמו
// storeConfig.js/familyMembers.js. ההתחברות אופציונלית: משתמש-שלא-
// מחובר ממשיך להשתמש באפליקציה בדיוק כמו היום (הכל מקומי, אופליין).

import { api, getToken, setToken } from './apiClient';

const CACHE_KEY = 'supernav_auth_cache_v1'; // {user, household} — לתצוגה מיידית לפני שהרשת עונה

function loadCache() {
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY)) || null;
  } catch {
    return null;
  }
}

function persistCache(user, household) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ user, household }));
  } catch {
    /* אחסון חסום — מתעלמים */
  }
}

const cached = loadCache();
let state = {
  token: getToken(),
  user: cached?.user || null,
  household: cached?.household || null,
};
const listeners = new Set();

function update(next) {
  state = next;
  persistCache(state.user, state.household);
  listeners.forEach((fn) => fn());
}

export function getAuthState() {
  return state;
}

export function subscribeAuth(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export async function register({ username, password, mode, householdName, householdCode, emoji }) {
  const data = await api.post('/auth/register', { username, password, mode, householdName, householdCode, emoji });
  setToken(data.token);
  update({ token: data.token, user: data.user, household: data.household });
  return data;
}

export async function login({ username, password }) {
  const data = await api.post('/auth/login', { username, password });
  setToken(data.token);
  update({ token: data.token, user: data.user, household: data.household });
  return data;
}

export function logout() {
  setToken(null);
  update({ token: null, user: null, household: null });
}
