import { useState } from 'react';
import { getDepartment, locationLabel } from '../data/storeData';
import { getPriceHistory, priceTrend } from '../lib/priceHistory';
import { getVerification, markFound, markNotFound } from '../lib/verification';

export default function ProductDetail({ product, onClose, onAdd }) {
  const [verification, setVerification] = useState(() => getVerification(product.id));
  const dept = getDepartment(product.department);
  const history = getPriceHistory(product);
  const trend = priceTrend(history);
  const maxPrice = Math.max(...history.map((h) => h.price));

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="סגור">
          ✕
        </button>
        <h2>{product.name}</h2>
        <p className="modal-location">
          {dept.icon} {dept.name} · {locationLabel(product)}
        </p>

        {verification.flagged && (
          <p className="modal-flag">⚠️ משתמשים דיווחו שהמוצר ייתכן שעבר מקום</p>
        )}

        <div className="modal-price-row">
          <span className="modal-price">₪{product.price.toFixed(2)}</span>
          {trend.rising && <span className="trend trend--up">↑ עלה {trend.diffPct}%</span>}
          {trend.falling && <span className="trend trend--down">↓ ירד {Math.abs(trend.diffPct)}%</span>}
        </div>

        <div className="price-history">
          {history.map((h) => (
            <div className="price-bar-col" key={h.month}>
              <div
                className="price-bar"
                style={{ height: `${(h.price / maxPrice) * 100}%` }}
                title={`₪${h.price.toFixed(2)}`}
              />
              <span className="price-bar-label">{h.month}</span>
            </div>
          ))}
        </div>

        <div className="verify-row">
          <span className="verify-label">האם המוצר נמצא במיקום המצוין?</span>
          <div className="verify-buttons">
            <button
              className="btn btn--ghost"
              onClick={() => setVerification(markFound(product.id))}
            >
              ✅ נמצא
            </button>
            <button
              className="btn btn--ghost"
              onClick={() => setVerification(markNotFound(product.id))}
            >
              ❌ לא נמצא
            </button>
          </div>
          <span className="verify-count">
            {verification.confirmed} אישרו · {verification.notFound} לא מצאו
          </span>
        </div>

        <button className="btn btn--primary modal-add" onClick={() => onAdd(product)}>
          ➕ הוסף לרשימת הקניות
        </button>
      </div>
    </div>
  );
}
