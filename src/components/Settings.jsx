import { useEffect, useState } from 'react';
import { useAuth } from '../lib/useAuth';
import { logout } from '../lib/auth';
import { resetStoreConfig } from '../lib/storeConfig';
import Login from './Login';
import PriceImport from './PriceImport';
import Icon from './Icon';
import CloseButton from './CloseButton';
import { api } from '../lib/apiClient';

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
  const [priceImportOpen, setPriceImportOpen] = useState(false);
  const [priceCities, setPriceCities] = useState([]);
  const [selectedPriceCity, setSelectedPriceCity] = useState('');
  const [priceCityStatus, setPriceCityStatus] = useState('idle');

  useEffect(() => {
    if (!navigator.permissions?.query) return;
    navigator.permissions
      .query({ name: 'geolocation' })
      .then((status) => setGpsPermission(status.state))
      .catch(() => setGpsPermission('unsupported'));
  }, []);

  useEffect(() => {
    if (!user) return;
    api.get('/price-data/cities')
      .then((data) => {
        setPriceCities(data.cities || []);
        setSelectedPriceCity(data.selectedCityCode || '');
      })
      .catch(() => setPriceCityStatus('error'));
  }, [user]);

  async function savePriceCity(cityCode) {
    setSelectedPriceCity(cityCode);
    if (!cityCode) return;
    setPriceCityStatus('saving');
    try {
      await api.put('/price-data/preferences', { cityCode });
      setPriceCityStatus('saved');
    } catch {
      setPriceCityStatus('error');
    }
  }

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
        <CloseButton onClick={onClose} />
        <h2>
          <Icon name="gear" /> הגדרות
        </h2>

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
                <Icon name="door" /> התנתק
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
            <Icon name="reset" /> אפס מפת-חנות לברירת-מחדל
          </button>
          {mapReset && (
            <span className="settings-confirm-msg">
              <Icon name="check" /> אופס
            </span>
          )}
          <br />
          {!confirmClear ? (
            <button className="btn btn--ghost btn--danger" onClick={() => setConfirmClear(true)}>
              <Icon name="trash" /> נקה נתונים מקומיים (רשימה, היסטוריית-קניות, משפחה-מקומית)
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
          {cleared && (
            <p className="settings-confirm-msg">
              <Icon name="check" /> נוקה — טוב לרענן את הדף
            </p>
          )}
        </section>

        {user && (
          <section className="settings-section">
            <h3>מחירים-רשמיים</h3>
            <p className="settings-hint">
              בחרו עיר כדי לקבל מחירים ומבצעים מקובצי שקיפות-המחירים הרשמיים של הרשתות.
            </p>
            <label className="receipt-venue-label">
              עיר להשוואת מחירים
              <select className="map-edit-input" value={selectedPriceCity} onChange={(event) => savePriceCity(event.target.value)}>
                <option value="">— בחרו עיר —</option>
                {priceCities.map((city) => <option key={city.code} value={city.code}>{city.name}</option>)}
              </select>
            </label>
            {priceCityStatus === 'saving' && <p className="settings-hint">שומר…</p>}
            {priceCityStatus === 'saved' && <p className="settings-confirm-msg"><Icon name="check" /> העיר נשמרה למשפחה</p>}
            {priceCityStatus === 'error' && <p className="settings-error"><Icon name="warning" /> מאגר המחירים אינו זמין כרגע</p>}
            <p className="settings-hint">ייבוא CSV ידני נשאר זמין כגיבוי ואינו מחליף את המקור הרשמי.</p>
            <button className="btn btn--ghost" onClick={() => setPriceImportOpen(true)}>
              <Icon name="receipt" /> ייבוא CSV ידני
            </button>
          </section>
        )}
        {priceImportOpen && <PriceImport onClose={() => setPriceImportOpen(false)} />}

        <section className="settings-section">
          <h3>מה אמיתי ומה הדגמה, בכנות</h3>
          <ul className="settings-honesty-list">
            <li>✅ אמיתי: מסלול-ניווט, GPS (כשמכויל), חיפוש/הוספה קולית, סריקת ברקוד (+זיהוי מול Open Food Facts כשלא בקטלוג שלנו), OCR-קבלות, סריקת QR-צ'ק-פוינט, עבודה בלי אינטרנט</li>
            <li>✅ אמיתי: זיהוי-מוצר-מתמונה (Gemini Vision, קריאת-שרת אמיתית) — רץ במקביל לזיהוי-הברקוד, מי שמזהה קודם מנצח</li>
            <li>✅ אמיתי: הוספת מוצר חדש שלא נמצא (ברקוד/תמונה) למאגר — נבדק מול מחירים-רשמיים-שיובאו לפי ברקוד, אחרת מחיר-ידני מסומן ככזה</li>
            <li>✅ אמיתי (כשמחוברים): סנכרון-משפחה, טיול-קניות משותף, עדכון-מיקום-מוצר, השוואת-מחירים חוצת-סניפים מקבלות שסרקתם, ייבוא מחירים-רשמיים</li>
            <li>✅ אמיתי: מחירים ומבצעים לפי סניף מקובצי שקיפות-המחירים הרשמיים, מתעדכנים פעם ביום ומציגים זמן מקור</li>
            <li>⚠️ מוצר בלי ברקוד-שיובא ובלי CSV-רשמי תואם — אין לו מקור-אמיתי למחיר, רק מה שהוזן ידנית</li>
          </ul>
        </section>
      </div>
    </div>
  );
}
