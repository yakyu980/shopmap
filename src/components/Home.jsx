import { useMemo, useState } from 'react';
import { PRODUCTS, searchProducts, locationLabel } from '../data/storeData';
import { getDepartment } from '../lib/storeConfig';
import { useAuth } from '../lib/useAuth';
import { useTripSync } from '../lib/useTripSync';
import { useFamilyMembers } from '../lib/useFamilyMembers';
import FamilyManager from './FamilyManager';
import PurchasePredictions from './PurchasePredictions';
import ProductImage from './ProductImage';
import BarcodeScanner from './BarcodeScanner';
import ImageProductSearch from './ImageProductSearch';
import VoiceAddPanel from './VoiceAddPanel';
import FavoritesManager from './FavoritesManager';
import TripVenuePicker from './TripVenuePicker';
import PriceTag from './PriceTag';
import Icon from './Icon';

export default function Home({ list, onNavigate }) {
  const { items, addItem, removeItem, incrementItem, decrementItem, reorderItems, assignItem } = list;
  const { token } = useAuth();
  const { trip, startTrip, addTripItem, toggleTripItem, removeTripItem, finishTrip } = useTripSync();
  const family = useFamilyMembers();

  const [query, setQuery] = useState('');
  const [checkedIds, setCheckedIds] = useState(new Set());
  const [scannerOpen, setScannerOpen] = useState(false);
  const [imageSearchOpen, setImageSearchOpen] = useState(false);
  const [favoritesOpen, setFavoritesOpen] = useState(false);
  const [venuePickerOpen, setVenuePickerOpen] = useState(false);
  const [draggedId, setDraggedId] = useState(null);

  // "פריטים אישיים" (מ-⭐ מועדפים, לא בקטלוג) — ר' FavoritesManager.jsx.
  // אין להם department/price אמיתיים, ולא ניתנים-לניווט/לטיול-משותף.
  const displayItems = trip ? trip.items : items.filter((i) => !i.custom);
  const customItems = trip ? [] : items.filter((i) => i.custom);

  const total = displayItems.reduce((sum, i) => sum + i.price * (i.qty || 1), 0);
  const itemCount = displayItems.reduce((sum, i) => sum + (i.qty || 1), 0);

  // תוצאות-חיפוש בקטלוג — נפרד לגמרי מרשימת-הקניות שלמטה: מסמנים
  // (checkbox) מה רוצים, ורק בלחיצה על "אישור" זה נכנס בפועל לרשימה.
  const searchResults = useMemo(() => (query.trim() ? searchProducts(query) : []), [query]);

  function handleAdd(product) {
    if (product.custom) addItem(product);
    else if (trip) addTripItem(product);
    else incrementItem(product);
  }

  function toggleChecked(productId) {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(productId)) next.delete(productId);
      else next.add(productId);
      return next;
    });
  }

  function handleConfirm() {
    for (const p of searchResults) {
      if (checkedIds.has(p.id)) handleAdd(p);
    }
    setCheckedIds(new Set());
    setQuery('');
  }

  function handleAddByScan(product) {
    handleAdd(product);
    setScannerOpen(false);
  }

  return (
    <div className="home-page">
      {favoritesOpen && (
        <FavoritesManager onAddToList={handleAdd} onClose={() => setFavoritesOpen(false)} />
      )}
      {scannerOpen && <BarcodeScanner onAdd={handleAddByScan} onClose={() => setScannerOpen(false)} />}
      {imageSearchOpen && (
        <ImageProductSearch
          onAdd={handleAddByScan}
          onClose={() => setImageSearchOpen(false)}
          onFallbackToSearch={() => setImageSearchOpen(false)}
        />
      )}

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

      <div className="home-search-row">
        <div className="search-input-row">
          <input
            className="search-input"
            type="text"
            placeholder="חיפוש מוצרים"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="home-hero">
        <div className="home-hero-stat">
          <span className="home-hero-count">{itemCount} פריטים</span>
          <span className="home-hero-price">₪{total.toFixed(2)}</span>
        </div>
      </div>

      <div className="home-quick-actions">
        <VoiceAddPanel onAdd={handleAdd} />

        <div className="scan-buttons-row">
          <button className="btn btn--tinted" onClick={() => setScannerOpen(true)}>
            <Icon name="barcode" solid /> סרוק ברקוד
          </button>
          <button className="btn btn--tinted" onClick={() => setImageSearchOpen(true)}>
            <Icon name="camera" /> חפש לפי תמונה
          </button>
          <button className="btn btn--tinted" onClick={() => setFavoritesOpen(true)}>
            <Icon name="star" /> המועדפים שלי
          </button>
        </div>
      </div>

      {query.trim() && (
        <div className="home-search-results">
          <p className="home-section-title">תוצאות חיפוש — סמנו מה להוסיף</p>
          {searchResults.length === 0 ? (
            <p className="empty-hint">לא נמצאו מוצרים שמתחילים באות הזו.</p>
          ) : (
            <ul className="home-check-list">
              {searchResults.map((p) => {
                const dept = getDepartment(p.department);
                const checked = checkedIds.has(p.id);
                return (
                  <li className="home-check-row" key={p.id}>
                    <label className="home-check-label">
                      <input type="checkbox" checked={checked} onChange={() => toggleChecked(p.id)} />
                      <ProductImage product={p} />
                      <span className="home-product-info">
                        <span className="home-product-name">{p.name}</span>
                        <span className="home-product-loc">
                          {dept.name} · {locationLabel(p)}
                        </span>
                        <PriceTag product={p} size="small" />
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
          {checkedIds.size > 0 && (
            <button className="btn btn--primary home-confirm-btn" onClick={handleConfirm}>
              <Icon name="check" /> אישור — הוסף {checkedIds.size} לרשימה
            </button>
          )}
        </div>
      )}

      <FamilyManager />
      <PurchasePredictions onAdd={handleAdd} listedIds={new Set(displayItems.map((i) => i.productId || i.id))} />

      <div className="home-shopping-list">
        <div className="home-section-title-row">
          <p className="home-section-title">
            {trip ? 'רשימת הטיול המשותף' : 'רשימת הקניות שלי'} ({displayItems.length})
          </p>
          {!trip && items.length > 0 && (
            <button className="btn btn--text" onClick={list.clear}>
              נקה הכל
            </button>
          )}
        </div>

        {displayItems.length === 0 && customItems.length === 0 ? (
          <p className="empty-hint">הרשימה ריקה — חפשו מוצר למעלה כדי להוסיף.</p>
        ) : (
          <div className="home-product-rows">
            {displayItems.map((p) => {
              const dept = getDepartment(p.department);
              return (
                <div
                  key={p.id}
                  className={'home-product-row' + (draggedId === p.id ? ' home-product-row--dragging' : '')}
                  draggable={!trip}
                  onDragStart={() => setDraggedId(p.id)}
                  onDragEnd={() => setDraggedId(null)}
                  onDragOver={(e) => !trip && e.preventDefault()}
                  onDrop={() => {
                    if (!trip && draggedId && draggedId !== p.id) reorderItems(draggedId, p.id);
                    setDraggedId(null);
                  }}
                >
                  {!trip && (
                    <span className="home-product-grip" aria-hidden="true">
                      <Icon name="grip" />
                    </span>
                  )}
                  <ProductImage product={p} />
                  <span className="home-product-info">
                    <span className="home-product-name">{p.name}</span>
                    <span className="home-product-loc">
                      {dept.name} · {locationLabel(p)}
                      {trip && ` · הוסיף/ה ${p.addedBy}`}
                    </span>
                    <PriceTag product={p} size="small" />
                  </span>

                  {!trip && (
                    <div className="home-product-qty">
                      <button
                        className="btn btn--icon btn--small"
                        onClick={() => decrementItem(p.id)}
                        aria-label="הפחת כמות"
                      >
                        <Icon name="minus" />
                      </button>
                      <span className="home-product-qty-value">{p.qty || 1}</span>
                      <button
                        className="btn btn--icon btn--small"
                        onClick={() => incrementItem(p)}
                        aria-label="הוסף כמות"
                      >
                        <Icon name="plus" />
                      </button>
                    </div>
                  )}

                  {!trip && family.members.length > 0 && (
                    <select
                      className="assignee-select"
                      value={p.assignee || ''}
                      onChange={(e) => assignItem(p.id, e.target.value || null)}
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
                      checked={p.picked}
                      onChange={() => toggleTripItem(p.id)}
                      aria-label="נקנה"
                    />
                  )}

                  <button
                    className="btn btn--icon btn--danger"
                    onClick={() => (trip ? removeTripItem(p.id) : removeItem(p.id))}
                    aria-label="הסר מרשימת קניות"
                    title="הסר מרשימת קניות"
                  >
                    <Icon name="trash" />
                  </button>
                </div>
              );
            })}
          </div>
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
      </div>

      <button className="btn btn--primary home-nav-cta" onClick={() => onNavigate('nav')}>
        <Icon name="compass" /> נווט לרשימה שלי
      </button>

      <p className="home-catalog-note">קטלוג הסניף: {PRODUCTS.length} מוצרים בעשר מחלקות.</p>
    </div>
  );
}
