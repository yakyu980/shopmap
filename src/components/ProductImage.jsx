import { useEffect, useState } from 'react';
import { getDepartment } from '../lib/storeConfig';
import DeptIcon from './DeptIcon';
import { lookupProductPhotoByName } from '../lib/productPhotoLookup';

// product.imageUrl (כשקיים) מגיע מהתאמת-ברקוד מדויקת מול Open Food
// Facts — אמין. כשאין כזה (הקטלוג-הקבוע, שמשתמש בברקודי-דמה), נופלים
// לחיפוש-שם — ⚠️ פחות אמין, יכול להחזיר מוצר-ממותג לא-קשור מהמאגר
// הגלובלי (למשל "עגבניות" → רוטב-עגבניות ממותג). המשתמש ביקש את זה
// במפורש בכל זאת; onError חוזר לאייקון-מחלקה אם ה-URL שבור.
export default function ProductImage({ product, className = 'product-image' }) {
  const [fetchedUrl, setFetchedUrl] = useState(null);
  const [broken, setBroken] = useState(false);

  useEffect(() => {
    setBroken(false);
    if (product.imageUrl) return;
    let cancelled = false;
    lookupProductPhotoByName(product.name).then((url) => {
      if (!cancelled) setFetchedUrl(url);
    });
    return () => {
      cancelled = true;
    };
  }, [product.imageUrl, product.name]);

  const src = product.imageUrl || fetchedUrl;
  if (src && !broken) {
    return <img src={src} alt="" className={className} onError={() => setBroken(true)} />;
  }
  return (
    <span className={className + ' ' + className + '--fallback'}>
      <DeptIcon dept={getDepartment(product.department)} />
    </span>
  );
}
