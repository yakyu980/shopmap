import { DEPARTMENTS, getDepartment } from '../data/storeData';

function dist(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/**
 * מחשב מסלול-קניה אופטימלי: כל מחלקה שיש בה מוצר-ברשימה מבוקרת פעם
 * אחת בלבד, בסדר שממזער הליכה (Nearest-Neighbor TSP heuristic),
 * החל מהכניסה וכלה בקופות.
 */
export function computeRoute(items) {
  const entrance = DEPARTMENTS.find((d) => d.fixed === 'start');
  const checkout = DEPARTMENTS.find((d) => d.fixed === 'end');

  const neededDeptIds = [...new Set(items.map((i) => i.department))];
  let remaining = neededDeptIds
    .map(getDepartment)
    .filter((d) => d && d.id !== entrance.id && d.id !== checkout.id);

  const order = [];
  let current = entrance;
  while (remaining.length) {
    remaining.sort((a, b) => dist(current, a) - dist(current, b));
    const next = remaining.shift();
    order.push(next);
    current = next;
  }

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
