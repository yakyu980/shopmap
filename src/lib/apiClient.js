// עטיפת fetch לשרת-ההדגמה המקומי (server/). כתובת-בסיס ברירת-מחדל
// '/api' — עם proxy ב-vite.config.js ל-http://localhost:8787 בפיתוח.

const BASE = import.meta.env.VITE_API_URL || '/api';
const TOKEN_KEY = 'supernav_auth_token';

export function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* אחסון חסום — מתעלמים */
  }
}

async function request(path, { method = 'GET', body, signal } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(BASE + path, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    signal,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'שגיאת-שרת');
  return data;
}

export const api = {
  get: (path) => request(path),
  post: (path, body, options = {}) => request(path, { method: 'POST', body, ...options }),
  put: (path, body) => request(path, { method: 'PUT', body }),
  patch: (path, body) => request(path, { method: 'PATCH', body }),
  del: (path) => request(path, { method: 'DELETE' }),
};
