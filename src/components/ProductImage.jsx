import { getDepartment } from '../lib/storeConfig';
import DeptIcon from './DeptIcon';

// הערה: ניסינו בעבר לשלוף תמונת-מוצר אמיתית מ-Open Food Facts לפי
// *שם* (הקטלוג שלנו משתמש בברקודי-דמה, אז חיפוש-לפי-ברקוד לא רלוונטי
// כאן) — אבל חיפוש-שם בעברית למונחים כלליים ("עגבניות") מחזיר לעיתים
// מוצר-ממותג לא-קשור מהמאגר הגלובלי, כלומר תמונה שגויה. עדיף אייקון-
// מחלקה עקבי ותמיד-נכון על פני תמונה "אמיתית" שעלולה להטעות.
export default function ProductImage({ product, className = 'product-image' }) {
  return (
    <span className={className + ' ' + className + '--fallback'}>
      <DeptIcon dept={getDepartment(product.department)} />
    </span>
  );
}
