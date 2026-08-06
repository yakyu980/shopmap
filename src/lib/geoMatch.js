// התאמת מיקום-GPS אמיתי למחלקה לוגית — עובד רק כשיש שתי הנחות
// מתקיימות: (1) יש קליטת-GPS עם דיוק סביר (בד"כ ליד כניסה/חלונות,
// לא בתוך מבנה סגור), (2) למחלקה כוילו-מראש קואורדינטות (ע"י מי
// שערך את המפה, בעמידה בפועל ליד המחלקה ולחיצה על "קבע GPS").

const EARTH_RADIUS_M = 6_371_000;

export function distanceMeters(a, b) {
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** מחזירה את המחלקה-המכוילת הקרובה ביותר אם היא בטווח maxMeters, אחרת null. */
export function matchDepartmentByGps(position, departments, maxMeters) {
  const calibrated = departments.filter((d) => typeof d.lat === 'number' && typeof d.lng === 'number');
  if (calibrated.length === 0) return null;

  let best = null;
  let bestDist = Infinity;
  for (const d of calibrated) {
    const dist = distanceMeters(position, d);
    if (dist < bestDist) {
      bestDist = dist;
      best = d;
    }
  }
  return bestDist <= maxMeters ? best : null;
}
