// זיהוי-מוצר-לפי-תמונה מדומה: אין כאן מודל-ראייה אמיתי, רק בחירה
// דטרמיניסטית (מ-seed שנגזר מהתמונה עצמה) של כמה "מועמדים" מהקטלוג —
// בדיוק כמו שממשקי-AI אמיתיים מחזירים כמה candidates עם ביטחון-נמוך,
// אבל כאן זה מוצהר-דמה בבירור ב-UI. עתיד להיות מוחלף בשירות-זיהוי אמיתי.

import { PRODUCTS } from '../data/storeData';
import { seededRandom } from './seededRandom';

export function pickCandidates(seedStr, n = 3) {
  const rand = seededRandom(seedStr || 'seed');
  const scored = PRODUCTS.map((p) => ({ p, r: rand() }));
  scored.sort((a, b) => a.r - b.r);
  return scored.slice(0, n).map((s) => s.p);
}
