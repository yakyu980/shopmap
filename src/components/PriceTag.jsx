import { getSalePrice } from '../data/storeData';

/** מציג מחיר רגיל, או מחיר-מבצע (מקורי חצוי + מחיר-מוזל + תג-אחוזים). */
export default function PriceTag({ product, size = 'normal' }) {
  const sale = getSalePrice(product);
  const sizeClass = size === 'small' ? ' price-tag--small' : '';

  if (!sale) {
    return <span className={'price-tag' + sizeClass}>₪{product.price.toFixed(2)}</span>;
  }

  return (
    <span className={'price-tag price-tag--sale' + sizeClass}>
      <span className="price-tag-original">₪{sale.original.toFixed(2)}</span>
      <span className="price-tag-discounted">₪{sale.discounted.toFixed(2)}</span>
      <span className="price-tag-percent">🏷️ {sale.percent}%-</span>
    </span>
  );
}
