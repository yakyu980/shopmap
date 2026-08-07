// "מקור-האמת" הניתן-לעדכון למחלקות-הסופר ולגודל-הרשת שלהן — מחליף את
// המערך הקבוע שהיה קודם ב-src/data/storeData.js, כדי לאפשר למשתמש
// לערוך את מפת-החנות שלו (add-only ביחס לקטלוג-המוצרים, שנשאר קבוע).

const STORAGE_KEY = 'supernav_store_config_v1';

export const DEFAULT_DEPARTMENTS = [
  { id: 'entrance', name: 'כניסה', icon: '🚪', x: 0, y: 2, fixed: 'start', floor: 'ground' },
  { id: 'produce', name: 'ירקות ופירות', icon: '🥦', x: 0, y: 1, floor: 'ground' },
  { id: 'bakery', name: 'מאפייה', icon: '🥖', x: 1, y: 0, floor: 'ground' },
  { id: 'dairy', name: 'חלב וגבינות', icon: '🥛', x: 2, y: 0, floor: 'ground' },
  { id: 'meat', name: 'בשר ודגים', icon: '🍗', x: 3, y: 0, floor: 'ground' },
  { id: 'drinks', name: 'שתייה', icon: '🥤', x: 3, y: 1, floor: 'ground' },
  { id: 'cleaning', name: 'ניקיון וטואלטיקה', icon: '🧴', x: 2, y: 1, floor: 'ground' },
  { id: 'frozen', name: 'קפואים', icon: '🧊', x: 1, y: 1, floor: 'ground' },
  { id: 'snacks', name: 'חטיפים וממתקים', icon: '🍫', x: 0, y: 0, floor: 'ground' },
  { id: 'checkout', name: 'קופות', icon: '🛒', x: 1, y: 2, fixed: 'end', floor: 'ground' },
];

export const DEFAULT_GRID_COLS = 4;
export const DEFAULT_GRID_ROWS = 3;
export const MAX_GRID_SIZE = 6;
export const MAX_FLOORS = 6;
export const DEFAULT_FLOOR_ID = 'ground';

function defaultConfig() {
  return {
    departments: DEFAULT_DEPARTMENTS,
    gridCols: DEFAULT_GRID_COLS,
    gridRows: DEFAULT_GRID_ROWS,
    floors: [{ id: DEFAULT_FLOOR_ID, name: 'קומת קרקע' }],
    checkpoints: [],
  };
}

// מיגרציה-בטעינה: מסמכים ישנים (לפני קומות/צ'ק-פוינטים) מקבלים קומה
// יחידה ברירת-מחדל וכל המחלקות משויכות אליה — לא שובר תצורה קיימת.
function migrateConfig(raw) {
  const floors = Array.isArray(raw.floors) && raw.floors.length > 0
    ? raw.floors
    : [{ id: DEFAULT_FLOOR_ID, name: 'קומת קרקע' }];
  const defaultFloorId = floors[0].id;
  return {
    ...raw,
    floors,
    checkpoints: Array.isArray(raw.checkpoints) ? raw.checkpoints : [],
    departments: raw.departments.map((d) => (d.floor ? d : { ...d, floor: defaultFloorId })),
  };
}

function loadConfig() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (raw && Array.isArray(raw.departments) && raw.gridCols && raw.gridRows) return migrateConfig(raw);
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

export function addDepartment(config, { name, icon, x, y, floor }) {
  const trimmedName = (name || '').trim();
  if (!trimmedName) return { ok: false, reason: 'שם המחלקה לא יכול להיות ריק' };
  const targetFloor = floor || config.floors[0].id;
  if (config.departments.some((d) => d.x === x && d.y === y && d.floor === targetFloor)) {
    return { ok: false, reason: 'התא הזה כבר תפוס' };
  }
  const id = uniqueId(config.departments, trimmedName);
  const dept = { id, name: trimmedName, icon: icon || '📦', x, y, floor: targetFloor };
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

export function moveDepartment(config, id, x, y, floor) {
  const current = config.departments.find((d) => d.id === id);
  if (!current) return { ok: false, reason: 'מחלקה לא נמצאה' };
  const targetFloor = floor || current.floor;
  if (config.departments.some((d) => d.id !== id && d.x === x && d.y === y && d.floor === targetFloor)) {
    return { ok: false, reason: 'התא הזה כבר תפוס' };
  }
  return {
    ok: true,
    config: {
      ...config,
      departments: config.departments.map((d) => (d.id === id ? { ...d, x, y, floor: targetFloor } : d)),
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

// ---------- קומות + צ'ק-פוינטים (מפה רב-קומתית) ----------

function uniqueCheckpointCode(checkpoints) {
  const taken = new Set(checkpoints.map((c) => c.code));
  let code;
  do {
    code = Math.random().toString(36).slice(2, 8).toUpperCase();
  } while (taken.has(code));
  return code;
}

export function addFloor(config, name) {
  const trimmedName = (name || '').trim();
  if (!trimmedName) return { ok: false, reason: 'שם הקומה לא יכול להיות ריק' };
  if (config.floors.length >= MAX_FLOORS) {
    return { ok: false, reason: `לא ניתן להוסיף יותר מ-${MAX_FLOORS} קומות` };
  }
  const id = uniqueId(
    config.floors.map((f) => ({ id: f.id })),
    trimmedName
  );
  return {
    ok: true,
    config: { ...config, floors: [...config.floors, { id, name: trimmedName }] },
  };
}

/** צ'ק-פוינט = נקודת-ניווט אמיתית (לא מדף) — מקבל קוד ייחודי שמוטמע ב-QR להדפסה/הצבה בחנות. */
export function addCheckpoint(config, { floor, x, y }) {
  const id = 'cp' + Date.now() + Math.round(Math.random() * 1000);
  const code = uniqueCheckpointCode(config.checkpoints);
  const checkpoint = { id, floor, x, y, code };
  return {
    ok: true,
    config: { ...config, checkpoints: [...config.checkpoints, checkpoint] },
  };
}

export function removeCheckpoint(config, id) {
  return {
    ok: true,
    config: { ...config, checkpoints: config.checkpoints.filter((c) => c.id !== id) },
  };
}

export function findCheckpointByCode(config, code) {
  return config.checkpoints.find((c) => c.code === code) || null;
}
