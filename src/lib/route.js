import { getDepartments, getDepartment } from './storeConfig.js';

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

// Refresh item snapshots without losing completed stops or a manually reordered route.
// New items in a completed department make that department pending again.
export function reconcileRoute(previousStops, stopIndex, nextStops, fromPoint) {
  const byDepartment = new Map(nextStops.map((stop) => [stop.department.id, stop]));
  const sameMembership = previousStops.length === nextStops.length && previousStops.every((stop) => {
    const next = byDepartment.get(stop.department.id);
    return next && next.items.length === stop.items.length &&
      next.items.every((item) => stop.items.some((old) => old.id === item.id));
  });
  if (sameMembership) {
    return { stops: previousStops.map((stop) => byDepartment.get(stop.department.id)), stopIndex };
  }

  const completed = previousStops.slice(0, stopIndex).flatMap((stop) => {
    const next = byDepartment.get(stop.department.id);
    return next && next.items.every((item) => stop.items.some((old) => old.id === item.id)) ? [next] : [];
  });
  const completedIds = new Set(completed.map((stop) => stop.department.id));
  const remaining = nextStops.filter((stop) => !completedIds.has(stop.department.id));
  const current = remaining.find((stop) => stop.department.id === previousStops[stopIndex]?.department.id);
  const rest = remaining.filter((stop) => stop !== current);
  const ordered = orderByNearestNeighbor(current?.department || fromPoint, rest.map((stop) => stop.department))
    .map((department) => byDepartment.get(department.id));
  return { stops: [...completed, ...(current ? [current] : []), ...ordered], stopIndex: completed.length };
}
