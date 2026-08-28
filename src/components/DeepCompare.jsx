import { useMemo, useState } from 'react';
import { PRODUCTS, searchProducts } from '../data/storeData';
import { getDeepHistory, pctChange } from '../lib/ingredientPriceHistory';
import { getDepartment } from '../lib/storeConfig';
import DeptIcon from './DeptIcon';
import Icon from './Icon';

const RANGE_OPTIONS = [
  { months: 12, label: 'שנה אחרונה' },
  { months: 24, label: 'שנתיים אחרונות' },
  { months: 36, label: '3 שנים אחרונות' },
];

const DEMO_PRODUCT_NAME = 'קפה נמס';

// ממיר סדרת-מחירים לסדרת אחוזי-שינוי מתחילת-התקופה — כך אפשר להציג
// על אותו ציר מוצר-מוגמר (₪) מול חומר-גלם (מדד-בדוי), יחידות שונות
// לגמרי, ועדיין להשוות כיוון-ומהירות-שינוי ביניהם.
function toPctSeries(series) {
  const base = series[0].price;
  return series.map((point) => ({ ...point, pct: ((point.price - base) / base) * 100 }));
}

function LineChart({ productPct, ingredientPct }) {
  const width = 600;
  const height = 160;
  const allValues = [...productPct.map((p) => p.pct), ...(ingredientPct ? ingredientPct.map((p) => p.pct) : [])];
  const maxAbs = Math.max(5, ...allValues.map((v) => Math.abs(v)));
  const n = productPct.length;
  const x = (i) => (n <= 1 ? width / 2 : (i / (n - 1)) * width);
  const y = (pct) => height / 2 - (pct / maxAbs) * (height / 2 - 10);
  const toPoints = (series) => series.map((p, i) => `${x(i)},${y(p.pct)}`).join(' ');

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="deep-compare-chart" role="img" aria-label="גרף השוואת אחוזי-שינוי לאורך זמן">
      <line x1="0" y1={height / 2} x2={width} y2={height / 2} className="deep-compare-chart__zero" />
      <polyline points={toPoints(productPct)} className="deep-compare-chart__line deep-compare-chart__line--product" />
      {ingredientPct && (
        <polyline points={toPoints(ingredientPct)} className="deep-compare-chart__line deep-compare-chart__line--ingredient" />
      )}
    </svg>
  );
}

export default function DeepCompare() {
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState(() => PRODUCTS.find((p) => p.name === DEMO_PRODUCT_NAME)?.id || PRODUCTS[0]?.id);
  const [monthsBack, setMonthsBack] = useState(24);

  const results = useMemo(() => (query.trim() ? searchProducts(query) : []), [query]);
  const product = PRODUCTS.find((p) => p.id === selectedId) || null;
  const dept = product ? getDepartment(product.department) : null;

  const { productSeries, ingredientSeries, ingredientInfo } = useMemo(
    () => (product ? getDeepHistory(product, monthsBack) : { productSeries: [], ingredientSeries: null, ingredientInfo: null }),
    [product, monthsBack],
  );

  const productPct = useMemo(() => (productSeries.length ? toPctSeries(productSeries) : []), [productSeries]);
  const ingredientPct = useMemo(() => (ingredientSeries ? toPctSeries(ingredientSeries) : null), [ingredientSeries]);

  const productChange = pctChange(productSeries);
  const ingredientChange = ingredientSeries ? pctChange(ingredientSeries) : null;

  let insight = null;
  if (ingredientChange != null) {
    if (productChange > 1 && ingredientChange < -1) {
      insight = `המחיר במדף עלה ${productChange}%, בעוד ש${ingredientInfo.name} דווקא הוזל ${Math.abs(ingredientChange)}% — הפער לא מוסבר בעליית מחיר חומר-הגלם.`;
    } else if (productChange < -1 && ingredientChange > 1) {
      insight = `המחיר במדף ירד ${Math.abs(productChange)}%, למרות ש${ingredientInfo.name} התייקר ${ingredientChange}%.`;
    } else if (ingredientChange - productChange > 5) {
      insight = `${ingredientInfo.name} התייקר מהר יותר (${ingredientChange}%) מהמחיר במדף (${productChange}%) — יכול להעיד על שחיקת-רווחיות אצל היצרן, לא ייקור-יתר.`;
    } else if (productChange - ingredientChange > 5) {
      insight = `המחיר במדף עלה מהר יותר (${productChange}%) מ${ingredientInfo.name} (${ingredientChange}%) — עלייה שלא נובעת (רק) מהתייקרות חומר-הגלם.`;
    } else {
      insight = `מחיר המוצר ומחיר ${ingredientInfo.name} נעים בקירוב באותו כיוון ובאותו קצב לאורך התקופה.`;
    }
  }

  return (
    <div className="deep-compare-page">
      <p className="compare-intro">
        השוואה בין מחיר-המדף של מוצר לבין מחיר חומר-הגלם המרכזי שלו לאורך זמן — למשל, מחיר קפה שעולה
        בזמן שמחיר פולי-הקפה הגולמיים דווקא יורד. ⚠️ נתוני חומר-הגלם כאן הם <strong>הדגמה בלבד (mock)</strong>{' '}
        — אין כרגע חיבור אמיתי למדד-סחורות עולמי; המטרה להראות את סוג-התובנה שנתונים אמיתיים היו נותנים.
      </p>

      <label className="official-product-search__field deep-compare-search">
        <Icon name="search" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="חפשו מוצר להשוואה מעמיקה…"
        />
      </label>
      {results.length > 0 && (
        <ul className="deep-compare-results">
          {results.map((p) => (
            <li key={p.id}>
              <button type="button" onClick={() => { setSelectedId(p.id); setQuery(''); }}>
                {p.name}
              </button>
            </li>
          ))}
        </ul>
      )}

      {product && (
        <>
          <div className="deep-compare-header">
            <DeptIcon dept={dept} />
            <span className="deep-compare-header-name">{product.name}</span>
            <span className="deep-compare-header-price">₪{product.price.toFixed(2)}</span>
          </div>

          <div className="compare-filter-bar" role="group" aria-label="טווח-זמן להשוואה">
            {RANGE_OPTIONS.map((opt) => (
              <button
                type="button"
                key={opt.months}
                className={monthsBack === opt.months ? 'is-active' : ''}
                aria-pressed={monthsBack === opt.months}
                onClick={() => setMonthsBack(opt.months)}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <LineChart productPct={productPct} ingredientPct={ingredientPct} />

          <div className="deep-compare-legend">
            <span className="deep-compare-legend-item deep-compare-legend-item--product">
              <i /> {product.name}: {productChange > 0 ? '↑' : productChange < 0 ? '↓' : ''} {Math.abs(productChange)}%
            </span>
            {ingredientInfo && (
              <span className="deep-compare-legend-item deep-compare-legend-item--ingredient">
                <i /> {ingredientInfo.name} ({ingredientInfo.unit}):{' '}
                {ingredientChange > 0 ? '↑' : ingredientChange < 0 ? '↓' : ''} {Math.abs(ingredientChange)}%
              </span>
            )}
          </div>

          {insight ? (
            <p className="deep-compare-insight">
              <Icon name="tag" /> {insight}
            </p>
          ) : (
            <p className="settings-hint">
              אין כרגע נתון חומר-גלם להשוואה עבור קטגוריית "{product.category}". נסו למשל {DEMO_PRODUCT_NAME}, לחם אחיד או
              חלב 3%.
            </p>
          )}
        </>
      )}
    </div>
  );
}
