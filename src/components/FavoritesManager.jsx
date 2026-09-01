import { useRef, useState } from 'react';
import { PRODUCTS } from '../data/storeData';
import { matchReceiptItemsToCatalog } from '../lib/receiptParse';
import { useFavorites } from '../lib/useFavorites';
import { addFavorite, removeFavorite, SEASONS } from '../lib/favorites';
import Icon from './Icon';
import CloseButton from './CloseButton';

const TABS = [
  { id: SEASONS.ALL, label: 'כללי', icon: 'star' },
  { id: SEASONS.SUMMER, label: 'קיץ', icon: 'sun' },
  { id: SEASONS.WINTER, label: 'חורף', icon: 'snowflake' },
];

// "מועדפים" — רשימת-משאלות חופשית (לא תלויה בקטלוג הקבוע), 3
// לשוניות ידניות (כללי/קיץ/חורף — בלי זיהוי-תאריך אוטומטי, לפי בקשת
// המשתמש המפורשת). כמו ברשימת-הקניות בדף-הבית: מסמנים (checkbox) מה
// רוצים, וכפתור אחד מעביר את כל המסומן לרשימת-הקניות בבת-אחת —
// "הוסף לרשימה" מנסה להתאים לקטלוג שלנו קודם (שימוש-חוזר ב-
// matchReceiptItemsToCatalog הקיים); אם אין התאמה, נוסף "פריט אישי".
export default function FavoritesManager({ onAddToList, onClose, favoritesOverride = null, onAddFavorite = null, onRemoveFavorite = null }) {
  const localFavorites = useFavorites();
  const favorites = favoritesOverride || localFavorites;
  const fileInputRef = useRef(null);
  const [activeTab, setActiveTab] = useState(SEASONS.ALL);
  const [checkedIds, setCheckedIds] = useState(new Set());
  const [formOpen, setFormOpen] = useState(false);
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [photo, setPhoto] = useState(null);

  const shown = favorites.filter((f) => f.season === activeTab);

  function toggleChecked(id) {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handlePhotoChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setPhoto(reader.result);
    reader.readAsDataURL(file);
  }

  function handleSave() {
    if (!name.trim()) return;
    if (onAddFavorite) onAddFavorite({ name, brand, photo, season: activeTab });
    else addFavorite({ name, brand, photo, season: activeTab });
    setName('');
    setBrand('');
    setPhoto(null);
    setFormOpen(false);
  }

  function addOne(fav) {
    const [matched] = matchReceiptItemsToCatalog([{ name: fav.name }], PRODUCTS);
    if (matched.matchedProductId) {
      const product = PRODUCTS.find((p) => p.id === matched.matchedProductId);
      onAddToList(product);
    } else {
      onAddToList({
        id: 'custom-' + Date.now() + Math.round(Math.random() * 1000),
        name: fav.name,
        brand: fav.brand,
        photo: fav.photo,
        price: null,
        department: null,
        custom: true,
      });
    }
  }

  function handleTransfer() {
    shown.filter((f) => checkedIds.has(f.id)).forEach(addOne);
    setCheckedIds(new Set());
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal favorites-modal" onClick={(e) => e.stopPropagation()}>
        <CloseButton onClick={onClose} />
        <h2>
          <Icon name="star" /> המועדפים שלי
        </h2>
        <p className="settings-hint">
          רשימת-משאלות אישית — לא חייבת להיות בקטלוג שלנו. סמנו מה רוצים ולחצו "העבר לרשימת-
          הקניות", בדיוק כמו בדף הבית.
        </p>

        <div className="floor-switcher" role="tablist" aria-label="עונות">
          {TABS.map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={t.id === activeTab}
              className={'floor-tab' + (t.id === activeTab ? ' floor-tab--active' : '')}
              onClick={() => {
                setActiveTab(t.id);
                setCheckedIds(new Set());
              }}
            >
              <Icon name={t.icon} /> {t.label}
            </button>
          ))}
        </div>

        {shown.length === 0 ? (
          <p className="empty-hint">אין עדיין מועדפים ב"{TABS.find((t) => t.id === activeTab).label}".</p>
        ) : (
          <>
            <ul className="home-check-list">
              {shown.map((fav) => (
                <li className="home-check-row" key={fav.id}>
                  <label className="home-check-label">
                    <input
                      type="checkbox"
                      checked={checkedIds.has(fav.id)}
                      onChange={() => toggleChecked(fav.id)}
                    />
                    {fav.photo ? (
                      <img className="favorite-photo" src={fav.photo} alt={fav.name} />
                    ) : (
                      <span className="favorite-photo favorite-photo--empty">
                        <Icon name="star" />
                      </span>
                    )}
                    <span className="favorite-info">
                      <span className="favorite-name">{fav.name}</span>
                      {fav.brand && <span className="favorite-brand">{fav.brand}</span>}
                    </span>
                  </label>
                  <button
                    className="btn btn--icon btn--danger"
                    onClick={() => (onRemoveFavorite ? onRemoveFavorite(fav.id) : removeFavorite(fav.id))}
                    aria-label="מחק ממועדפים"
                  >
                    <Icon name="trash" />
                  </button>
                </li>
              ))}
            </ul>
            {checkedIds.size > 0 && (
              <button className="btn btn--primary favorites-add-all-btn" onClick={handleTransfer}>
                <Icon name="check" /> העבר {checkedIds.size} לרשימת-הקניות
              </button>
            )}
          </>
        )}

        {!formOpen ? (
          <button className="btn btn--ghost" onClick={() => setFormOpen(true)}>
            <Icon name="plus" /> הוסף מועדף ל"{TABS.find((t) => t.id === activeTab).label}"
          </button>
        ) : (
          <div className="venue-new-form">
            <input
              className="map-edit-input"
              placeholder="שם המוצר (חובה)"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <input
              className="map-edit-input"
              placeholder="מותג (אופציונלי)"
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
            />
            <div className="receipt-upload-row">
              <button className="btn btn--ghost btn--small" onClick={() => fileInputRef.current?.click()}>
                <Icon name="camera" /> {photo ? 'החלף תמונה' : 'הוסף תמונה'}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handlePhotoChange}
              />
              {photo && <img className="favorite-photo-preview" src={photo} alt="" />}
            </div>
            <div className="map-edit-actions">
              <button className="btn btn--primary btn--small" onClick={handleSave} disabled={!name.trim()}>
                <Icon name="check" /> שמור
              </button>
              <button className="btn btn--text btn--small" onClick={() => setFormOpen(false)}>
                <Icon name="close" /> ביטול
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
