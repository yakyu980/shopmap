// פירוק טקסט חופשי בעברית ("אני צריך חלב, קפה וביצים") לרשימת
// מונחי-מוצר גולמיים. פונקציות טהורות (בלי תלות בדפדפן) — קלות לבדיקה
// ישירה בלי להריץ את כל האפליקציה.

const FILLERS = [
  /אני\s+(צריך|צריכה)/g,
  /אני\s+רוצה/g,
  /תוסיפי?/g,
  /בבקשה/g,
  /לרשימה/g,
  /גם\s+/g,
];

export function stripFillers(text) {
  let t = text;
  for (const re of FILLERS) t = t.replace(re, ' ');
  return t.trim();
}

/** מפצל "חלב, קפה וביצים" ל-["חלב", "קפה", "ביצים"]. */
export function splitHebrewList(text) {
  const commaParts = text.split(',');
  const result = [];
  for (const part of commaParts) {
    const subParts = part.split(/\sו(?=[א-ת])/);
    result.push(...subParts);
  }
  return result.map((s) => s.trim()).filter(Boolean);
}

export function parseVoiceListText(text) {
  return splitHebrewList(stripFillers(text));
}
