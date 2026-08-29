import { useRef, useState } from 'react';
import { PRODUCTS, getSaleProducts, locationLabel } from '../data/storeData';
import { getDepartment } from '../lib/storeConfig';
import { getPriceHistory, priceTrend } from '../lib/priceHistory';
import { useReceiptHistory } from '../lib/useReceiptHistory';
import { deleteReceipt } from '../lib/receiptHistory';
import { addCompareProduct } from '../lib/compareProducts';
import PriceTag from './PriceTag';
import ReceiptScanner from './ReceiptScanner';
import MultiProductCompare from './MultiProductCompare';
import Icon from './Icon';
import DeptIcon from './DeptIcon';
import DealsTab from './DealsTab';
import DeepCompare from './DeepCompare';
import PurchaseHistoryCompare from './PurchaseHistoryCompare';

const COMPARE_TABS = [
  { id: 'compare', icon: 'tag', label: 'השוואת מחירים' },
  { id: 'deals', icon: 'star', label: 'דילים' },
  { id: 'deep', icon: 'chart', label: 'השוואה מעמיקה' },
  { id: 'history', icon: 'receipt', label: 'קניות קודמות' },
];

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
  const [activeTab, setActiveTab] = useState('compare');
  const [scannerOpen, setScannerOpen] = useState(false);
  const [justAddedId, setJustAddedId] = useState(null);
  const justAddedTimer = useRef(null);
  const saleProducts = getSaleProducts();
  const receipts = useReceiptHistory();

  function handleAddToCompare(product) {
    addCompareProduct({ id: `catalog-${product.barcode}`, barcode: product.barcode, name: product.name, price: product.price });
    setJustAddedId(product.id);
    clearTimeout(justAddedTimer.current);
    justAddedTimer.current = setTimeout(() => setJustAddedId(null), 1500);
  }

  return (
    <div className="compare-hub">
      <h1 className="compare-hub__title">השוואת מחירים</h1>
      <div className="compare-hub__tabs" role="tablist" aria-label="סוג השוואה">
        {COMPARE_TABS.map((tab) => <button type="button" role="tab" aria-selected={activeTab === tab.id} className={activeTab === tab.id ? 'is-active' : ''} key={tab.id} onClick={() => setActiveTab(tab.id)}><Icon name={tab.icon} /><span>{tab.label}</span></button>)}
      </div>
      {activeTab === 'deals' && <DealsTab />}
      {activeTab === 'deep' && <DeepCompare />}
      {activeTab === 'history' && <PurchaseHistoryCompare />}
      {activeTab === 'compare' && <div className="compare-page">
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

      <p className="settings-hint">
        <Icon name="tag" /> מחפשים דילים אמיתיים בין הרשתות? עברו ללשונית "דילים" למעלה.
      </p>

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
      </div>}
    </div>
  );
}
