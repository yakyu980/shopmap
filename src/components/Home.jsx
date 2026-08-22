import { PRODUCTS, getSaleProducts } from '../data/storeData';
import FamilyManager from './FamilyManager';
import PurchasePredictions from './PurchasePredictions';
import Icon from './Icon';

const SHORTCUTS = [
  { tab: 'map', icon: 'map', label: 'מפת חנות' },
  { tab: 'list', icon: 'list', label: 'רשימת קניות' },
  { tab: 'compare', icon: 'tag', label: 'השוואת מחירים' },
  { tab: 'nav', icon: 'compass', label: 'ניווט' },
];

export default function Home({ list, onNavigate }) {
  const { items, addItem } = list;
  const listedIds = new Set(items.map((i) => i.id));
  const total = items.reduce((sum, i) => sum + i.price, 0);
  const saleCount = getSaleProducts().length;

  return (
    <div className="home-page">
      <div className="home-hero">
        <p className="home-hero-title">מוכנים לקנייה חכמה? 🛒</p>
        <p className="home-hero-sub">
          {items.length > 0
            ? `יש לכם ${items.length} פריטים ברשימה — בואו נצא לדרך`
            : 'הוסיפו מוצרים לרשימה ונבנה לכם מסלול קנייה קצר ויעיל'}
        </p>
        <button className="btn home-hero-btn" onClick={() => onNavigate('nav')}>
          <Icon name="compass" /> התחלת מסלול קנייה
        </button>
      </div>

      <div className="home-stats">
        <div className="home-stat">
          <span className="home-stat-value">{items.length}</span>
          <span className="home-stat-label">פריטים ברשימה</span>
        </div>
        <div className="home-stat">
          <span className="home-stat-value">₪{total.toFixed(2)}</span>
          <span className="home-stat-label">סה״כ בעגלה</span>
        </div>
        <div className="home-stat">
          <span className="home-stat-value">{saleCount}</span>
          <span className="home-stat-label">
            <Icon name="tag" /> מבצעים היום
          </span>
        </div>
      </div>

      <FamilyManager />
      <PurchasePredictions onAdd={addItem} listedIds={listedIds} />

      <div className="home-shortcuts">
        {SHORTCUTS.map((s) => (
          <button key={s.tab} className="home-shortcut" onClick={() => onNavigate(s.tab)}>
            <span className="home-shortcut-icon">
              <Icon name={s.icon} />
            </span>
            {s.label}
          </button>
        ))}
      </div>

      <p className="home-catalog-note">קטלוג הסניף: {PRODUCTS.length} מוצרים בעשר מחלקות.</p>
    </div>
  );
}
