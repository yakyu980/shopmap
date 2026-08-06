import { getDepartments, getDepartment } from './storeConfig';

// המרה גסה בין יחידת-מרחק לוגית (על רשת המחלקות) למטרים — לצורך השוואה
// מול הערכת-המרחק שמגיעה ממד-הצעדים הניסיוני.
export const GRID_UNIT_METERS = 9;

export function dist(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/** מסדר מחלקות בסדר שממזער הליכה (Nearest-Neighbor TSP heuristic) מנקודת-פתיחה נתונה. */
export function orderByNearestNeighbor(start, depts) {
  const pool = [...depts];
  const order = [];
  let current = start;
  while (pool.length) {
    pool.sort((a, b) => dist(current, a) - dist(current, b));
    const next = pool.shift();
    order.push(next);
    current = next;
  }
  return order;
}

/**
 * מחשב מסלול-קניה אופטימלי: כל מחלקה שיש בה מוצר-ברשימה מבוקרת פעם
 * אחת בלבד, בסדר שממזער הליכה (Nearest-Neighbor TSP heuristic),
 * החל מהכניסה וכלה בקופות.
 */
export function computeRoute(items) {
  const departments = getDepartments();
  const entrance = departments.find((d) => d.fixed === 'start');
  const checkout = departments.find((d) => d.fixed === 'end');

  const neededDeptIds = [...new Set(items.map((i) => i.department))];
  const neededDepts = neededDeptIds
    .map(getDepartment)
    .filter((d) => d && d.id !== entrance.id && d.id !== checkout.id);

  const order = orderByNearestNeighbor(entrance, neededDepts);

  let totalDistance = dist(entrance, order[0] || checkout);
  for (let i = 0; i < order.length - 1; i++) {
    totalDistance += dist(order[i], order[i + 1]);
  }
  totalDistance += dist(order.length ? order[order.length - 1] : entrance, checkout);

  const stops = order.map((dept) => ({
    department: dept,
    items: items
      .filter((i) => i.department === dept.id)
      .sort((a, b) => a.shelf - b.shelf || a.zone - b.zone),
  }));

  // זמן משוער: 1 יחידת-מרחק ≈ 1.5 דק' הליכה, כל מוצר ≈ 0.7 דק' חיפוש+ליקוט.
  const walkMinutes = totalDistance * 1.5;
  const pickMinutes = items.length * 0.7;
  const estimatedMinutes = Math.max(1, Math.round(walkMinutes + pickMinutes));

  return { stops, entrance, checkout, totalDistance, estimatedMinutes };
}

/**
 * מסדר-מחדש את יתרת-המסלול (מ-fromIndex ואילך) לפי מיקום בפועל שדווח
 * ע"י המשתמש — תחנות שכבר הושלמו (לפני fromIndex) לא נוגעים בהן.
 */
export function reorderRemainingStops(stops, fromIndex, fromPoint) {
  const before = stops.slice(0, fromIndex);
  const remaining = stops.slice(fromIndex);
  if (remaining.length <= 1) return stops;

  const orderedDepts = orderByNearestNeighbor(
    fromPoint,
    remaining.map((s) => s.department)
  );
  const orderedStops = orderedDepts.map((d) =>
    remaining.find((s) => s.department.id === d.id)
  );
  return [...before, ...orderedStops];
}
