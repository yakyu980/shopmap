import { useMemo } from 'react';
import { getProduct } from '../data/storeData';
import { getPredictions } from '../lib/purchaseHistory';
import { getDepartment } from '../lib/storeConfig';

export default function PurchasePredictions({ onAdd, listedIds }) {
  const predictions = useMemo(() => getPredictions(getProduct), []);
  const relevant = predictions.filter((p) => !listedIds.has(p.product.id));

  if (relevant.length === 0) return null;

  return (
    <div className="predictions-panel">
      <p className="predictions-title">💡 כנראה נגמר לך (לפי הרגלי-הרכישה שלך)</p>
      <div className="predictions-chips">
        {relevant.map(({ product, daysSince }) => {
          const dept = getDepartment(product.department);
          return (
            <button
              key={product.id}
              className="prediction-chip"
              onClick={() => onAdd(product)}
              title={`נרכש לאחרונה לפני ${daysSince} ימים`}
            >
              {dept.icon} {product.name} <span className="prediction-add">➕</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
