// נתוני-דוגמה סטטיים לסניף אחד לצורך ה-MVP.
// מיקום כל מחלקה הוא (x,y) על רשת לוגית של הסופר — משמש גם לחישוב
// המסלול האופטימלי וגם לציור מפת החנות.

export const DEPARTMENTS = [
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

export const GRID_COLS = 4;
export const GRID_ROWS = 3;

// כל מדף מחולק ל-15 אזורים: 5 עמודות × 3 שורות (לפי הספסיפיקציה).
export const SHELF_COLS = 5;
export const SHELF_ROWS = 3;

let _nextId = 1;
function product(deptId, name, shelf, zone, price, category) {
  return {
    id: 'p' + _nextId++,
    department: deptId,
    name,
    shelf,
    zone, // 1-15
    price,
    category,
  };
}

export const PRODUCTS = [
  // ירקות ופירות
  product('produce', 'עגבניות', 1, 3, 7.9, 'ירקות'),
  product('produce', 'מלפפונים', 1, 7, 6.9, 'ירקות'),
  product('produce', 'בצל יבש', 1, 12, 4.5, 'ירקות'),
  product('produce', 'תפוחים', 2, 2, 9.9, 'פירות'),
  product('produce', 'בננות', 2, 9, 6.5, 'פירות'),
  product('produce', 'לימונים', 2, 14, 8.9, 'פירות'),

  // מאפייה
  product('bakery', 'לחם אחיד', 1, 1, 6.5, 'לחם'),
  product('bakery', 'חלה', 1, 5, 12.9, 'לחם'),
  product('bakery', 'בגטים', 2, 8, 8.9, 'לחם'),
  product('bakery', 'עוגיות שוקולד', 2, 13, 14.9, 'מאפים'),

  // חלב וגבינות
  product('dairy', 'חלב 3%', 1, 1, 6.9, 'חלב'),
  product('dairy', 'חלב 1%', 1, 2, 6.9, 'חלב'),
  product('dairy', 'גבינה צהובה', 1, 6, 22.9, 'גבינות'),
  product('dairy', 'קוטג׳', 2, 9, 5.9, 'גבינות'),
  product('dairy', 'יוגורט טבעי', 2, 11, 4.5, 'יוגורט'),
  product('dairy', 'חמאה', 3, 15, 9.9, 'חמאה'),

  // בשר ודגים
  product('meat', 'חזה עוף', 1, 4, 34.9, 'עוף'),
  product('meat', 'בשר טחון', 1, 8, 49.9, 'בקר'),
  product('meat', 'סלמון טרי', 2, 12, 59.9, 'דגים'),
  product('meat', 'נקניקיות', 2, 5, 19.9, 'נקניקים'),

  // שתייה
  product('drinks', 'מים מינרלים 6 יח׳', 1, 1, 15.9, 'מים'),
  product('drinks', 'קולה 1.5 ליטר', 1, 6, 8.9, 'משקאות קלים'),
  product('drinks', 'מיץ תפוזים', 2, 10, 11.9, 'מיצים'),
  product('drinks', 'קפה נמס', 2, 14, 24.9, 'קפה'),
  product('drinks', 'תה ירוק', 3, 3, 13.9, 'תה'),

  // ניקיון וטואלטיקה
  product('cleaning', 'שמפו', 1, 2, 18.9, 'טיפוח'),
  product('cleaning', 'סבון כלים', 1, 7, 9.9, 'ניקוי'),
  product('cleaning', 'נייר טואלט 24 יח׳', 2, 11, 32.9, 'נייר'),
  product('cleaning', 'אקונומיקה', 2, 15, 7.9, 'ניקוי'),

  // קפואים
  product('frozen', 'גלידה משפחתית', 1, 3, 22.9, 'קינוחים'),
  product('frozen', 'ירקות קפואים', 1, 9, 10.9, 'ירקות'),
  product('frozen', 'פיצה קפואה', 2, 13, 24.9, 'מוכן'),

  // חטיפים וממתקים
  product('snacks', 'שוקולד חלב', 1, 4, 6.9, 'שוקולד'),
  product('snacks', 'ביסלי', 1, 10, 5.5, 'חטיפים מלוחים'),
  product('snacks', 'עוגיות אוראו', 2, 15, 9.9, 'עוגיות'),
  product('snacks', 'קטשופ', 3, 6, 11.9, 'רטבים'),
  product('snacks', 'אורז', 3, 12, 13.9, 'יבשים'),
];

export function getDepartment(id) {
  return DEPARTMENTS.find((d) => d.id === id);
}

export function getProduct(id) {
  return PRODUCTS.find((p) => p.id === id);
}

export function searchProducts(query) {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return PRODUCTS.filter((p) => p.name.toLowerCase().includes(q));
}

// מיקום קריא: "מדף 4, אזור 8"
export function locationLabel(p) {
  return `מדף ${p.shelf}, אזור ${p.zone}`;
}
