import { useState } from 'react';
import { PRODUCTS, getSaleProducts, locationLabel } from '../data/storeData';
import { getDepartment } from '../lib/storeConfig';
import { getPriceHistory, priceTrend } from '../lib/priceHistory';
import PriceTag from './PriceTag';
import ProductDetail from './ProductDetail';

// הרחבה-עתידית (לא מומשת כאן): להרחיב את purchaseHistory.js לרישום
// מחיר-ששולם-בפועל בכל recordPurchase, כדי ש"כמה פעם זה עלה" יהיה
// מבוסס-נתונים-אמיתיים במקום המוק הדטרמיניסטי של getPriceHistory.

function ProductRow({ product, onOpen }) {
  const dept = getDepartment(product.department);
  const trend = priceTrend(getPriceHistory(product));
  return (
    <li className="compare-row" onClick={() => onOpen(product)}>
      <span className="compare-icon">{dept.icon}</span>
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
  const saleProducts = getSaleProducts();

  return (
    <div className="compare-page">
      <p className="compare-intro">
        השוואת מחירים והיסטוריית-מחיר לכל מוצר בקטלוג. נתוני ההיסטוריה כרגע הם הדמיה
        (mock) — הוחלפו בעתיד בנתונים אמיתיים כשיהיה שרת.
      </p>

      {saleProducts.length > 0 && (
        <>
          <p className="section-title">🏷️ מבצעים היום</p>
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
