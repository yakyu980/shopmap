import { useEffect, useState } from 'react';
import { lookupProductImageByName } from '../lib/openFoodFacts';
import { getDepartment } from '../lib/storeConfig';
import DeptIcon from './DeptIcon';

/**
 * תמונת-מוצר אמיתית מ-Open Food Facts (לפי שם, ר' openFoodFacts.js) —
 * עם fallback לאייקון-מחלקה כל עוד לא נמצאה תמונה (בטעינה, בכישלון-
 * רשת, או שהמוצר פשוט לא קיים במאגר החיצוני).
 */
export default function ProductImage({ product, className = 'product-image' }) {
  const [url, setUrl] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setUrl(null);
    lookupProductImageByName(product.name).then((found) => {
      if (!cancelled && found) setUrl(found);
    });
    return () => {
      cancelled = true;
    };
  }, [product.name]);

  if (url) {
    return <img className={className} src={url} alt={product.name} loading="lazy" />;
  }
  return (
    <span className={className + ' ' + className + '--fallback'}>
      <DeptIcon dept={getDepartment(product.department)} />
    </span>
  );
}
