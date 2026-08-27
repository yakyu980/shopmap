import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { useAuth } from '../lib/useAuth';
import { api } from '../lib/apiClient';
import { addCompareProduct } from '../lib/compareProducts';
import {
  getChainFilter,
  getHiddenComparisonVenues,
  isVenueVisible,
  subscribeComparisonVenues,
} from '../lib/comparisonVenues';
import VenueFilterPanel from './VenueFilterPanel';
import Icon from './Icon';

// מסנן כל דיל לפי הרשתות/סניפים הנבחרים (אותו מנגנון בדיוק כמו
// MultiProductCompare — מסנן-הרשתות משותף לשתי הלשוניות), ומחשב-מחדש
// זול/יקר-ביותר ואחוז-הפער מתוך השורות שנשארו אחרי הסינון.
function applyVenueFilter(deal) {
  const rows = deal.rows.filter((row) => isVenueVisible(row.venueName));
  if (rows.length < 2) return null;
  const sorted = [...rows].sort((a, b) => a.price - b.price);
  const cheapest = sorted[0];
  const priciest = sorted[sorted.length - 1];
  const diffPercent = priciest.price > 0 ? Math.round(((priciest.price - cheapest.price) / priciest.price) * 100) : 0;
  return { ...deal, cheapest, priciest, diffPercent };
}

export default function DealsTab() {
  const { user } = useAuth();
  const [deals, setDeals] = useState(null); // null = לא-נטען-עדיין/לא-מחובר
  const [venueFilterOpen, setVenueFilterOpen] = useState(false);
  const [addedBarcode, setAddedBarcode] = useState(null);
  const chainFilter = useSyncExternalStore(subscribeComparisonVenues, getChainFilter);
  const hiddenVenues = useSyncExternalStore(subscribeComparisonVenues, getHiddenComparisonVenues);

  useEffect(() => {
    if (!user) {
      setDeals(null);
      return;
    }
    let cancelled = false;
    api
      .get('/deals')
      .then((data) => {
        if (!cancelled) setDeals(data.deals);
      })
      .catch(() => {
        /* השרת לא זמין — נשארים במצב-לא-נטען */
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  const allVenueNames = useMemo(() => {
    if (!deals) return [];
    const names = new Set();
    deals.forEach((deal) => deal.rows.forEach((row) => names.add(row.venueName)));
    return [...names];
  }, [deals]);

  const filteredDeals = useMemo(() => {
    if (!deals) return [];
    return deals
      .map(applyVenueFilter)
      .filter(Boolean)
      // תלוי גם ב-chainFilter/hiddenVenues כדי להתעדכן כשהמסנן משתנה
      // (isVenueVisible קורא ישירות מה-module state, לא מקבל אותו כפרמטר).
      .sort((a, b) => b.diffPercent - a.diffPercent);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deals, chainFilter, hiddenVenues]);

  function handleAddDeal(deal) {
    addCompareProduct({ id: `catalog-${deal.barcode}`, barcode: deal.barcode, name: deal.name, price: deal.cheapest.price });
    setAddedBarcode(deal.barcode);
    setTimeout(() => setAddedBarcode((current) => (current === deal.barcode ? null : current)), 1500);
  }

  return (
    <div className="compare-page">
      <p className="compare-intro">
        דילים אמיתיים בין הרשתות שלך — מבוססים על מחירים-רשמיים שייבאתם (⚙️ הגדרות, לפי חוק שקיפות
        המחירים) ועל קבלות שסרקתם. לא feed חי מהאינטרנט, רק על מה שכבר יש לכם בפועל.
      </p>

      <button type="button" className="btn btn--ghost compare-venues-button" onClick={() => setVenueFilterOpen(true)}>
        <Icon name="tag" /> רשתות: {chainFilter.showAllChains ? 'כל הרשתות' : (chainFilter.selectedChains.join(', ') || 'לא נבחרה רשת')}
      </button>
      {venueFilterOpen && <VenueFilterPanel venueNames={allVenueNames} onClose={() => setVenueFilterOpen(false)} />}

      {!user ? (
        <p className="settings-hint">התחברו (⚙️ הגדרות) כדי לראות דילים משותפים למשפחה בין הרשתות.</p>
      ) : deals === null ? (
        <p className="settings-hint">טוען…</p>
      ) : deals.length === 0 ? (
        <p className="settings-hint">
          אין עדיין מספיק נתונים להשוואה — ייבאו מחירים-רשמיים (⚙️ הגדרות) או סרקו קבלות מכמה חנויות
          שונות כדי לראות כאן דילים אמיתיים.
        </p>
      ) : filteredDeals.length === 0 ? (
        <p className="settings-hint">
          אין דילים עם 2+ מחירים בתוך הרשתות/הסניפים שנבחרו — נסו "כל הרשתות" בכפתור למעלה.
        </p>
      ) : (
        <ul className="deals-list">
          {filteredDeals.map((deal) => (
            <li key={deal.productId} className="deal-row" onClick={() => handleAddDeal(deal)}>
              <span className="deal-name">{deal.name}</span>
              <span className="deal-prices">
                <span className="deal-cheapest">₪{deal.cheapest.price.toFixed(2)} · {deal.cheapest.venueName}</span>
                <span className="deal-priciest">₪{deal.priciest.price.toFixed(2)} · {deal.priciest.venueName}</span>
              </span>
              {addedBarcode === deal.barcode ? (
                <span className="compare-added-badge">
                  <Icon name="check" /> נוסף
                </span>
              ) : (
                deal.diffPercent > 0 && <span className="deal-diff">-{deal.diffPercent}%</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
