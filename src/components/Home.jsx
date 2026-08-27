import { useMemo, useState } from 'react';
import { PRODUCTS, searchProducts, locationLabel } from '../data/storeData';
import { getDepartment } from '../lib/storeConfig';
import FamilyManager from './FamilyManager';
import PurchasePredictions from './PurchasePredictions';
import ProductImage from './ProductImage';
import BarcodeScanner from './BarcodeScanner';
import PriceTag from './PriceTag';
import Icon from './Icon';

export default function Home({ list, onNavigate }) {
  const { items, addItem, removeItem, incrementItem, decrementItem, reorderItems } = list;
  const [query, setQuery] = useState('');
  const [scannerOpen, setScannerOpen] = useState(false);
  const [draggedId, setDraggedId] = useState(null);

  const total = items.reduce((sum, i) => sum + i.price * (i.qty || 1), 0);
  const itemCount = items.reduce((sum, i) => sum + (i.qty || 1), 0);

  const rows = useMemo(() => {
    if (!query.trim()) return items;
    const matches = searchProducts(query);
    // מוצר שכבר ברשימה מוצג עם הנתונים-החיים שלו (qty וכו'), לא עם
    // הגרסה הסטטית מהקטלוג.
    return matches.map((p) => items.find((i) => i.id === p.id) || p);
  }, [query, items]);

  const showingList = !query.trim();

  function handleAddByScan(product) {
    addItem(product);
    setScannerOpen(false);
  }

  // לחיצה על שורת-תוצאה (לא בתוך שומרתה, ר' עצירת-הבועה בכפתורים
  // עצמם) מוסיפה אותה לרשימה ומאפסת את החיפוש — חוזרים לראות את
  // הרשימה, בדיוק כמו אפליקציות-קניות אחרות.
  function handleRowSelect(product) {
    if (!items.some((i) => i.id === product.id)) addItem(product);
    setQuery('');
  }

  function handleSearchKeyDown(e) {
    if (e.key !== 'Enter' || showingList || rows.length === 0) return;
    handleRowSelect(rows[0]);
  }

  return (
    <div className="home-page">
      <div className="home-search-row">
        <div className="search-input-row">
          <input
            className="search-input"
            type="text"
            placeholder="חפש מוצר לפי אות ראשונה… (למשל: ג) — Enter מוסיף את הראשון"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleSearchKeyDown}
          />
        </div>
        <button
          className="btn btn--icon home-scan-btn"
          onClick={() => setScannerOpen(true)}
          aria-label="סרוק ברקוד / צלם מוצר"
          title="סרוק ברקוד / צלם מוצר"
        >
          <Icon name="barcode" solid />
        </button>
      </div>

      {scannerOpen && <BarcodeScanner onAdd={handleAddByScan} onClose={() => setScannerOpen(false)} />}

      <div className="home-hero">
        <div className="home-hero-stat">
          <span className="home-hero-count">{itemCount} פריטים</span>
          <span className="home-hero-price">₪{total.toFixed(2)}</span>
        </div>
      </div>

      <FamilyManager />
      <PurchasePredictions onAdd={addItem} listedIds={new Set(items.map((i) => i.id))} />

      <div className="home-product-rows">
        {rows.length === 0 && (
          <p className="empty-hint">
            {showingList ? 'הרשימה ריקה — חפשו מוצר למעלה כדי להוסיף.' : 'לא נמצאו מוצרים שמתחילים באות הזו.'}
          </p>
        )}
        {rows.map((p) => {
          const inList = items.find((i) => i.id === p.id);
          const dept = getDepartment(p.department);
          return (
            <div
              key={p.id}
              className={'home-product-row' + (draggedId === p.id ? ' home-product-row--dragging' : '')}
              draggable={showingList}
              onDragStart={() => setDraggedId(p.id)}
              onDragEnd={() => setDraggedId(null)}
              onDragOver={(e) => showingList && e.preventDefault()}
              onDrop={() => {
                if (showingList && draggedId && draggedId !== p.id) reorderItems(draggedId, p.id);
                setDraggedId(null);
              }}
            >
              {showingList && (
                <span className="home-product-grip" aria-hidden="true">
                  <Icon name="grip" />
                </span>
              )}
              <button
                className="home-product-main"
                onClick={() => handleRowSelect(p)}
                aria-label={inList ? p.name : `הוסף ${p.name} לרשימה`}
              >
                <ProductImage product={p} />
                <span className="home-product-info">
                  <span className="home-product-name">{p.name}</span>
                  <span className="home-product-loc">
                    {dept.name} · {locationLabel(p)}
                  </span>
                  <PriceTag product={p} size="small" />
                </span>
              </button>

              {inList ? (
                <div className="home-product-qty">
                  <button
                    className="btn btn--icon btn--small"
                    onClick={() => decrementItem(p.id)}
                    aria-label="הפחת כמות"
                  >
                    <Icon name="minus" />
                  </button>
                  <span className="home-product-qty-value">{inList.qty || 1}</span>
                  <button
                    className="btn btn--icon btn--small"
                    onClick={() => incrementItem(p)}
                    aria-label="הוסף כמות"
                  >
                    <Icon name="plus" />
                  </button>
                </div>
              ) : null}

              {inList && (
                <button
                  className="btn btn--icon btn--danger"
                  onClick={() => removeItem(p.id)}
                  aria-label="הסר מרשימת קניות"
                  title="הסר מרשימת קניות"
                >
                  <Icon name="trash" />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {items.length > 0 && (
        <button className="btn btn--primary home-nav-cta" onClick={() => onNavigate('nav')}>
          <Icon name="compass" /> נווט לרשימה שלי
        </button>
      )}

      <p className="home-catalog-note">קטלוג הסניף: {PRODUCTS.length} מוצרים בעשר מחלקות.</p>
    </div>
  );
}
