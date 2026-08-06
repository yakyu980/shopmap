// חישוב כיוון-הליכה "דמה" בין שתי מחלקות על רשת הסופר הלוגית.
// אין כאן שום זיהוי-מצלמה/חיישן אמיתי — רק גיאומטריה על ה-(x,y) של המחלקות,
// מוצג כחץ-כיוון על-גבי תמונת המצלמה (AR overlay פשוט).

export function computeDirection(from, to) {
  const dx = to.x - from.x;
  const dy = to.y - from.y; // y קטן = עמוק יותר בחנות, y גדול = קרוב לכניסה/קופות

  const absX = Math.abs(dx);
  const absY = Math.abs(dy);

  if (absX < 0.4 && absY < 0.4) {
    return { arrow: '📍', label: 'הגעת ליעד', rotation: 0 };
  }

  if (absX >= 0.4 && absY >= 0.4) {
    if (dx > 0 && dy < 0) return { arrow: '↗️', label: 'ימינה וקדימה', rotation: -45 };
    if (dx > 0 && dy > 0) return { arrow: '↘️', label: 'ימינה ואחורה', rotation: 45 };
    if (dx < 0 && dy < 0) return { arrow: '↖️', label: 'שמאלה וקדימה', rotation: -135 };
    return { arrow: '↙️', label: 'שמאלה ואחורה', rotation: 135 };
  }

  if (absX >= absY) {
    return dx > 0
      ? { arrow: '➡️', label: 'פנה ימינה', rotation: -90 }
      : { arrow: '⬅️', label: 'פנה שמאלה', rotation: 90 };
  }

  return dy < 0
    ? { arrow: '⬆️', label: 'המשך ישר קדימה', rotation: 0 }
    : { arrow: '⬇️', label: 'פנה לאחור לכיוון הקופות', rotation: 180 };
}
