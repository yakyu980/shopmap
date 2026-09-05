// מצב-התחברות — מיני-store חיצוני (pub/sub), אותו דפוס כמו
// storeConfig.js/familyMembers.js. ההתחברות חובה (ר' AuthGate.jsx) —
// בלי session תקף, App.jsx לא מרנדר את שאר האפליקציה בכלל.

import { api, getToken, setToken } from './apiClient';

const CACHE_KEY = 'supernav_auth_cache_v1'; // {user, household} — לתצוגה מיידית לפני שהרשת עונה

function loadCache() {
  try {
    return JSON.parse(sessionStorage.getItem(CACHE_KEY)) || null;
  } catch {
    return null;
  }
}

function persistCache(user, household) {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({ user, household }));
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

export async function register({
  username,
  password,
  mode,
  householdName,
  householdCode,
  emoji,
  securityQuestion,
  securityAnswer,
}) {
  const data = await api.post('/auth/register', {
    username,
    password,
    mode,
    householdName,
    householdCode,
    emoji,
    securityQuestion,
    securityAnswer,
  });
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

// שחזור-סיסמה — שני שלבים, ר' server/routes/auth.js.
export async function fetchSecurityQuestion(username) {
  const data = await api.post('/auth/forgot-password/question', { username });
  return data.securityQuestion;
}

export async function resetPassword({ username, securityAnswer, newPassword }) {
  const data = await api.post('/auth/forgot-password/reset', { username, securityAnswer, newPassword });
  setToken(data.token);
  update({ token: data.token, user: data.user, household: data.household });
  return data;
}

export async function updateProfilePhoto(photo) {
  const { token, user } = state;
  const data = await api.patch('/auth/me/photo', { photo });
  // Ignore a response from a session that ended while the upload was pending.
  if (state.token === token && state.user?.id === user?.id) {
    update({ ...state, user: data.user });
  }
  return data.user;
}

export function logout() {
  setToken(null);
  update({ token: null, user: null, household: null });
}
