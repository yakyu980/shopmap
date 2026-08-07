import { useEffect, useState } from 'react';
import { PRODUCTS, getSaleProducts, locationLabel } from '../data/storeData';
import { getDepartment } from '../lib/storeConfig';
import { getPriceHistory, priceTrend } from '../lib/priceHistory';
import { useReceiptHistory } from '../lib/useReceiptHistory';
import { deleteReceipt } from '../lib/receiptHistory';
import { useAuth } from '../lib/useAuth';
import { api } from '../lib/apiClient';
import PriceTag from './PriceTag';
import ProductDetail from './ProductDetail';
import ReceiptScanner from './ReceiptScanner';
import Icon from './Icon';
import DeptIcon from './DeptIcon';

function ProductRow({ product, onOpen }) {
  const dept = getDepartment(product.department);
  const trend = priceTrend(getPriceHistory(product));
  return (
    <li className="compare-row" onClick={() => onOpen(product)}>
      <span className="compare-icon">
        <DeptIcon dept={dept} />
      </span>
      <span className="compare-info">
        <span className="compare-name">{product.name}</span>
        <span className="compare-loc">
          {dept.name} · {locationLabel(product)}
        </span>
      </span>
      {trend.rising && <span className="trend trend--up">↑ {trend.diffPct}%</span>}
      {trend.falling && <span className="trend trend--down">↓ {Math.abs(trend.diffPct)}%</span>}
      <PriceTag product={product} size="small" />
    </li>
  );
}

export default function PriceComparison({ list }) {
  const [detailProduct, setDetailProduct] = useState(null);
  const [scannerOpen, setScannerOpen] = useState(false);
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

  function openDealProduct(deal) {
    const product = PRODUCTS.find((p) => p.id === deal.productId);
    if (product) setDetailProduct(product);
  }

  return (
    <div className="compare-page">
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
              <ProductRow key={p.id} product={p} onOpen={setDetailProduct} />
            ))}
          </ul>
        </>
      )}

      <p className="section-title">כל המוצרים</p>
      <ul className="compare-list">
        {PRODUCTS.map((p) => (
          <ProductRow key={p.id} product={p} onOpen={setDetailProduct} />
        ))}
      </ul>

      {detailProduct && (
        <ProductDetail
          product={detailProduct}
          onClose={() => setDetailProduct(null)}
          onAdd={(p) => {
            list.addItem(p);
            setDetailProduct(null);
          }}
          onSwap={(alt) => {
            list.removeItem(detailProduct.id);
            list.addItem(alt);
            setDetailProduct(null);
          }}
        />
      )}
    </div>
  );
}
