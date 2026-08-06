import Icon from './Icon';

// מיפוי-קבוע ל-10 המחלקות המובנות (DEFAULT_DEPARTMENTS ב-storeConfig.js)
// בלבד. מחלקה מותאמת-אישית (dept.icon הוא טקסט-חופשי שהמשתמש הקליד —
// אין סכימת-SVG בשבילה) ממשיכה לרנדר את הטקסט הגולמי שלה בדיוק כמו
// היום, בלי שינוי-סכימה ובלי לשבור מחלקות שכבר נוצרו.
const DEPT_ICON_KEYS = {
  entrance: 'door',
  produce: 'leaf',
  bakery: 'bread',
  dairy: 'milk',
  meat: 'drumstick',
  drinks: 'cup',
  cleaning: 'bottle',
  frozen: 'snowflake',
  snacks: 'choc',
  checkout: 'basket',
};

const SOLID_KEYS = new Set(['leaf', 'bread', 'milk', 'drumstick', 'cup', 'bottle', 'door', 'basket', 'choc']);

export default function DeptIcon({ dept, className }) {
  if (!dept) return null;
  const key = DEPT_ICON_KEYS[dept.id];
  if (key) {
    return <Icon name={key} solid={SOLID_KEYS.has(key)} className={className} />;
  }
  return <span className={className}>{dept.icon}</span>;
}
