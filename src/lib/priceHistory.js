// היסטוריית מחירים — mock דטרמיניסטי (זהה בכל טעינה) לפי מזהה המוצר,
// עתיד להיות מוחלף בנתונים אמיתיים מהשרת.

import { seededRandom } from './seededRandom';

const MONTHS = ['פבר', 'מרץ', 'אפר', 'מאי', 'יונ', 'יול'];

export function getPriceHistory(product) {
  const rand = seededRandom(product.id + product.name);
  let price = product.price * (0.85 + rand() * 0.1);
  const history = MONTHS.map((month) => {
    price = Math.max(1, price * (0.94 + rand() * 0.12));
    return { month, price: Math.round(price * 100) / 100 };
  });
  history.push({ month: 'עכשיו', price: product.price });
  return history;
}

export function priceTrend(history) {
  const first = history[0].price;
  const last = history[history.length - 1].price;
  const diffPct = ((last - first) / first) * 100;
  return { diffPct: Math.round(diffPct), rising: diffPct > 1, falling: diffPct < -1 };
}
