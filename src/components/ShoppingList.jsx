import { useState } from 'react';
import { locationLabel } from '../data/storeData';
import { getDepartment } from '../lib/storeConfig';
import { useFamilyMembers } from '../lib/useFamilyMembers';
import { useAuth } from '../lib/useAuth';
import { useTripSync } from '../lib/useTripSync';
import ProductSearch from './ProductSearch';
import VoiceAddPanel from './VoiceAddPanel';
import BarcodeScanner from './BarcodeScanner';
import ImageProductSearch from './ImageProductSearch';
import ProductDetail from './ProductDetail';
import TripVenuePicker from './TripVenuePicker';
import FavoritesManager from './FavoritesManager';
import PriceTag from './PriceTag';
import Icon from './Icon';
import DeptIcon from './DeptIcon';

export default function ShoppingList({ list, onGoNavigate }) {
  const { items, addItem, removeItem, assignItem, clear } = list;
  const { token } = useAuth();
  const { trip, startTrip, addTripItem, toggleTripItem, removeTripItem, finishTrip } = useTripSync();
  // "פריטים אישיים" (מ-⭐ מועדפים, לא בקטלוג — ר' FavoritesManager.jsx)
  // אין להם department/price אמיתיים, אז הם לא יכולים לעבור דרך
  // DeptIcon/PriceTag הרגילים; מוצגים בסעיף-נפרד למטה ותמיד מקומיים
  // בלבד (גם כשיש טיול-משותף-פעיל — השרת דורש מחיר-מספרי אמיתי).
  const displayItems = trip ? trip.items : items.filter((i) => !i.custom);
  const customItems = trip ? [] : items.filter((i) => i.custom);
  const listedIds = new Set(displayItems.map((i) => i.productId || i.id));
  const total = displayItems.reduce((sum, i) => sum + i.price, 0);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [imageSearchOpen, setImageSearchOpen] = useState(false);
  const [detailProduct, setDetailProduct] = useState(null);
  const [venuePickerOpen, setVenuePickerOpen] = useState(false);
  const [favoritesOpen, setFavoritesOpen] = useState(false);
  const family = useFamilyMembers();

  // כשיש טיול-משותף-פעיל, כל הוספה הולכת לטיול (משותף-לכולם, נשמר
  // בשרת) במקום לרשימה המקומית — ללא טיול-פעיל ההתנהגות בדיוק כמו
  // היום (מקומית-בלבד, offline-first).
  function handleAdd(product) {
    if (product.custom) addItem(product);
    else if (trip) addTripItem(product);
    else addItem(product);
  }

  return (
    <div className="shopping-list-page">
      <VoiceAddPanel onAdd={handleAdd} />

      <div className="scan-buttons-row">
        <button className="btn btn--ghost" onClick={() => setScannerOpen(true)}>
          <Icon name="barcode" solid /> סרוק ברקוד
        </button>
        <button className="btn btn--ghost" onClick={() => setImageSearchOpen(true)}>
          <Icon name="camera" /> חפש לפי תמונה
        </button>
        <button className="btn btn--ghost" onClick={() => setFavoritesOpen(true)}>
          <Icon name="star" /> המועדפים שלי
        </button>
      </div>

      {favoritesOpen && (
        <FavoritesManager onAddToList={handleAdd} onClose={() => setFavoritesOpen(false)} />
      )}

      <ProductSearch onAdd={handleAdd} listedIds={listedIds} />

      {token && (
        <div className="trip-banner">
          {trip ? (
            <>
              <span className="trip-banner-label">
                <Icon name="family" /> טיול-קניות משותף פעיל
              </span>
              <button className="btn btn--text" onClick={finishTrip}>
                🏁 סיים טיול
              </button>
            </>
          ) : (
            <button className="btn btn--ghost btn--small" onClick={() => setVenuePickerOpen(true)}>
              🛒 התחל טיול-קניות משותף
            </button>
          )}
        </div>
      )}

      {venuePickerOpen && (
        <TripVenuePicker
          onClose={() => setVenuePickerOpen(false)}
          onPick={async (venueId) => {
            await startTrip(venueId);
            setVenuePickerOpen(false);
          }}
        />
      )}

      {scannerOpen && (
        <BarcodeScanner onAdd={handleAdd} onClose={() => setScannerOpen(false)} />
      )}
      {imageSearchOpen && (
        <ImageProductSearch
          onAdd={handleAdd}
          onClose={() => setImageSearchOpen(false)}
          onFallbackToSearch={() => setImageSearchOpen(false)}
        />
      )}

      <div className="shopping-list-section">
        <div className="shopping-list-header">
          <h3>
            {trip ? 'רשימת הטיול המשותף' : 'רשימת הקניות שלי'} ({displayItems.length})
          </h3>
          {!trip && items.length > 0 && (
            <button className="btn btn--text" onClick={clear}>
              נקה הכל
            </button>
          )}
        </div>

        {displayItems.length === 0 && customItems.length === 0 ? (
          <div className="empty-state">
            <span className="empty-state-icon">
              <Icon name="cart" />
            </span>
            <p className="empty-state-title">הרשימה שלך ריקה</p>
            <p className="empty-state-sub">חפשו מוצר למעלה כדי להתחיל את רשימת הקניות</p>
          </div>
        ) : displayItems.length === 0 ? null : (
          <ul className="cart-list">
            {displayItems.map((item) => {
              const dept = getDepartment(item.department);
              return (
                <li className="cart-row" key={item.id}>
                  <span className="cart-row-icon">
                    <DeptIcon dept={dept} />
                  </span>
                  <button
                    className="cart-row-info cart-row-info--btn"
                    onClick={() => !trip && setDetailProduct(item)}
                  >
                    <span className="cart-row-name">{item.name}</span>
                    <span className="cart-row-loc">
                      {dept.name} · {locationLabel(item)}
                      {trip && ` · הוסיף/ה ${item.addedBy}`}
                    </span>
                  </button>
                  <span className="cart-row-price">
                    <PriceTag product={item} size="small" />
                  </span>
                  {!trip && family.members.length > 0 && (
                    <select
                      className="assignee-select"
                      value={item.assignee || ''}
                      onChange={(e) => assignItem(item.id, e.target.value || null)}
                      aria-label="שייך לבן-משפחה"
                    >
                      <option value="">ללא</option>
                      {family.members.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.emoji} {m.name}
                        </option>
                      ))}
                    </select>
                  )}
                  {trip && (
                    <input
                      type="checkbox"
                      className="trip-item-picked"
                      checked={item.picked}
                      onChange={() => toggleTripItem(item.id)}
                      aria-label="נקנה"
                    />
                  )}
                  <button
                    className="btn btn--icon btn--danger"
                    onClick={() => (trip ? removeTripItem(item.id) : removeItem(item.id))}
                    aria-label="הסר"
                  >
                    <Icon name="trash" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        {customItems.length > 0 && (
          <>
            <p className="settings-hint">
              <Icon name="tag" /> פריטים אישיים, לא בקטלוג — לא מנווטים אליהם, זכרו לקחת אותם בעצמכם:
            </p>
            <ul className="custom-item-list">
              {customItems.map((item) => (
                <li className="custom-item-row" key={item.id}>
                  {item.photo ? (
                    <img className="favorite-photo" src={item.photo} alt={item.name} />
                  ) : (
                    <span className="favorite-photo favorite-photo--empty">
                      <Icon name="tag" />
                    </span>
                  )}
                  <span className="favorite-info">
                    <span className="favorite-name">{item.name}</span>
                    {item.brand && <span className="favorite-brand">{item.brand}</span>}
                  </span>
                  <button
                    className="btn btn--icon btn--danger"
                    onClick={() => removeItem(item.id)}
                    aria-label="הסר"
                  >
                    <Icon name="trash" />
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}

        {displayItems.length > 0 && (
          <div className="shopping-list-footer">
            <span className="cart-total">סה"כ: ₪{total.toFixed(2)}</span>
            <button className="btn btn--primary" onClick={onGoNavigate}>
              <Icon name="compass" /> חשב מסלול וניווט
            </button>
          </div>
        )}
      </div>

      {detailProduct && (
        <ProductDetail
          product={detailProduct}
          onClose={() => setDetailProduct(null)}
          onAdd={(p) => {
            handleAdd(p);
            setDetailProduct(null);
          }}
          onSwap={(alt) => {
            removeItem(detailProduct.id);
            handleAdd(alt);
            setDetailProduct(null);
          }}
        />
      )}
    </div>
  );
}
