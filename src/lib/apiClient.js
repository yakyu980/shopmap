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
  const canRetry = method === 'GET';
  for (let attempt = 0; attempt < (canRetry ? 3 : 1); attempt += 1) {
    try {
      res = await fetch(BASE + path, { method, headers, body: body !== undefined ? JSON.stringify(body) : undefined, signal });
      if (res.ok) break;
      const transient = res.status === 429 || res.status === 502 || res.status === 503 || res.status === 504;
      if (!canRetry || !transient || attempt === 2) break;
      const retryAfter = Math.min(4000, Math.max(400, Number(res.headers.get('Retry-After')) * 1000 || (700 * (attempt + 1))));
      await new Promise((resolve) => setTimeout(resolve, retryAfter));
    } catch (err) {
      if (err?.name === 'AbortError') throw err;
      if (!canRetry || attempt === 2) throw new Error('השרת לא זמין כרגע. בדקו חיבור לאינטרנט ונסו שוב.');
      await new Promise((resolve) => setTimeout(resolve, 700 * (attempt + 1)));
    }
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
