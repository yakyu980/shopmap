import { useEffect, useMemo, useState } from 'react';
import { useReceiptHistory } from '../lib/useReceiptHistory';
import { useVenues } from '../lib/useVenues';
import Icon from './Icon';

function normalizeName(value = '') {
  return value.trim().toLocaleLowerCase('he-IL').replace(/[\s\-–—.,'"׳״()]+/g, ' ');
}

function aggregateItems(receipt) {
  const items = new Map();
  for (const item of receipt?.items || []) {
    const key = item.matchedProductId ? `product:${item.matchedProductId}` : `name:${normalizeName(item.name)}`;
    const current = items.get(key);
    if (current) {
      current.price += Number(item.price) || 0;
      current.count += 1;
      current.discountPercent = Math.max(current.discountPercent || 0, item.discountPercent || 0) || null;
    } else {
      items.set(key, { name: item.name, price: Number(item.price) || 0, count: 1, discountPercent: item.discountPercent || null });
    }
  }
  return items;
}

function receiptLabel(receipt, venueName) {
  const total = receipt.items.reduce((sum, item) => sum + (Number(item.price) || 0), 0);
  return `${new Date(receipt.date).toLocaleDateString('he-IL')} · ${venueName} · ₪${total.toFixed(2)}`;
}

function explainDifference(before, after, beforeVenue, afterVenue, delta) {
  if (!before || !after) return 'המוצר לא מופיע בשתי הקניות';
  if (Math.abs(delta) < 0.005) return 'המחיר לא השתנה';
  const beforeDiscount = before.discountPercent || 0;
  const afterDiscount = after.discountPercent || 0;
  if (afterDiscount > beforeDiscount) return `הנחה גבוהה יותר בקנייה החדשה (${afterDiscount}%)`;
  if (beforeDiscount > afterDiscount) return `הנחה גבוהה יותר בקנייה הקודמת (${beforeDiscount}%)`;
  if (beforeVenue !== afterVenue && beforeVenue !== 'סניף לא צוין' && afterVenue !== 'סניף לא צוין') return 'הקניות בוצעו בסניפים או ברשתות שונים';
  if (beforeDiscount > 0 && afterDiscount > 0) return 'בשתי הקניות תועדה הנחה; סיבת הפער אינה מתועדת';
  return 'לא תועדה סיבה לפער המחיר';
}

export default function PurchaseHistoryCompare() {
  const receipts = useReceiptHistory();
  const { venues } = useVenues();
  const [beforeId, setBeforeId] = useState('');
  const [afterId, setAfterId] = useState('');

  const venueNames = useMemo(() => new Map(venues.map((venue) => [venue.id, `${venue.chainName} · ${venue.branchName}`])), [venues]);
  const venueName = (receipt) => venueNames.get(receipt?.venueId) || 'סניף לא צוין';

  useEffect(() => {
    if (receipts.length < 2) return;
    if (!beforeId || !receipts.some((receipt) => receipt.id === beforeId)) setBeforeId(receipts[1].id);
    if (!afterId || !receipts.some((receipt) => receipt.id === afterId)) setAfterId(receipts[0].id);
  }, [receipts, beforeId, afterId]);

  const beforeReceipt = receipts.find((receipt) => receipt.id === beforeId);
  const afterReceipt = receipts.find((receipt) => receipt.id === afterId);
  const comparison = useMemo(() => {
    if (!beforeReceipt || !afterReceipt) return [];
    const beforeItems = aggregateItems(beforeReceipt);
    const afterItems = aggregateItems(afterReceipt);
    return [...new Set([...beforeItems.keys(), ...afterItems.keys()])].map((key) => {
      const before = beforeItems.get(key);
      const after = afterItems.get(key);
      const delta = before && after ? after.price - before.price : null;
      return { key, name: after?.name || before?.name, before, after, delta };
    }).sort((a, b) => Number(b.before && b.after) - Number(a.before && a.after) || a.name.localeCompare(b.name, 'he'));
  }, [beforeReceipt, afterReceipt]);

  if (receipts.length < 2) {
    return <div className="purchase-compare-empty"><Icon name="receipt" /><strong>צריך לפחות שתי קניות להשוואה</strong><span>סרקו ושמרו שתי קבלות. מומלץ לציין את הסניף וההנחה כדי שנוכל להסביר את פער המחיר.</span></div>;
  }

  const comparableRows = comparison.filter((row) => row.before && row.after);
  const cheaper = comparableRows.filter((row) => row.delta < -0.005).length;
  const pricier = comparableRows.filter((row) => row.delta > 0.005).length;
  const unchanged = comparableRows.length - cheaper - pricier;
  const comparableDelta = comparableRows.reduce((sum, row) => sum + row.delta, 0);

  return (
    <div className="purchase-compare-page">
      <p className="compare-intro">בחרו שתי קניות. הטבלה משווה רק מידע שנשמר בקבלות; סיבת שינוי מוצגת כעובדה רק כשנרשמו הנחה או סניף שונה.</p>
      <div className="purchase-compare-selectors">
        <label><span>קנייה קודמת</span><select value={beforeId} onChange={(event) => setBeforeId(event.target.value)}>{receipts.filter((receipt) => receipt.id !== afterId).map((receipt) => <option key={receipt.id} value={receipt.id}>{receiptLabel(receipt, venueName(receipt))}</option>)}</select></label>
        <label><span>קנייה להשוואה</span><select value={afterId} onChange={(event) => setAfterId(event.target.value)}>{receipts.filter((receipt) => receipt.id !== beforeId).map((receipt) => <option key={receipt.id} value={receipt.id}>{receiptLabel(receipt, venueName(receipt))}</option>)}</select></label>
      </div>
      <div className="purchase-compare-summary" aria-live="polite">
        <div className="is-cheaper"><small>הוזלו</small><strong>{cheaper}</strong></div>
        <div className="is-pricier"><small>התייקרו</small><strong>{pricier}</strong></div>
        <div><small>ללא שינוי</small><strong>{unchanged}</strong></div>
        <div className={comparableDelta < 0 ? 'is-cheaper' : comparableDelta > 0 ? 'is-pricier' : ''}><small>הפרש בפריטים משותפים</small><strong>{comparableDelta > 0 ? '+' : ''}₪{comparableDelta.toFixed(2)}</strong></div>
      </div>
      <div className="purchase-compare-table-wrap" tabIndex="0" aria-label="טבלת השוואת קניות, ניתן לגלול לצדדים">
        <table className="purchase-compare-table">
          <thead><tr><th scope="col">מוצר</th><th scope="col">קנייה קודמת</th><th scope="col">קנייה להשוואה</th><th scope="col">שינוי</th><th scope="col">למה?</th></tr></thead>
          <tbody>{comparison.map((row) => {
            const state = row.delta == null ? 'missing' : row.delta < -0.005 ? 'cheaper' : row.delta > 0.005 ? 'pricier' : 'same';
            return <tr key={row.key} className={`is-${state}`}><th scope="row">{row.name}{(row.before?.count > 1 || row.after?.count > 1) && <small>סכום של כמה שורות זהות</small>}</th><td>{row.before ? `₪${row.before.price.toFixed(2)}` : 'לא נקנה'}</td><td>{row.after ? `₪${row.after.price.toFixed(2)}` : 'לא נקנה'}</td><td><strong>{row.delta == null ? '—' : Math.abs(row.delta) < 0.005 ? 'ללא שינוי' : `${row.delta > 0 ? '+' : '−'}₪${Math.abs(row.delta).toFixed(2)}`}</strong></td><td>{explainDifference(row.before, row.after, venueName(beforeReceipt), venueName(afterReceipt), row.delta)}</td></tr>;
          })}</tbody>
        </table>
      </div>
      <p className="purchase-compare-note"><Icon name="warning" /> מחיר הקבלה הוא המחיר שנרשם לשורה. כשאין כמות או מחיר ליחידה, אין אפשרות לקבוע אם הפער נובע מאריזה או מכמות שונה.</p>
    </div>
  );
}
