import { useEffect, useRef, useState } from 'react';
import { PRODUCTS, getSaleProducts, locationLabel } from '../data/storeData';
import { getDepartment } from '../lib/storeConfig';
import { getPriceHistory, priceTrend } from '../lib/priceHistory';
import { useReceiptHistory } from '../lib/useReceiptHistory';
import { deleteReceipt } from '../lib/receiptHistory';
import { useAuth } from '../lib/useAuth';
import { api } from '../lib/apiClient';
import { addCompareProduct } from '../lib/compareProducts';
import PriceTag from './PriceTag';
import ReceiptScanner from './ReceiptScanner';
import MultiProductCompare from './MultiProductCompare';
import Icon from './Icon';
import DeptIcon from './DeptIcon';

// לחיצה על מוצר בטאב הזה מוסיפה אותו ישירות לטבלת ההשוואה-המרובה
// שלמעלה (MultiProductCompare) — לא פותחת חלון-פרטים נפרד (ProductDetail
// עדיין קיים, ומשמש בניווט ובסורק-הברקוד, פשוט לא כאן).
function ProductRow({ product, onAdd, justAdded }) {
  const dept = getDepartment(product.department);
  const trend = priceTrend(getPriceHistory(product));
  return (
    <li className="compare-row" onClick={() => onAdd(product)}>
      <span className="compare-icon">
        <DeptIcon dept={dept} />
      </span>
      <span className="compare-info">
        <span className="compare-name">{product.name}</span>
        <span className="compare-loc">
          {dept.name} · {locationLabel(product)}
        </span>
      </span>
      {justAdded ? (
        <span className="compare-added-badge">
          <Icon name="check" /> נוסף להשוואה
        </span>
      ) : (
        <>
          {trend.rising && <span className="trend trend--up">↑ {trend.diffPct}%</span>}
          {trend.falling && <span className="trend trend--down">↓ {Math.abs(trend.diffPct)}%</span>}
        </>
      )}
      <PriceTag product={product} size="small" />
    </li>
  );
}

export default function PriceComparison() {
  const [scannerOpen, setScannerOpen] = useState(false);
  const [justAddedId, setJustAddedId] = useState(null);
  const justAddedTimer = useRef(null);
  const saleProducts = getSaleProducts();
  const receipts = useReceiptHistory();
  const { user } = useAuth();
  const [deals, setDeals] = useState(null); // null = לא-נטען-עדיין/לא-מחובר

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

  useEffect(() => () => clearTimeout(justAddedTimer.current), []);

  function handleAddToCompare(product) {
    addCompareProduct({ id: `catalog-${product.barcode}`, barcode: product.barcode, name: product.name, price: product.price });
    setJustAddedId(product.id);
    clearTimeout(justAddedTimer.current);
    justAddedTimer.current = setTimeout(() => setJustAddedId(null), 1500);
  }

  function openDealProduct(deal) {
    const product = PRODUCTS.find((p) => p.id === deal.productId);
    if (product) handleAddToCompare(product);
  }

  return (
    <div className="compare-page">
      <p className="section-title">
        <Icon name="tag" /> השוואת מוצרים מרובים בין רשתות
      </p>
      <MultiProductCompare />

      <p className="compare-intro">
        השוואת מחירים והיסטוריית-מחיר לכל מוצר בקטלוג. נתוני ההיסטוריה הכללית כאן הם
        הדמיה (mock) — אבל אפשר לבנות היסטוריה אמיתית משלכם, לפי מה ששילמתם בפועל.
      </p>

      <button className="btn btn--primary compare-scan-btn" onClick={() => setScannerOpen(true)}>
        <Icon name="receipt" /> סרוק קבלה להשוואה אישית
      </button>
      {scannerOpen && <ReceiptScanner onClose={() => setScannerOpen(false)} />}

      <p className="section-title">
        <Icon name="tag" /> דילים בין הרשתות שלך
      </p>
      {!user ? (
        <p className="settings-hint">התחברו (⚙️ הגדרות) כדי לראות דילים משותפים למשפחה בין הרשתות.</p>
      ) : deals === null ? (
        <p className="settings-hint">טוען…</p>
      ) : deals.length === 0 ? (
        <p className="settings-hint">
          אין עדיין מספיק נתונים להשוואה — ייבאו מחירים-רשמיים (⚙️ הגדרות) או סרקו קבלות מכמה חנויות
          שונות כדי לראות כאן דילים אמיתיים.
        </p>
      ) : (
        <ul className="deals-list">
          {deals.map((deal) => (
            <li key={deal.productId} className="deal-row" onClick={() => openDealProduct(deal)}>
              <span className="deal-name">{deal.name}</span>
              <span className="deal-prices">
                <span className="deal-cheapest">₪{deal.cheapest.price.toFixed(2)} · {deal.cheapest.venueName}</span>
                <span className="deal-priciest">₪{deal.priciest.price.toFixed(2)} · {deal.priciest.venueName}</span>
              </span>
              {deal.diffPercent > 0 && <span className="deal-diff">-{deal.diffPercent}%</span>}
            </li>
          ))}
        </ul>
      )}

      {receipts.length > 0 && (
        <>
          <p className="section-title">
            <Icon name="receipt" /> הקבלות שסרקתי ({receipts.length})
          </p>
          <ul className="receipt-history-list">
            {receipts.map((r) => {
              const total = r.items.reduce((s, i) => s + i.price, 0);
              return (
                <li key={r.id} className="receipt-history-row">
                  <span>
                    {new Date(r.date).toLocaleDateString('he-IL')} · {r.items.length} פריטים · ₪
                    {total.toFixed(2)}
                  </span>
                  <button
                    className="btn btn--icon btn--danger"
                    onClick={() => deleteReceipt(r.id)}
                    aria-label="מחק קבלה"
                  >
                    <Icon name="trash" />
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      )}

      {saleProducts.length > 0 && (
        <>
          <p className="section-title">
            <Icon name="tag" /> מבצעים היום
          </p>
          <ul className="compare-list">
            {saleProducts.map((p) => (
              <ProductRow key={p.id} product={p} onAdd={handleAddToCompare} justAdded={justAddedId === p.id} />
            ))}
          </ul>
        </>
      )}

      <p className="section-title">כל המוצרים</p>
      <p className="settings-hint">לחצו על מוצר כדי להוסיף אותו לטבלת ההשוואה שלמעלה.</p>
      <ul className="compare-list">
        {PRODUCTS.map((p) => (
          <ProductRow key={p.id} product={p} onAdd={handleAddToCompare} justAdded={justAddedId === p.id} />
        ))}
      </ul>
    </div>
  );
}
