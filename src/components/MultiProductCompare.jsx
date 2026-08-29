import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import OfficialProductSearch from './OfficialProductSearch';
import ScanProductModal from './ScanProductModal';
import VenueFilterPanel from './VenueFilterPanel';
import Icon from './Icon';
import { api } from '../lib/apiClient';
import {
  getChainFilter,
  getHiddenComparisonVenues,
  isVenueVisible,
  subscribeComparisonVenues,
} from '../lib/comparisonVenues';
import {
  addCompareProduct,
  clearCompareProducts,
  getCompareProducts,
  removeCompareProduct,
  subscribeCompareProducts,
} from '../lib/compareProducts';

function priceForVenue(rows, venueName) {
  const matches = rows.filter((row) => row.venueName === venueName && Number.isFinite(row.price));
  return matches.length ? Math.min(...matches.map((row) => row.price)) : null;
}

function rowForVenue(rows, venueName) {
  const matches = rows.filter((row) => row.venueName === venueName && Number.isFinite(row.price));
  return matches.sort((a, b) => a.price - b.price)[0] || null;
}

function bestPublicOffer(row) {
  if (!row) return null;
  const eligible = (row.promotions || []).filter((promo) => !promo.clubOnly && (!promo.minQuantity || promo.minQuantity <= 1) && Number.isFinite(promo.discountedPrice));
  return eligible.sort((a, b) => a.discountedPrice - b.discountedPrice)[0] || null;
}

