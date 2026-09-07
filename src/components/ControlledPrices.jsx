import { useEffect, useState } from 'react';
import { api } from '../lib/apiClient';
import './ControlledPrices.css';

export default function ControlledPrices() {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  useEffect(() => {
    if (!open || data) return;
    let cancelled = false;
    setError('');
    api.get('/controlled-prices').then((result) => { if (!cancelled) setData(result); }).catch((err) => { if (!cancelled) setError(err.message); });
    return () => { cancelled = true; };
  }, [open, data]);
  return <details onToggle={(event) => setOpen(event.currentTarget.open)} className="controlled-prices">
    <summary>מחירים מרביים בפיקוח — מאגר משרד הכלכלה</summary>
    <p>המחיר האחרון שפורסם לכל שם מוצר במאגר, לא מחיר סניף או מבצע. רשומה ישנה אינה אישור שהמחיר עדיין בתוקף. יש לבדוק את הכמות והאריזה בפרסום הרשמי; אין התאמה אוטומטית למוצר ממותג.</p>
    {error ? <p role="alert">{error} — סגרו ופתחו לניסיון נוסף.</p> : !data ? <p>טוען מחירים מהמקור…</p> : <>
      <label>חיפוש במוצרים בפיקוח<input value={query} onChange={(event) => setQuery(event.target.value)} /></label>
      <div style={{ overflowX: 'auto' }}><table><thead><tr><th>מוצר לפי המקור</th><th>מרבי כולל מע״מ</th><th>אילת</th><th>תחולה</th></tr></thead><tbody>
        {data.products.filter((p) => p.name.includes(query.trim())).map((p) => <tr key={p.name}><th>{p.name}</th><td>₪{p.maximumPrice.toFixed(2)}</td><td>{p.eilatMaximumPrice == null ? 'לא נמסר' : `₪${p.eilatMaximumPrice.toFixed(2)}`}</td><td>{p.effectiveDate}</td></tr>)}
      </tbody></table></div>
      {!data.products.some((p) => p.name.includes(query.trim())) && <p role="status">לא נמצאו מוצרים מתאימים במאגר.</p>}
      <p><a href={data.source.url} target="_blank" rel="noreferrer">{data.source.name}</a> · <a href={data.source.licenseUrl} target="_blank" rel="noreferrer">רישיון שימוש</a></p>
      <small>נשלף ב־{new Date(data.fetchedAt).toLocaleString('he-IL')} · מידע ממשלתי ללא חסות ממשלתית לאפליקציה.</small>
    </>}
  </details>;
}
