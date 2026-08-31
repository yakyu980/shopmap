import { groupChainPrices } from '../lib/chainPriceBlocks';

export default function ChainPriceBlocks({ product, rows, venues, status, onRemove }) {
  const chains = groupChainPrices(rows, venues);
  const cheapest = chains[0]?.price;
  return <article className="chain-comparison">
    <header className="chain-comparison__header">
      <div><h3>{product.name}</h3><small dir="ltr">{product.barcode}</small></div>
      <button type="button" className="btn btn--ghost" onClick={onRemove} aria-label={`הסרת ${product.name} מההשוואה`}>הסרה</button>
    </header>
    <p className="chain-comparison__hint">כל בלוק הוא רשת · מוצג המחיר הרגיל הנמוך ביותר בסניפים שנבחרו</p>
    {status === 'loading' ? <p role="status">טוען מחירים…</p> : status === 'error' ? <p role="alert">לא הצלחנו לטעון מחירים למוצר הזה.</p> : !chains.length ? <p>אין עדיין מחיר למוצר ברשתות שנבחרו.</p> :
      <div className="chain-price-grid">{chains.map((row) => {
        const winner = chains.length > 1 && row.price === cheapest;
        const date = new Date(row.sourceUpdatedAt || row.importedAt);
        return <section key={row.chainName} className={`chain-price-block${winner ? ' is-cheapest' : ''}`} aria-label={`${row.chainName}: ${row.price.toFixed(2)} שקלים${winner ? ', הכי זול' : ''}`}>
          <h4>{row.chainName}</h4>
          <span className="chain-price-block__badge">{winner ? '✓ הכי זול' : chains.length === 1 ? 'מחיר זמין יחיד' : `יקר ב־₪${(row.price - cheapest).toFixed(2)}`}</span>
          <strong className="chain-price-block__price">₪{row.price.toFixed(2)}</strong>
          <small>{row.storeName || row.venueName}</small>
          {row.stale && <small className="chain-price-block__stale">המחיר האחרון שפורסם · לא מעודכן</small>}
          {!Number.isNaN(date.getTime()) && <small>עודכן: {date.toLocaleDateString('he-IL')}</small>}
          {(row.promotions || []).length > 0 && <details><summary>מבצעים ותנאים</summary>{row.promotions.map((promo, index) => <p key={promo.id || index}>
            {promo.description || 'מבצע'}{Number.isFinite(promo.discountedPrice) ? ` · ₪${promo.discountedPrice.toFixed(2)}` : ''}{promo.minQuantity > 1 ? ` · בקניית ${promo.minQuantity}` : ''}{promo.clubOnly ? ' · לחברי מועדון בלבד' : ''}
          </p>)}</details>}
        </section>;
      })}</div>}
  </article>;
}
