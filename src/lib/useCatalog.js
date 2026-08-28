import { useEffect } from 'react';
import { useSyncExternalStore } from 'react';
import { subscribeCatalog, getDynamicProducts, ensureCatalogLoaded } from './catalog';

/** טוען את המוצרים-הדינמיים מהשרת (פעם אחת) ומנוי לעדכונים — קוראים
 * לזה ברכיב שצריך שהקטלוג יהיה מעודכן-בזמן-אמת (חיפוש/סריקה). */
export function useCatalog() {
  useEffect(() => {
    ensureCatalogLoaded();
  }, []);
  return useSyncExternalStore(subscribeCatalog, getDynamicProducts);
}
