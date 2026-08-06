// PRNG דטרמיניסטי-פר-seed (אותה תוצאה בכל הרצה עבור אותו seed) — משמש
// לכל mock שצריך "להיראות אקראי" אך להישאר יציב (היסטוריית-מחירים,
// זיהוי-תמונה מדומה).
export function seededRandom(seedStr) {
  let h = 0;
  for (let i = 0; i < seedStr.length; i++) {
    h = (h * 31 + seedStr.charCodeAt(i)) >>> 0;
  }
  return () => {
    h = (h * 1103515245 + 12345) >>> 0;
    return (h % 1000) / 1000;
  };
}
