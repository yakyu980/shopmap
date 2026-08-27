// היסטוריית-מחיר רב-שנתית להשוואה מעמיקה: מוצר מוגמר מול חומר-הגלם
// המרכזי שלו (למשל קפה נמס מול פולי-קפה גולמיים). ⚠️ הכל mock
// דטרמיניסטי (seeded) — אין כאן חיבור אמיתי למדדי-סחורות עולמיים
// (כמו ICO/World Bank) או ללשכה-המרכזית-לסטטיסטיקה. המטרה להדגים את
// סוג-התובנה שנתונים אמיתיים היו יכולים לתת (מחיר-מדף עולה בעוד
// שמחיר חומר-הגלם דווקא יורד), לא לשקף מחירים בפועל.

import { seededRandom } from './seededRandom';

const HE_MONTHS = ['ינו', 'פבר', 'מרץ', 'אפר', 'מאי', 'יונ', 'יול', 'אוג', 'ספט', 'אוק', 'נוב', 'דצמ'];

// monthlyBias/volatility בדויים לחלוטין — נבחרו כדי להדגים כיווני-
// שינוי שונים (עולה/יורד/מהיר-יותר-מהמוצר) בין קטגוריות, לא נלקחו
// ממקור-נתונים אמיתי.
export const CATEGORY_INGREDIENTS = {
  'קפה': { name: 'פולי קפה גולמיים', unit: 'מדד עולמי (בדוי)', monthlyBias: -0.006, volatility: 0.05 },
  'לחם': { name: 'חיטה גולמית', unit: 'מדד עולמי (בדוי)', monthlyBias: 0.004, volatility: 0.045 },
  'מאפים': { name: 'חיטה גולמית', unit: 'מדד עולמי (בדוי)', monthlyBias: 0.004, volatility: 0.045 },
  'חלב': { name: 'חלב גולמי', unit: 'מחיר-לחקלאי (בדוי)', monthlyBias: 0.003, volatility: 0.02 },
  'גבינות': { name: 'חלב גולמי', unit: 'מחיר-לחקלאי (בדוי)', monthlyBias: 0.003, volatility: 0.02 },
  'חמאה': { name: 'חלב גולמי', unit: 'מחיר-לחקלאי (בדוי)', monthlyBias: 0.003, volatility: 0.02 },
  'יוגורט': { name: 'חלב גולמי', unit: 'מחיר-לחקלאי (בדוי)', monthlyBias: 0.003, volatility: 0.02 },
  'שוקולד': { name: 'קקאו גולמי', unit: 'מדד עולמי (בדוי)', monthlyBias: 0.012, volatility: 0.08 },
  'משקאות קלים': { name: 'סוכר גולמי', unit: 'מדד עולמי (בדוי)', monthlyBias: -0.004, volatility: 0.04 },
};

export function getIngredientInfo(category) {
  return CATEGORY_INGREDIENTS[category] || null;
}

function monthLabel(monthsAgo) {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - monthsAgo);
  return `${HE_MONTHS[d.getMonth()]}׳${String(d.getFullYear()).slice(2)}`;
}

// בונה סדרה מ-monthsBack חודשים אחורה ועד עכשיו, בהליכה-קדימה
// (מהעבר להווה) כדי ש-monthlyBias יצטבר בכיוון הנכון.
function buildSeries(seedKey, monthsBack, startValue, monthlyBias, volatility) {
  const rand = seededRandom(seedKey);
  let value = startValue / Math.pow(1 + monthlyBias, monthsBack);
  const series = [];
  for (let monthsAgo = monthsBack; monthsAgo >= 0; monthsAgo--) {
    value = Math.max(0.1, value * (1 + monthlyBias + (rand() - 0.5) * volatility));
    series.push({ monthsAgo, label: monthLabel(monthsAgo), price: Math.round(value * 100) / 100 });
  }
  return series;
}

export function getDeepHistory(product, monthsBack = 24) {
  const productSeries = buildSeries(`deep-product-${product.id}-${product.name}`, monthsBack, product.price, 0.003, 0.05);
  // הנקודה האחרונה (עכשיו) תמיד שווה למחיר-המדף האמיתי של המוצר.
  productSeries[productSeries.length - 1].price = product.price;

  const ingredientInfo = getIngredientInfo(product.category);
  const ingredientSeries = ingredientInfo
    ? buildSeries(`deep-ingredient-${product.category}`, monthsBack, 100, ingredientInfo.monthlyBias, ingredientInfo.volatility)
    : null;

  return { productSeries, ingredientSeries, ingredientInfo };
}

export function pctChange(series) {
  if (!series || series.length < 2) return 0;
  const first = series[0].price;
  const last = series[series.length - 1].price;
  return Math.round(((last - first) / first) * 1000) / 10;
}
