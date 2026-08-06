import { useEffect, useState } from 'react';
import { useAuth } from '../lib/useAuth';
import { logout } from '../lib/auth';
import { resetStoreConfig } from '../lib/storeConfig';
import Login from './Login';

const LOCAL_KEYS_TO_CLEAR = [
  'supernav_shopping_list_v1',
  'supernav_purchase_history_v1',
  'supernav_verification_v1',
  'supernav_family_v1',
];

export default function Settings({ onClose }) {
  const { user, household } = useAuth();
  const [gpsPermission, setGpsPermission] = useState('unknown');
  const [confirmClear, setConfirmClear] = useState(false);
  const [cleared, setCleared] = useState(false);
  const [mapReset, setMapReset] = useState(false);

  useEffect(() => {
    if (!navigator.permissions?.query) return;
    navigator.permissions
      .query({ name: 'geolocation' })
      .then((status) => setGpsPermission(status.state))
      .catch(() => setGpsPermission('unsupported'));
  }, []);

  function handleClearLocalData() {
    LOCAL_KEYS_TO_CLEAR.forEach((k) => {
      try {
        localStorage.removeItem(k);
      } catch {
        /* אחסון חסום — מתעלמים */
      }
    });
    setConfirmClear(false);
    setCleared(true);
  }

  function handleResetMap() {
    resetStoreConfig();
    setMapReset(true);
    setTimeout(() => setMapReset(false), 2000);
  }

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-panel" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="סגור">
          ✕
        </button>
        <h2>⚙️ הגדרות</h2>

        <section className="settings-section">
          <h3>חשבון</h3>
          {user ? (
            <>
              <p className="settings-row">
                מחובר כ-<strong>{user.emoji} {user.username}</strong>
              </p>
              <p className="settings-row">
                משפחה: <strong>{household?.name}</strong> · קוד-הצטרפות:{' '}
                <code>{household?.joinCode}</code>
              </p>
              <p className="settings-hint">
                שתפו את הקוד עם בני-המשפחה כדי שיצטרפו ויראו את אותם עדכוני-מיקום/מחיר/משפחה.
              </p>
              <button className="btn btn--ghost" onClick={logout}>
                🚪 התנתק
              </button>
            </>
          ) : (
            <Login onDone={() => {}} />
          )}
        </section>

        <section className="settings-section">
          <h3>מיקום (GPS)</h3>
          <p className="settings-row">
            הרשאת-מיקום בדפדפן:{' '}
            <strong>
              {gpsPermission === 'granted' && 'מאושרת ✅'}
              {gpsPermission === 'prompt' && 'תישאל כשתפעילו GPS'}
              {gpsPermission === 'denied' && 'נחסמה ❌'}
              {gpsPermission === 'unsupported' && 'לא נתמכת בדפדפן זה'}
              {gpsPermission === 'unknown' && 'לא ידועה'}
            </strong>
          </p>
          <p className="settings-hint">
            הפעלת/כיבוי GPS בפועל נעשים ממסך "🧭 ניווט" (חלונית-המיקום) — כדי לכייל
            מחלקה ל-GPS אמיתי, נכנסים ל"🗺️ מפת חנות" → "✏️ ערוך מפה".
          </p>
        </section>

        <section className="settings-section">
          <h3>נתונים מקומיים</h3>
          <button className="btn btn--ghost" onClick={handleResetMap}>
            ↺ אפס מפת-חנות לברירת-מחדל
          </button>
          {mapReset && <span className="settings-confirm-msg">✓ אופס</span>}
          <br />
          {!confirmClear ? (
            <button className="btn btn--ghost btn--danger" onClick={() => setConfirmClear(true)}>
              🗑️ נקה נתונים מקומיים (רשימה, היסטוריית-קניות, משפחה-מקומית)
            </button>
          ) : (
            <div className="settings-confirm-row">
              <span>בטוחים? זה לא ניתן לביטול.</span>
              <button className="btn btn--danger btn--small" onClick={handleClearLocalData}>
                כן, נקה
              </button>
              <button className="btn btn--ghost btn--small" onClick={() => setConfirmClear(false)}>
                ביטול
              </button>
            </div>
          )}
          {cleared && <p className="settings-confirm-msg">✓ נוקה — טוב לרענן את הדף</p>}
        </section>

        <section className="settings-section">
          <h3>מה אמיתי ומה הדגמה, בכנות</h3>
          <ul className="settings-honesty-list">
            <li>✅ אמיתי: מסלול-ניווט, GPS (כשמכויל), חיפוש/הוספה קולית, סריקת ברקוד, עבודה בלי אינטרנט</li>
            <li>✅ אמיתי (כשמחוברים): סנכרון-משפחה, עדכון-מיקום-מוצר, היסטוריית-מחיר, אימות-קהילתי — דרך שרת-הדגמה מקומי</li>
            <li>🎭 הדגמה מוצהרת: זיהוי-מוצר-מתמונה (עדיין ניחוש-דטרמיניסטי, לא AI-ראייה אמיתי)</li>
            <li>⚠️ שרת-ההדגמה רץ מקומית בלבד בסביבה הזו — לא פרוס לאינטרנט</li>
          </ul>
        </section>
      </div>
    </div>
  );
}
