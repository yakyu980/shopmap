// פירוק טקסט-OCR-גולמי (מ-receiptOcr.js) לשורות-מוצר מובנות: שם/מחיר/
// הנחה-באחוזים. היוריסטיקה פשוטה על טקסט — פונקציות טהורות, ניתנות
// לבדיקה בלי דפדפן/מצלמה. OCR אמיתי לא מושלם; זו הסיבה שהמסך שקורא
// לפונקציות האלה תמיד מציג טבלה ניתנת-לעריכה לפני שמירה, לא שומר
// אוטומטית.

const PRICE_RE = /(\d{1,4}[.,]\d{2})\s*(?:₪|ש"ח|nis)?\s*$/i;
// דורש סימן-מינוס לפני האחוז (כמו "-15%") — לא כל "N%" הוא הנחה: מוצרים
// רבים מכילים אחוז בשם עצמו ("חלב 3%", "יוגורט 5%", "גבינה 9%") בלי
// שום קשר להנחה, ובלי דרישת-המינוס הזו כל שם-כזה נתפס בטעות כמבצע.
const DISCOUNT_RE = /-\s*(\d{1,3})\s*%/;
const NOISE_WORDS = [
  'סה"כ', 'סהכ', 'total', 'מע"מ', 'מעמ', 'עודף', 'מזומן', 'אשראי',
  'תודה', 'קבלה', 'תאריך', 'שעה', "מס' עסק", 'קופה', 'קופאי',
];

function isNoiseLine(line) {
  const low = line.toLowerCase();
  return NOISE_WORDS.some((w) => low.includes(w.toLowerCase()));
}

export function parseReceiptText(rawText) {
  const lines = (rawText || '')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  const items = [];
  for (const line of lines) {
    if (isNoiseLine(line)) continue;

    const priceMatch = line.match(PRICE_RE);
    if (!priceMatch) continue;

    const price = parseFloat(priceMatch[1].replace(',', '.'));
    if (!(price > 0) || price > 2000) continue;

    let name = line.slice(0, priceMatch.index).trim();
    const discountMatch = name.match(DISCOUNT_RE) || line.match(DISCOUNT_RE);
    const discountPercent = discountMatch ? Math.min(99, parseInt(discountMatch[1], 10)) : null;

    name = name.replace(DISCOUNT_RE, '').replace(/[.\-_·•\s]+$/, '').trim();
    if (name.length < 2) continue;

    items.push({ name, price, discountPercent });
  }
  return items;
}

/** התאמה-חלקית (substring) מול קטלוג-המוצרים שלנו — היוריסטיקה, לא זיהוי-ודאי. */
export function matchReceiptItemsToCatalog(items, products) {
  return items.map((item) => {
    const nameLower = item.name.toLowerCase();
    let best = null;
    for (const p of products) {
      const pLower = p.name.toLowerCase();
      if (nameLower.includes(pLower) || pLower.includes(nameLower)) {
        if (!best || p.name.length > best.name.length) best = p;
      }
    }
    return { ...item, matchedProductId: best ? best.id : null };
  });
}