export default function MultiProductCompare() {
  const products = useSyncExternalStore(subscribeCompareProducts, getCompareProducts);
  const [priceRows, setPriceRows] = useState({});
  const [scanOpen, setScanOpen] = useState(false);
  const [venueFilterOpen, setVenueFilterOpen] = useState(false);
  const [filter, setFilter] = useState('all');
  const chainFilter = useSyncExternalStore(subscribeComparisonVenues, getChainFilter);
  const hiddenVenues = useSyncExternalStore(subscribeComparisonVenues, getHiddenComparisonVenues);

  useEffect(() => {
    const missing = products.filter((product) => !priceRows[product.barcode]);
    if (!missing.length) return undefined;
    missing.forEach((product) => {
      setPriceRows((current) => ({ ...current, [product.barcode]: { status: 'loading', rows: [] } }));
      api.get(`/price-import/${product.barcode}`)
        .then((data) => {
          setPriceRows((current) => ({ ...current, [product.barcode]: { status: 'ready', rows: data.rows || [] } }));
        })
        .catch(() => {
          setPriceRows((current) => ({ ...current, [product.barcode]: { status: 'error', rows: [] } }));
        });
    });
    return undefined;
  }, [products, priceRows]);

  function removeProduct(barcode) {
    removeCompareProduct(barcode);
    setPriceRows((current) => { const next = { ...current }; delete next[barcode]; return next; });
  }

  const allVenueNames = useMemo(() => {
    const names = new Set();
    Object.values(priceRows).forEach((entry) => entry.rows.forEach((row) => {
      if (Number.isFinite(row.price)) names.add(row.venueName);
    }));
    return [...names];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [priceRows]);

  const venues = useMemo(
    () => allVenueNames.filter(isVenueVisible),
    // תלוי גם ב-chainFilter/hiddenVenues כדי להתעדכן כשהמסנן משתנה
    // (isVenueVisible קורא ישירות מה-module state, לא מקבל אותו כפרמטר).
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [allVenueNames, chainFilter, hiddenVenues],
  );

  const productStats = useMemo(() => products.map((product) => {
    const rows = priceRows[product.barcode]?.rows || [];
    const prices = venues.map((venue) => priceForVenue(rows, venue)).filter(Number.isFinite);
    return { product, rows, coverage: prices.length, spread: prices.length > 1 ? Math.max(...prices) - Math.min(...prices) : 0 };
  }), [priceRows, products, venues]);

  const shownProducts = productStats.filter(({ coverage, spread }) => (
    filter === 'priced' ? coverage > 0 : filter === 'savings' ? spread > 0 : true
  ));
  const totals = venues.map((venue) => {
    const prices = productStats.map(({ rows }) => priceForVenue(rows, venue));
    return { venue, matched: prices.filter(Number.isFinite).length, total: prices.reduce((sum, price) => sum + (price || 0), 0) };
  }).sort((a, b) => b.matched - a.matched || a.total - b.total);
  const fullTotals = totals.filter((item) => item.matched === products.length && products.length > 0);
  const savings = fullTotals.length > 1 ? fullTotals[fullTotals.length - 1].total - fullTotals[0].total : null;

  return (
    <section className="price-compare-focus" aria-label="השוואת מחירי מוצרים מרובים בין רשתות">
      <div className="compare-search-row">
        <OfficialProductSearch onSelect={addCompareProduct} placeholder="חפשו מוצר והוסיפו להשוואה…" />
        <button type="button" className="btn btn--ghost compare-camera-button" onClick={() => setScanOpen(true)} aria-label="סריקת ברקוד להשוואה"><Icon name="camera" /></button>
      </div>
      <button type="button" className="btn btn--ghost compare-venues-button" onClick={() => setVenueFilterOpen(true)}>
        <Icon name="tag" /> רשתות: {chainFilter.showAllChains ? 'כל הרשתות' : (chainFilter.selectedChains.join(', ') || 'לא נבחרה רשת')}
      </button>
      {scanOpen && <ScanProductModal onAdd={(selected) => { addCompareProduct(selected); setScanOpen(false); }} onClose={() => setScanOpen(false)} />}
      {venueFilterOpen && <VenueFilterPanel venueNames={allVenueNames} onClose={() => setVenueFilterOpen(false)} />}
      {!products.length ? (
        <div className="price-compare-focus__empty"><Icon name="tag" /><strong>בחרו מוצרים להשוואה</strong><span>חפשו או סרקו מוצר. אפשר להוסיף כמה מוצרים ולקבל טבלת מחירים וסיכום חיסכון.</span></div>
      ) : (
        <>
          <div className="compare-filter-bar" role="group" aria-label="סינון מוצרי ההשוואה">
            <span>{products.length} מוצרים</span>
            {[['all', 'הכול'], ['priced', 'עם מחיר'], ['savings', 'עם פער מחיר']].map(([id, label]) => <button type="button" key={id} className={filter === id ? 'is-active' : ''} aria-pressed={filter === id} onClick={() => setFilter(id)}>{label}</button>)}
            <button type="button" className="compare-clear-button" onClick={() => { clearCompareProducts(); setPriceRows({}); }}>ניקוי</button>
          </div>
          <div className="compare-matrix-wrap" tabIndex="0" aria-label="טבלת השוואת מחירים, ניתן לגלול לצדדים">
            <table className="compare-matrix">
              <thead><tr><th scope="col">מוצר</th>{venues.map((venue) => <th scope="col" key={venue}>{venue}</th>)}<th scope="col">הזול ביותר</th></tr></thead>
              <tbody>{shownProducts.map(({ product, rows }) => {
                const cells = venues.map((venue) => priceForVenue(rows, venue));
                const available = cells.filter(Number.isFinite);
                const cheapest = available.length ? Math.min(...available) : null;
                const cheapestVenue = cheapest == null ? null : venues.find((venue) => priceForVenue(rows, venue) === cheapest);
                const status = priceRows[product.barcode]?.status;
                return <tr key={product.barcode}>
                  <th scope="row"><span>{product.name}</span><small dir="ltr">{product.barcode}</small><button type="button" onClick={() => removeProduct(product.barcode)} aria-label={`הסרת ${product.name} מההשוואה`}>הסרה</button></th>
                  {venues.map((venue) => {
                    const row = rowForVenue(rows, venue);
                    const price = row?.price ?? null;
                    const offer = bestPublicOffer(row);
                    const clubOffer = (row?.promotions || []).find((promo) => promo.clubOnly);
                    return <td key={venue} className={price != null && price === cheapest ? 'is-cheapest' : ''}>{price == null ? <span className="compare-no-price">—</span> : <>
                      <strong>₪{price.toFixed(2)}</strong>
                      {offer && <small className="compare-promo">מבצע: ₪{offer.discountedPrice.toFixed(2)}{offer.description ? ` · ${offer.description}` : ''}</small>}
                      {clubOffer && <small>מבצע מועדון — לא חושב כמחיר רגיל</small>}
                      {price === cheapest && <small>הכי זול במחיר רגיל</small>}
                      <small className={row.stale ? 'compare-source is-stale' : 'compare-source'}>{row.stale ? 'המחיר האחרון שפורסם' : 'מחיר רשמי מעודכן'} · {new Date(row.sourceUpdatedAt).toLocaleDateString('he-IL')}</small>
                    </>}</td>;
                  })}
                  <td className="compare-best-cell">
                    {status === 'loading' ? 'טוען…' : status === 'error' ? 'שגיאה' : cheapest == null ? 'אין מחיר' : (
                      <>
                        <strong>₪{cheapest.toFixed(2)}</strong>
                        {cheapestVenue && <small>{cheapestVenue}</small>}
                      </>
                    )}
                  </td>
                </tr>;
              })}</tbody>
            </table>
          </div>
          {!shownProducts.length && <p className="cmp-empty">אין מוצרים שמתאימים למסנן שנבחר.</p>}
          <div className="compare-summary" aria-live="polite">
            <div><small>מוצרים שנבדקו</small><strong>{products.length}</strong><span>מתוך {products.length}</span></div>
            <div><small>הסופר המשתלם לסל מלא</small><strong>{fullTotals[0]?.venue || 'אין עדיין מספיק נתונים'}</strong><span>{fullTotals[0] ? `₪${fullTotals[0].total.toFixed(2)}` : 'נדרשים מחירים לכל המוצרים'}</span></div>
            <div><small>חיסכון אפשרי</small><strong>{savings == null ? '—' : `₪${savings.toFixed(2)}`}</strong><span>{savings == null ? 'נדרשים לפחות שני סלים מלאים' : 'לעומת הסל המלא היקר ביותר'}</span></div>
          </div>
        </>
      )}
    </section>
  );
}
