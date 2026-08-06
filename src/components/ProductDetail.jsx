import { useState } from 'react';
import { getAlternatives, locationLabel } from '../data/storeData';
import { getDepartment } from '../lib/storeConfig';
import { getPriceHistory, priceTrend } from '../lib/priceHistory';
import { getVerification, markFound, markNotFound } from '../lib/verification';
import PriceTag from './PriceTag';

export default function ProductDetail({ product, onClose, onAdd, onSwap }) {
  const [verification, setVerification] = useState(() => getVerification(product.id));
  const dept = getDepartment(product.department);
  const history = getPriceHistory(product);
  const trend = priceTrend(history);
  const maxPrice = Math.max(...history.map((h) => h.price));
  const alternatives = getAlternatives(product);

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
          <span className="modal-price">
            <PriceTag product={product} />
          </span>
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

        {alternatives.length > 0 && (
          <div className="alternatives-section">
            <h3>🔁 מוצרים דומים</h3>
            <ul className="candidate-list">
              {alternatives.map((alt) => {
                const altDept = getDepartment(alt.department);
                return (
                  <li key={alt.id} className="candidate-row">
                    <span className="candidate-btn candidate-btn--static">
                      <span className="candidate-icon">{altDept.icon}</span>
                      <span className="candidate-info">
                        <span className="candidate-name">{alt.name}</span>
                        <span className="candidate-loc">
                          {altDept.name} · {locationLabel(alt)}
                        </span>
                      </span>
                      <span className="candidate-price">
                        <PriceTag product={alt} size="small" />
                      </span>
                    </span>
                    <div className="alternative-actions">
                      <button className="btn btn--ghost btn--small" onClick={() => onAdd(alt)}>
                        ➕ הוסף
                      </button>
                      {onSwap && (
                        <button className="btn btn--ghost btn--small" onClick={() => onSwap(alt)}>
                          ↔ החלף
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
