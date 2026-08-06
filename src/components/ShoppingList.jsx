import { getDepartment, locationLabel } from '../data/storeData';
import ProductSearch from './ProductSearch';
import VoiceAddPanel from './VoiceAddPanel';

export default function ShoppingList({ list, onGoNavigate }) {
  const { items, addItem, removeItem, clear } = list;
  const listedIds = new Set(items.map((i) => i.id));
  const total = items.reduce((sum, i) => sum + i.price, 0);

  return (
    <div className="shopping-list-page">
      <VoiceAddPanel onAdd={addItem} />
      <ProductSearch onAdd={addItem} listedIds={listedIds} />

      <div className="shopping-list-section">
        <div className="shopping-list-header">
          <h3>רשימת הקניות שלי ({items.length})</h3>
          {items.length > 0 && (
            <button className="btn btn--text" onClick={clear}>
              נקה הכל
            </button>
          )}
        </div>

        {items.length === 0 ? (
          <p className="empty-hint">הרשימה ריקה — חפשו מוצרים למעלה והוסיפו אותם.</p>
        ) : (
          <ul className="cart-list">
            {items.map((item) => {
              const dept = getDepartment(item.department);
              return (
                <li className="cart-row" key={item.id}>
                  <span className="cart-row-icon">{dept.icon}</span>
                  <span className="cart-row-info">
                    <span className="cart-row-name">{item.name}</span>
                    <span className="cart-row-loc">
                      {dept.name} · {locationLabel(item)}
                    </span>
                  </span>
                  <span className="cart-row-price">₪{item.price.toFixed(2)}</span>
                  <button
                    className="btn btn--icon btn--danger"
                    onClick={() => removeItem(item.id)}
                    aria-label="הסר"
                  >
                    🗑️
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        {items.length > 0 && (
          <div className="shopping-list-footer">
            <span className="cart-total">סה"כ: ₪{total.toFixed(2)}</span>
            <button className="btn btn--primary" onClick={onGoNavigate}>
              🧭 חשב מסלול וניווט
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
