import { useEffect, useRef, useState } from 'react';
import { browserProfile, checkCamera, checkLocation, checkMotion } from '../lib/mappingCapabilities';
import Icon from './Icon';

const checks = [
  { id: 'camera', label: 'מצלמה', icon: 'camera', run: checkCamera },
  { id: 'location', label: 'מיקום הסניף', icon: 'pin', run: checkLocation },
  { id: 'motion', label: 'תאוצה וסיבוב', icon: 'compass', run: checkMotion },
];
const labels = { idle: 'טרם נבדק', checking: 'ממתין לנתונים…', ready: 'התקבלו נתונים',
  partial: 'נתונים חלקיים', blocked: 'אין הרשאה', unavailable: 'לא זמין בדפדפן',
  'no-data': 'לא התקבלו נתונים', error: 'הבדיקה נכשלה', insecure: 'נדרש חיבור HTTPS' };

export default function MappingDeviceReadiness() {
  const [profile] = useState(() => browserProfile());
  const [results, setResults] = useState({});
  const pending = useRef(new Map());
  useEffect(() => {
    const controllers = pending.current;
    return () => {
      controllers.forEach((controller) => controller.abort());
      controllers.clear();
    };
  }, []);

  function runCheck(check) {
    if (pending.current.has(check.id)) return;
    const controller = new AbortController();
    pending.current.set(check.id, controller);
    setResults((previous) => ({ ...previous, [check.id]: { status: 'checking' } }));
    check.run(window, { signal: controller.signal }).then((result) => {
      if (controller.signal.aborted) return;
      pending.current.delete(check.id);
      setResults((previous) => ({ ...previous, [check.id]: result }));
    });
  }

  return (
    <section className="mapping-readiness" aria-label="מוכנות המכשיר למיפוי">
      <div className="mapping-readiness__heading"><span><Icon name="compass" /></span><div>
        <strong>בדיקת המכשיר למיפוי</strong>
        <small>{profile.platform} · {profile.runtime} · זיהוי מערכת משוער</small>
      </div></div>
      <p className="mapping-readiness__privacy">כל בדיקה מופעלת בנפרד. בבדיקת התנועה הטו מעט את הטלפון והמתינו עד ארבע שניות לאחר האישור.</p>
      <ul>
        {checks.map((check) => {
          const result = results[check.id] || { status: 'idle' };
          return <li key={check.id} className="mapping-readiness__check">
            <Icon name={check.icon} />
            <div><span>{check.label}</span><b aria-live="polite" className={`is-${result.status}`}>{labels[result.status]}</b>
              {Number.isFinite(result.accuracyMeters) && <small>דיוק מדווח: כ־{Math.ceil(result.accuracyMeters)} מטר</small>}
              {typeof result.acceleration === 'boolean' && <small>תאוצה: {result.acceleration ? 'התקבלה' : 'ללא נתונים'} · סיבוב: {result.rotation ? 'התקבל' : 'ללא נתונים'}</small>}
            </div>
            <button className="btn btn--ghost btn--small" type="button" aria-label={`בדוק ${check.label}`}
              disabled={!profile.secure || result.status === 'checking'} onClick={() => runCheck(check)}>בדיקה</button>
          </li>;
        })}
      </ul>
      {!profile.secure && <p role="alert">נדרש חיבור HTTPS לבדיקת החיישנים.</p>}
      <small className="mapping-readiness__privacy">המיקום מגיע משירות המיקום של המכשיר; מקורו אינו בהכרח GPS. נתוני תנועה אינם מיקום בתוך החנות. הצילום והמיקום אינם נשמרים או נשלחים לשרת, והמצלמה נסגרת בסיום הבדיקה.</small>
      <details><summary>יכולות מיפוי נוספות</summary>
        <p className="mapping-readiness__privacy">בגרסה זו טרם חוברו AR מרחבי, עומק, זיהוי אובייקטים ומיקום באמצעות Wi-Fi, BLE או UWB. בדיקת הדפדפן אינה קובעת אם החומרה קיימת בטלפון. מד הצעדים בניווט הוא הערכה ניסיונית בלבד.</p>
      </details>
    </section>
  );
}
