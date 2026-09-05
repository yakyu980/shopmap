// עטיפת fetch לשרת-ההדגמה המקומי (server/). כתובת-בסיס ברירת-מחדל
// '/api' — עם proxy ב-vite.config.js ל-http://localhost:8787 בפיתוח.

const BASE = import.meta.env.VITE_API_URL || '/api';
const TOKEN_KEY = 'supernav_auth_token';

export function getToken() {
  try {
    // sessionStorage מבודד בין לשוניות, כך ששני משתמשים יכולים לעבוד
    // במקביל באותו דפדפן בלי שהתחברות אחת תחליף את השנייה.
    return sessionStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token) {
  try {
    if (token) sessionStorage.setItem(TOKEN_KEY, token);
    else sessionStorage.removeItem(TOKEN_KEY);
  } catch {
    /* אחסון חסום — מתעלמים */
  }
}

async function request(path, { method = 'GET', body, signal } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  let res;
  try {
    res = await fetch(BASE + path, { method, headers, body: body !== undefined ? JSON.stringify(body) : undefined, signal });
    // Render/Supabase may briefly rate-limit after wake-up. Retry once using
    // the server hint instead of surfacing the opaque "Failed to fetch".
    if (res.status === 429) {
      const retryAfter = Math.min(3000, Math.max(250, Number(res.headers.get('Retry-After')) * 1000 || 800));
      await new Promise((resolve) => setTimeout(resolve, retryAfter));
      res = await fetch(BASE + path, { method, headers, body: body !== undefined ? JSON.stringify(body) : undefined, signal });
    }
  } catch (err) {
    if (err?.name === 'AbortError') throw err;
    throw new Error('השרת לא זמין כרגע. בדקו חיבור לאינטרנט ונסו שוב.');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || (res.status === 429 ? 'השרת עמוס כרגע. נסו שוב בעוד רגע.' : 'שגיאת-שרת'));
  return data;
}

export const api = {
  get: (path) => request(path),
  post: (path, body, options = {}) => request(path, { method: 'POST', body, ...options }),
  put: (path, body) => request(path, { method: 'PUT', body }),
  patch: (path, body) => request(path, { method: 'PATCH', body }),
  del: (path) => request(path, { method: 'DELETE' }),
};
