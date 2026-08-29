import { getDepartment } from '../lib/storeConfig';
import DeptIcon from './DeptIcon';

// הערה: ניסינו בעבר לשלוף תמונת-מוצר אמיתית מ-Open Food Facts לפי
// *שם* (הקטלוג-הקבוע משתמש בברקודי-דמה, אז חיפוש-לפי-ברקוד לא רלוונטי
// שם) — אבל חיפוש-שם בעברית למונחים כלליים ("עגבניות") מחזיר לעיתים
// מוצר-ממותג לא-קשור, כלומר תמונה שגויה. לכן הקטלוג-הקבוע ממשיך
// להציג אייקון-מחלקה. מוצרים שנוצרו דרך "הוסף מוצר חדש" (סריקת-
// ברקוד-אמיתי) כן יכולים לשאת product.imageUrl אמיתי — התאמת-ברקוד
// מדויקת, לא חיפוש-שם — ואז מציגים אותה.
export default function ProductImage({ product, className = 'product-image' }) {
  if (product.imageUrl) {
    return <img src={product.imageUrl} alt="" className={className} />;
  }
  return (
    <span className={className + ' ' + className + '--fallback'}>
      <DeptIcon dept={getDepartment(product.department)} />
    </span>
  );
}
