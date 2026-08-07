// "מועדפים" — רשימת-משאלות חופשית-לגמרי (לא תלויה בקטלוג-הקבוע),
// מיני-store חיצוני (pub/sub), אותו דפוס בדיוק כמו familyMembers.js/
// receiptHistory.js. מקומי-בלבד (localStorage) — לא דורש חיבור/שרת.
// תמונה נשמרת כ-dataURL כמו-שהיא (בלי כיווץ, לפי בקשת המשתמש).

const STORAGE_KEY = 'supernav_favorites_v1';

export const SEASONS = { ALL: 'all', SUMMER: 'summer', WINTER: 'winter' };

function load() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (Array.isArray(raw)) return raw;
  } catch {
    /* localStorage לא זמין/פגום — נופלים לרשימה ריקה */
  }
  return [];
}

function persist(list) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    /* אחסון מלא/חסום (תמונות עלולות להיות כבדות) — מתעלמים */
  }
}

let state = load();
const listeners = new Set();

function update(next) {
  state = next;
  persist(state);
  listeners.forEach((fn) => fn());
}

export function getFavorites() {
  return state;
}

export function subscribeFavorites(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** {name, brand, photo (dataURL|null), season} */
export function addFavorite({ name, brand, photo, season }) {
  const trimmedName = (name || '').trim();
  if (!trimmedName) return;
  const item = {
    id: 'fav' + Date.now() + Math.round(Math.random() * 1000),
    name: trimmedName,
    brand: (brand || '').trim(),
    photo: photo || null,
    season: Object.values(SEASONS).includes(season) ? season : SEASONS.ALL,
    createdAt: Date.now(),
  };
  update([item, ...state]);
  return item;
}

export function removeFavorite(id) {
  update(state.filter((f) => f.id !== id));
}
