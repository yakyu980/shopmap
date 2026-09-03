// venues (רשת+סניף+סוג-חנות) — מיני-store חיצוני (pub/sub), אותו דפוס
// כמו auth.js/familyMembers.js. תלוי-שרת+חיבור (household) — בלי
// חיבור הרשימה נשארת ריקה, לא נופלת ל-localStorage משלה (venue הוא
// מושג משותף-למשפחה מטבעו, לא מקומי-לפי-מכשיר).

import { api } from './apiClient';

const CACHE_KEY = 'supernav_venues_cache_v1';

function loadCache() {
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY)) || [];
  } catch {
    return [];
  }
}

function persistCache(venues) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(venues));
  } catch {
    /* אחסון חסום — מתעלמים */
  }
}

export const STORE_TYPE_LABELS = {
  supermarket: 'סופרמרקט',
  mini_market: 'מרכולית',
  kiosk: 'קיוסק',
};

let state = { venues: loadCache(), loaded: false };
const listeners = new Set();

function update(next) {
  state = next;
  persistCache(state.venues);
  listeners.forEach((fn) => fn());
}

export function getVenuesState() {
  return state;
}

export function subscribeVenues(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export async function refreshVenues() {
  try {
    const data = await api.get('/venues');
    update({ venues: data.venues, loaded: true });
  } catch {
    /* השרת לא זמין — נשארים עם מה שיש ב-cache */
  }
}

export async function createVenue({ chainName, branchName, storeType, address }) {
  const data = await api.post('/venues', { chainName, branchName, storeType, address });
  update({ venues: [...state.venues, data.venue], loaded: true });
  return data.venue;
}

export async function findNearbySupermarkets({ lat, lng, radius = 5000 }) {
  const params = new URLSearchParams({ lat: String(lat), lng: String(lng), radius: String(radius) });
  const data = await api.get(`/venues/nearby?${params}`);
  return data.supermarkets || [];
}
