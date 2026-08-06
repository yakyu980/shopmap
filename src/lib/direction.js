// חישוב כיוון-הליכה "דמה" בין שתי מחלקות על רשת הסופר הלוגית.
// אין כאן שום זיהוי-מצלמה/חיישן אמיתי — רק גיאומטריה על ה-(x,y) של המחלקות,
// מוצג כחץ-כיוון (סמל SVG אחד, מסתובב) על-גבי תמונת המצלמה (AR overlay פשוט).
//
// `rotation` מחושב יחסית לסמל-חץ שמצביע שמאלה כברירת-מחדל (בדיוק כמו
// ic-arrow-left): שמאלה=0°, למעלה=90°, ימינה=180°, למטה=270° (סיבוב
// עם כיוון-השעון, תואם ל-CSS transform:rotate()).

export function computeDirection(from, to) {
  const dx = to.x - from.x;
  const dy = to.y - from.y; // y קטן = עמוק יותר בחנות, y גדול = קרוב לכניסה/קופות

  const absX = Math.abs(dx);
  const absY = Math.abs(dy);

  if (absX < 0.4 && absY < 0.4) {
    return { arrived: true, label: 'הגעת ליעד', rotation: 0 };
  }

  if (absX >= 0.4 && absY >= 0.4) {
    if (dx > 0 && dy < 0) return { label: 'ימינה וקדימה', rotation: 135 };
    if (dx > 0 && dy > 0) return { label: 'ימינה ואחורה', rotation: 225 };
    if (dx < 0 && dy < 0) return { label: 'שמאלה וקדימה', rotation: 45 };
    return { label: 'שמאלה ואחורה', rotation: 315 };
  }

  if (absX >= absY) {
    return dx > 0 ? { label: 'פנה ימינה', rotation: 180 } : { label: 'פנה שמאלה', rotation: 0 };
  }

  return dy < 0
    ? { label: 'המשך ישר קדימה', rotation: 90 }
    : { label: 'פנה לאחור לכיוון הקופות', rotation: 270 };
}
