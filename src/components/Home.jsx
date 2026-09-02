import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { locationLabel } from '../data/storeData';
import { getDepartment } from '../lib/storeConfig';
import { useAuth } from '../lib/useAuth';
import { useCatalog } from '../lib/useCatalog';
import { searchCatalog, getAllProducts } from '../lib/catalog';
import { useTripSync } from '../lib/useTripSync';
import PurchasePredictions from './PurchasePredictions';
import ProductImage from './ProductImage';
const ScanOrSearchModal = lazy(() => import('./ScanOrSearchModal'));
import VoiceAddPanel from './VoiceAddPanel';
const FavoritesManager = lazy(() => import('./FavoritesManager'));
import TripVenuePicker from './TripVenuePicker';
import PriceTag from './PriceTag';
import Icon from './Icon';
import { useGroupHome } from '../lib/useGroupHome';
import { useGroups } from '../lib/useGroups';
import { fetchGroups } from '../lib/groups';
import { importGroupHomeItems } from '../lib/groupHome';

export default function Home({ list, onNavigate, groupId = null, onExitGroup }) {
  const { items, addItem, removeItem, incrementItem, decrementItem, updateItem, reorderItems } = list;
  const { token } = useAuth();
  const dynamicProducts = useCatalog();
  const { trip, startTrip, addTripItem, toggleTripItem, removeTripItem, finishTrip } = useTripSync();
  const groupHome = useGroupHome(groupId);
  const groups = useGroups();

  const [query, setQuery] = useState('');
  const [checkedIds, setCheckedIds] = useState(new Set());
  const [scannerOpen, setScannerOpen] = useState(false);
  const [favoritesOpen, setFavoritesOpen] = useState(false);
  const [venuePickerOpen, setVenuePickerOpen] = useState(false);
  const [draggedId, setDraggedId] = useState(null);
  const [transferGroupId, setTransferGroupId] = useState('');
  const [transferBusy, setTransferBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [undoItem, setUndoItem] = useState(null);

  // "פריטים אישיים" (מ-⭐ מועדפים, לא בקטלוג) — ר' FavoritesManager.jsx.
  // אין להם department/price אמיתיים, ולא ניתנים-לניווט/לטיול-משותף.
  const displayItems = groupId ? groupHome.items : (trip ? trip.items : items.filter((i) => !i.custom));
  const customItems = groupId || trip ? [] : items.filter((i) => i.custom);

  useEffect(() => { if (token) fetchGroups().catch(() => {}); }, [token]);

  async function transferToGroup() {
    if (!transferGroupId || !items.length) return;
    setTransferBusy(true);
    try {
      const data = await importGroupHomeItems(transferGroupId, items.filter((item) => !item.custom).map((item) => ({ ...item, productId: item.productId || item.id })));
      if (!data.rejected?.length) list.clear();
    } finally {
      setTransferBusy(false);
    }
  }

  const total = displayItems.reduce((sum, i) => sum + i.price * (i.qty || 1), 0);
  const itemCount = displayItems.reduce((sum, i) => sum + (i.qty || 1), 0);

  // תוצאות-חיפוש בקטלוג — נפרד לגמרי מרשימת-הקניות שלמטה: מסמנים
  // (checkbox) מה רוצים, ורק בלחיצה על "אישור" זה נכנס בפועל לרשימה.
  const searchResults = useMemo(
    () => (query.trim() ? searchCatalog(query) : []),
    [query, dynamicProducts]
  );

  function handleAdd(product) {
    if (product.custom) addItem(product);
    else if (groupId) groupHome.addItem(product);
    else if (trip) addTripItem(product);
    else incrementItem(product);
    setNotice(`${product.name} נוסף לרשימה`);
    window.setTimeout(() => setNotice(''), 2500);
  }

  function removeWithUndo(product) {
    if (groupId || trip) {
      (groupId ? groupHome.removeItem(product.id) : removeTripItem(product.id)).catch?.(() => setNotice('לא הצלחנו להסיר את המוצר'));
      return;
    }
    removeItem(product.id);
    setUndoItem(product);
    window.setTimeout(() => setUndoItem((current) => current?.id === product.id ? null : current), 5000);
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
      <Suspense fallback={null}>
      {favoritesOpen && (
        <FavoritesManager
          onAddToList={handleAdd}
          onClose={() => setFavoritesOpen(false)}
          favoritesOverride={groupId ? groupHome.favorites : null}
          onAddFavorite={groupId ? groupHome.addFavorite : null}
          onRemoveFavorite={groupId ? groupHome.removeFavorite : null}
          groupMode={!!groupId}
        />
      )}
      {scannerOpen && (
        <ScanOrSearchModal
          onAdd={handleAddByScan}
          onClose={() => setScannerOpen(false)}
          onFallbackToSearch={() => setScannerOpen(false)}
          activeVenueId={groupId ? groupHome.group?.venueId || null : trip?.venueId || null}
        />
      )}

      {groupHome.error && <p className="login-error"><Icon name="warning" /> {groupHome.error}</p>}
      {notice && <p className="settings-hint" role="status"><Icon name="check" /> {notice}</p>}
      {undoItem && <p className="settings-hint" role="status">המוצר “{undoItem.name}” הוסר. <button className="btn btn--text" onClick={() => { addItem(undoItem); setUndoItem(null); }}>בטל</button></p>}
      {groupId && <div className="trip-banner"><span className="trip-banner-label"><Icon name="family" /> דף הבית של: {groupHome.group?.name || 'הקבוצה'} </span><button className="btn btn--text" onClick={() => setVenuePickerOpen(true)}>📍 {groupHome.group?.venueId ? 'שנה סניף' : 'בחר סניף'}</button><button className="btn btn--text" onClick={() => onExitGroup?.()}>מצב אישי</button></div>}
      {!groupId && token && (
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
            if (groupId) await groupHome.updateVenue(venueId);
            else await startTrip(venueId);
            setVenuePickerOpen(false);
          }}
        />
      )}

      <div className="home-hero">
        <div className="home-hero-stat">
          <span className="home-hero-count">{itemCount} פריטים</span>
          <span className="home-hero-price">₪{total.toFixed(2)}</span>
        </div>
      </div>

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

      <div className="home-quick-actions">
        <VoiceAddPanel onAdd={handleAdd} />

        <div className="scan-buttons-row">
          <button className="btn btn--tinted" onClick={() => setScannerOpen(true)}>
            <Icon name="barcode" solid /> סרוק / זהה מוצר
          </button>
          <button className="btn btn--tinted" onClick={() => setFavoritesOpen(true)}>
            <Icon name="star" /> המועדפים שלי
          </button>
        </div>
      </div>

      {!groupId && !trip && groups.length > 0 && items.some((item) => !item.custom) && (
        <div className="group-transfer-row">
          <select className="map-edit-input" value={transferGroupId} onChange={(e) => setTransferGroupId(e.target.value)}>
            <option value="">בחרו קבוצה להעברת הרשימה…</option>
            {groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}
          </select>
          <button className="btn btn--ghost" onClick={transferToGroup} disabled={!transferGroupId || transferBusy}>
            {transferBusy ? 'מעביר…' : 'העבר לקבוצה'}
          </button>
        </div>
      )}
      </Suspense>

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

      <PurchasePredictions onAdd={handleAdd} listedIds={new Set(displayItems.map((i) => i.productId || i.id))} />

      <div className="home-shopping-list">
        <div className="home-section-title-row">
          <p className="home-section-title">
            {groupId ? 'רשימת הקבוצה' : (trip ? 'רשימת הטיול המשותף' : 'רשימת הקניות שלי')} ({displayItems.length})
          </p>
          {((groupId && groupHome.group?.myRole === 'admin' && displayItems.length > 0) || (!groupId && !trip && items.length > 0)) && (
            <button className="btn btn--text" onClick={() => groupId ? groupHome.clearItems() : list.clear()}>
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
                    if (!trip && draggedId && draggedId !== p.id) {
                      if (groupId) groupHome.reorderItems(draggedId, p.id);
                      else reorderItems(draggedId, p.id);
                    }
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
                      {(trip || groupId) && ` · הוסיף/ה ${p.addedBy}`}
                    </span>
                    <PriceTag product={p} size="small" />
                  </span>

                  {!trip && (
                    <div className="home-product-qty">
                      <button
                        className="btn btn--icon btn--small"
                        onClick={() => groupId ? groupHome.updateItem(p.id, { qty: Math.max(1, (p.qty || 1) - 1) }) : decrementItem(p.id)}
                        aria-label="הפחת כמות"
                      >
                        <Icon name="minus" />
                      </button>
                      <input className="home-product-qty-value" type="number" min="1" value={p.qty || 1} aria-label={`כמות ${p.name}`} onChange={(e) => { const qty = Math.max(1, Number(e.target.value) || 1); if (groupId) groupHome.updateItem(p.id, { qty }); else updateItem(p.id, { qty }); }} />
                      <button
                        className="btn btn--icon btn--small"
                        onClick={() => groupId ? groupHome.updateItem(p.id, { qty: (p.qty || 1) + 1 }) : incrementItem(p)}
                        aria-label="הוסף כמות"
                      >
                        <Icon name="plus" />
                      </button>
                    </div>
                  )}

                  {(trip || groupId) && (
                    <input
                      type="checkbox"
                      className="trip-item-picked"
                      checked={p.picked}
                      onChange={() => groupId ? groupHome.updateItem(p.id, { picked: !p.picked }) : toggleTripItem(p.id)}
                      aria-label="נקנה"
                    />
                  )}

                  <button
                    className="btn btn--icon btn--danger"
                    onClick={() => removeWithUndo(p)}
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

      <p className="home-catalog-note">קטלוג הסניף: {getAllProducts().length} מוצרים בעשר מחלקות.</p>
    </div>
  );
}
