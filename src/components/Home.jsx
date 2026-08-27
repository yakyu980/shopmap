import { PRODUCTS, getSaleProducts } from '../data/storeData';
import FamilyManager from './FamilyManager';
import PurchasePredictions from './PurchasePredictions';
import Icon from './Icon';

export default function Home({ list }) {
  const { items, addItem } = list;
  const listedIds = new Set(items.map((i) => i.id));
  const total = items.reduce((sum, i) => sum + i.price, 0);
  const saleCount = getSaleProducts().length;

  return (
    <div className="home-page">
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

      <p className="home-catalog-note">קטלוג הסניף: {PRODUCTS.length} מוצרים בעשר מחלקות.</p>
    </div>
  );
}
