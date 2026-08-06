import { useEffect, useState } from 'react';
import { getAlternatives, locationLabel, SHELF_COLS, SHELF_ROWS } from '../data/storeData';
import { getDepartment } from '../lib/storeConfig';
import { getPriceHistory, priceTrend } from '../lib/priceHistory';
import { getVerification, markFound, markNotFound } from '../lib/verification';
import { getRealPriceHistoryForProduct } from '../lib/receiptHistory';
import { useAuth } from '../lib/useAuth';
import { api } from '../lib/apiClient';
import PriceTag from './PriceTag';
import Icon from './Icon';
import DeptIcon from './DeptIcon';
import CloseButton from './CloseButton';

export default function ProductDetail({ product, onClose, onAdd, onSwap }) {
  const { user } = useAuth();
  const [verification, setVerification] = useState(() => getVerification(product.id));
  const dept = getDepartment(product.department);
  const history = getPriceHistory(product);
  const trend = priceTrend(history);
  const maxPrice = Math.max(...history.map((h) => h.price));
  const alternatives = getAlternatives(product);
  const realHistory = getRealPriceHistoryForProduct(product.id);

  const [locationHistory, setLocationHistory] = useState([]);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [pickShelf, setPickShelf] = useState(product.shelf);
  const [locationSaved, setLocationSaved] = useState(false);
  const [verifiedViaServer, setVerifiedViaServer] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api
      .get(`/products/${product.id}/location-history`)
      .then((data) => {
        if (!cancelled) setLocationHistory(data.history || []);
      })
      .catch(() => {
        /* השרת לא זמין — פשוט לא מציגים היסטוריית-מיקום */
      });
    return () => {
      cancelled = true;
    };
  }, [product.id]);

  async function handleVerify(found) {
    if (user) {
      try {
        const data = await api.post(`/products/${product.id}/verify`, { found });
        setVerification(data.verification);
        setVerifiedViaServer(true);
        return;
      } catch {
        /* נופל לגרסה המקומית אם השרת לא זמין */
      }
    }
    setVerification(found ? markFound(product.id) : markNotFound(product.id));
    setVerifiedViaServer(false);
  }

  async function submitLocation(zone) {
    try {
      await api.post(`/products/${product.id}/location`, {
        departmentId: product.department,
        shelf: pickShelf,
        zone,
      });
      setLocationSaved(true);
      setShowLocationPicker(false);
      const data = await api.get(`/products/${product.id}/location-history`);
      setLocationHistory(data.history || []);
    } catch {
      /* השרת לא זמין — לא ניתן לעדכן כרגע */
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <CloseButton onClick={onClose} />
        <h2>{product.name}</h2>
        <p className="modal-location">
          <DeptIcon dept={dept} /> {dept.name} · {locationLabel(product)}
        </p>

        {verification.flagged && (
          <p className="modal-flag">
            <Icon name="warning" /> משתמשים דיווחו שהמוצר ייתכן שעבר מקום
          </p>
        )}

        <div className="modal-price-row">
          <span className="modal-price">
            <PriceTag product={product} />
          </span>
          {trend.rising && <span className="trend trend--up">↑ עלה {trend.diffPct}%</span>}
          {trend.falling && <span className="trend trend--down">↓ ירד {Math.abs(trend.diffPct)}%</span>}
        </div>

        <p className="settings-hint">היסטוריית-מחיר כללית (הדגמה, לא נתונים אמיתיים):</p>
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

        {realHistory.length > 0 && (
          <div className="real-price-history">
            <p className="settings-hint">
              <Icon name="receipt" /> המחיר ששילמתם בפועל (מהקבלות שסרקתם):
            </p>
            <ul className="real-price-history-list">
              {realHistory.map((p, i) => (
                <li key={i}>
                  {new Date(p.date).toLocaleDateString('he-IL')} · ₪{p.price.toFixed(2)}
                  {p.discountPercent ? ` (הנחה ${p.discountPercent}%)` : ''}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="verify-row">
          <span className="verify-label">האם המוצר נמצא במיקום המצוין?</span>
          <div className="verify-buttons">
            <button className="btn btn--ghost" onClick={() => handleVerify(true)}>
              <Icon name="check" /> נמצא
            </button>
            <button className="btn btn--ghost" onClick={() => handleVerify(false)}>
              <Icon name="close" /> לא נמצא
            </button>
          </div>
          <span className="verify-count">
            {verification.confirmed} אישרו · {verification.notFound} לא מצאו
            {verifiedViaServer && ' · משותף לכל המשפחה'}
          </span>
        </div>

        {user ? (
          <div className="location-update-section">
            <button className="btn btn--ghost btn--small" onClick={() => setShowLocationPicker((v) => !v)}>
              <Icon name="pin" /> עדכן מיקום על המדף
            </button>
            {locationSaved && (
              <span className="settings-confirm-msg">
                <Icon name="check" /> עודכן
              </span>
            )}

            {showLocationPicker && (
              <div className="location-picker">
                <label className="location-shelf-label">
                  מדף:
                  <input
                    type="number"
                    min="1"
                    className="map-edit-input location-shelf-input"
                    value={pickShelf}
                    onChange={(e) => setPickShelf(Number(e.target.value) || 1)}
                  />
                </label>
                <p className="location-picker-hint">בחרו את הבלוק (5×3) בתוך המדף:</p>
                <div
                  className="location-block-grid"
                  style={{ gridTemplateColumns: `repeat(${SHELF_COLS}, 1fr)` }}
                >
                  {Array.from({ length: SHELF_COLS * SHELF_ROWS }, (_, i) => i + 1).map((zone) => (
                    <button
                      key={zone}
                      className="location-block-btn"
                      onClick={() => submitLocation(zone)}
                    >
                      {zone}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {locationHistory.length > 0 && (
              <ul className="location-history-list">
                {locationHistory.map((h) => (
                  <li key={h.id}>
                    {h.changedBy} עדכן/ה מ"{getDepartment(h.department)?.name}, מדף {h.shelf} תא {h.zone}"
                    {' · '}
                    {new Date(h.createdAt).toLocaleDateString('he-IL')}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : (
          <p className="settings-hint">💡 התחברו (⚙️ הגדרות) כדי לעדכן מיקום-מוצר לכולם</p>
        )}

        <button className="btn btn--primary modal-add" onClick={() => onAdd(product)}>
          <Icon name="plus" /> הוסף לרשימת הקניות
        </button>

        {alternatives.length > 0 && (
          <div className="alternatives-section">
            <h3>
              <Icon name="swap" /> מוצרים דומים
            </h3>
            <ul className="candidate-list">
              {alternatives.map((alt) => {
                const altDept = getDepartment(alt.department);
                return (
                  <li key={alt.id} className="candidate-row">
                    <span className="candidate-btn candidate-btn--static">
                      <span className="candidate-icon">
                        <DeptIcon dept={altDept} />
                      </span>
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
                        <Icon name="plus" /> הוסף
                      </button>
                      {onSwap && (
                        <button className="btn btn--ghost btn--small" onClick={() => onSwap(alt)}>
                          <Icon name="swap" /> החלף
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
