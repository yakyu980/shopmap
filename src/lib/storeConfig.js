// "מקור-האמת" הניתן-לעדכון למחלקות-הסופר ולגודל-הרשת שלהן — מחליף את
// המערך הקבוע שהיה קודם ב-src/data/storeData.js, כדי לאפשר למשתמש
// לערוך את מפת-החנות שלו (add-only ביחס לקטלוג-המוצרים, שנשאר קבוע).

const STORAGE_KEY = 'supernav_store_config_v1';

export const DEFAULT_DEPARTMENTS = [
  { id: 'entrance', name: 'כניסה', icon: '🚪', x: 0, y: 2, fixed: 'start' },
  { id: 'produce', name: 'ירקות ופירות', icon: '🥦', x: 0, y: 1 },
  { id: 'bakery', name: 'מאפייה', icon: '🥖', x: 1, y: 0 },
  { id: 'dairy', name: 'חלב וגבינות', icon: '🥛', x: 2, y: 0 },
  { id: 'meat', name: 'בשר ודגים', icon: '🍗', x: 3, y: 0 },
  { id: 'drinks', name: 'שתייה', icon: '🥤', x: 3, y: 1 },
  { id: 'cleaning', name: 'ניקיון וטואלטיקה', icon: '🧴', x: 2, y: 1 },
  { id: 'frozen', name: 'קפואים', icon: '🧊', x: 1, y: 1 },
  { id: 'snacks', name: 'חטיפים וממתקים', icon: '🍫', x: 0, y: 0 },
  { id: 'checkout', name: 'קופות', icon: '🛒', x: 1, y: 2, fixed: 'end' },
];

export const DEFAULT_GRID_COLS = 4;
export const DEFAULT_GRID_ROWS = 3;
export const MAX_GRID_SIZE = 6;

function defaultConfig() {
  return {
    departments: DEFAULT_DEPARTMENTS,
    gridCols: DEFAULT_GRID_COLS,
    gridRows: DEFAULT_GRID_ROWS,
  };
}

function loadConfig() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (raw && Array.isArray(raw.departments) && raw.gridCols && raw.gridRows) return raw;
  } catch {
    /* localStorage לא זמין/פגום — נופלים לברירת-המחדל */
  }
  return defaultConfig();
}

function persist(config) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch {
    /* אחסון מלא/חסום — מתעלמים, אין דרך-חלופית ל-store הזה */
  }
}

let state = loadConfig();
const listeners = new Set();

export function getStoreConfig() {
  return state;
}

export function getDepartments() {
  return state.departments;
}

export function getDepartment(id) {
  return state.departments.find((d) => d.id === id);
}

export function subscribeStoreConfig(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function updateStoreConfig(updater) {
  const next = typeof updater === 'function' ? updater(state) : updater;
  state = next;
  persist(state);
  listeners.forEach((fn) => fn());
}

export function resetStoreConfig() {
  updateStoreConfig(defaultConfig());
}

// ---------- פעולות-עריכה טהורות (config-in, config-out) ----------

function slugify(name) {
  const base = name
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '');
  return base || 'dept';
}

function uniqueId(departments, baseName) {
  const base = slugify(baseName);
  let id = base;
  let n = 2;
  const taken = new Set(departments.map((d) => d.id));
  while (taken.has(id)) {
    id = `${base}-${n++}`;
  }
  return id;
}

export function addDepartment(config, { name, icon, x, y }) {
  const trimmedName = (name || '').trim();
  if (!trimmedName) return { ok: false, reason: 'שם המחלקה לא יכול להיות ריק' };
  if (config.departments.some((d) => d.x === x && d.y === y)) {
    return { ok: false, reason: 'התא הזה כבר תפוס' };
  }
  const id = uniqueId(config.departments, trimmedName);
  const dept = { id, name: trimmedName, icon: icon || '📦', x, y };
  return {
    ok: true,
    config: { ...config, departments: [...config.departments, dept] },
  };
}

export function renameDepartment(config, id, { name, icon }) {
  const trimmedName = (name || '').trim();
  if (!trimmedName) return { ok: false, reason: 'שם המחלקה לא יכול להיות ריק' };
  const exists = config.departments.some((d) => d.id === id);
  if (!exists) return { ok: false, reason: 'מחלקה לא נמצאה' };
  return {
    ok: true,
    config: {
      ...config,
      departments: config.departments.map((d) =>
        d.id === id ? { ...d, name: trimmedName, icon: icon || d.icon } : d
      ),
    },
  };
}

export function moveDepartment(config, id, x, y) {
  if (config.departments.some((d) => d.id !== id && d.x === x && d.y === y)) {
    return { ok: false, reason: 'התא הזה כבר תפוס' };
  }
  const exists = config.departments.some((d) => d.id === id);
  if (!exists) return { ok: false, reason: 'מחלקה לא נמצאה' };
  return {
    ok: true,
    config: {
      ...config,
      departments: config.departments.map((d) => (d.id === id ? { ...d, x, y } : d)),
    },
  };
}

/** products: מערך-הקטלוג (PRODUCTS) — עובר כפרמטר כדי לא ליצור תלות מעגלית ב-storeData.js. */
export function removeDepartment(config, id, products) {
  const dept = config.departments.find((d) => d.id === id);
  if (!dept) return { ok: false, reason: 'מחלקה לא נמצאה' };
  if (dept.fixed) return { ok: false, reason: 'לא ניתן למחוק מחלקת-כניסה/קופות' };
  const productCount = products.filter((p) => p.department === id).length;
  if (productCount > 0) {
    return {
      ok: false,
      reason: `לא ניתן למחוק — ${productCount} מוצרים משויכים למחלקה זו`,
    };
  }
  return {
    ok: true,
    config: { ...config, departments: config.departments.filter((d) => d.id !== id) },
  };
}

export function setDepartmentGps(config, id, { lat, lng }) {
  const exists = config.departments.some((d) => d.id === id);
  if (!exists) return { ok: false, reason: 'מחלקה לא נמצאה' };
  return {
    ok: true,
    config: {
      ...config,
      departments: config.departments.map((d) => (d.id === id ? { ...d, lat, lng } : d)),
    },
  };
}

export function clearDepartmentGps(config, id) {
  return {
    ok: true,
    config: {
      ...config,
      departments: config.departments.map((d) => {
        if (d.id !== id) return d;
        const { lat: _lat, lng: _lng, ...rest } = d;
        return rest;
      }),
    },
  };
}

export function resizeGrid(config, { cols, rows }) {
  const nextCols = Math.max(1, Math.min(MAX_GRID_SIZE, cols));
  const nextRows = Math.max(1, Math.min(MAX_GRID_SIZE, rows));
  const cut = config.departments.filter((d) => d.x >= nextCols || d.y >= nextRows);
  if (cut.length > 0) {
    return {
      ok: false,
      reason: `לא ניתן לצמצם — ${cut.map((d) => d.name).join(', ')} ייחתכו`,
    };
  }
  return { ok: true, config: { ...config, gridCols: nextCols, gridRows: nextRows } };
}
