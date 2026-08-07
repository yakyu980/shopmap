// פונקציה טהורה (בלי I/O — ניתנת לבדיקה ישירה) שממפה תוויות-ImageNet
// (אנגלית, מ-MobileNet) לקטגוריות/שמות בקטלוג שלנו. זה מיפוי-מצומצם
// ומוצהר-משוער — MobileNet מזהה "מה זה חזותית באופן כללי" (לימון,
// בננה, פת-לחם), לא מותג-מוצר-מדויק. אין קשר בין זה לחוסר-הדיוק
// של הפיצ'ר הישן (mock אקראי) — זה זיהוי-אמיתי עם מיפוי-מוצהר-משוער.
const KEYWORD_MAP = [
  { keywords: ['tomato'], match: 'עגבניות' },
  { keywords: ['cucumber'], match: 'מלפפונים' },
  { keywords: ['banana'], match: 'בננות' },
  { keywords: ['lemon'], match: 'לימונים' },
  { keywords: ['orange'], match: 'לימונים' },
  { keywords: ['bell pepper', 'cauliflower', 'broccoli', 'artichoke'], match: 'ירקות' },
  { keywords: ['french loaf', 'bagel', 'bun', 'pretzel', 'baguette'], match: 'לחם' },
  { keywords: ['chocolate sauce', 'chocolate'], match: 'שוקולד' },
  { keywords: ['ice cream', 'ice lolly'], match: 'קינוחים' },
  { keywords: ['wine bottle', 'pop bottle', 'beer bottle', 'water bottle'], match: 'משקאות' },
  { keywords: ['milk can'], match: 'חלב' },
  { keywords: ['cheeseburger'], match: 'גבינות' },
  { keywords: ['soap dispenser', 'lotion'], match: 'טיפוח' },
  { keywords: ['toilet tissue', 'paper towel'], match: 'נייר' },
];

/**
 * predictions: [{className,probability}] מ-classifyImage.
 * products: מערך-הקטלוג (PRODUCTS).
 * מחזיר {matched:[...עד-3 מוצרים], predictedLabel} או null אם אין התאמה.
 */
export function matchPredictionsToCatalog(predictions, products) {
  for (const pred of predictions) {
    const label = (pred.className || '').toLowerCase();
    for (const { keywords, match } of KEYWORD_MAP) {
      if (keywords.some((k) => label.includes(k))) {
        const found = products.filter((p) => p.name.includes(match) || p.category.includes(match));
        if (found.length > 0) {
          return { matched: found.slice(0, 3), predictedLabel: pred.className };
        }
      }
    }
  }
  return null;
}
