import { useEffect, useState } from 'react';
import { computeRoute, dist, reorderRemainingStops, GRID_UNIT_METERS } from '../lib/route';
import { locationLabel } from '../data/storeData';
import { getDepartment, getDepartments } from '../lib/storeConfig';
import { markFound, markNotFound } from '../lib/verification';
import { useStepCounter } from '../lib/useStepCounter';
import { useGeolocationWatch } from '../lib/useGeolocationWatch';
import { matchDepartmentByGps } from '../lib/geoMatch';
import { useFamilyMembers } from '../lib/useFamilyMembers';
import { recordPurchase } from '../lib/purchaseHistory';
import StoreMap from './StoreMap';
import CameraNav from './CameraNav';
import LocationCheckin from './LocationCheckin';
import ProductDetail from './ProductDetail';
import CheckpointScanner from './CheckpointScanner';
import Icon from './Icon';
import DeptIcon from './DeptIcon';

const GPS_ACCURACY_THRESHOLD_M = 30; // מעל זה — לא סומכים על ה-fix
const GPS_MATCH_MAX_M = 60; // מרחק מקסימלי ממחלקה-מכוילת כדי לזהות אותה

function timeAgoLabel(ts) {
  if (!ts) return null;
  const sec = Math.round((Date.now() - ts) / 1000);
  if (sec < 60) return `לפני ${sec} שנ׳`;
  return `לפני ${Math.round(sec / 60)} דק׳`;
}

export default function Navigation({ list, onBack }) {
  const { items, togglePicked, addItem, removeItem, clear } = list;
  const [routeInit] = useState(() => computeRoute(items));
  const { entrance } = routeInit;
  const [stops, setStops] = useState(routeInit.stops);
  const [stopIndex, setStopIndex] = useState(0);
  const [arMode, setArMode] = useState(false);

  const [currentLocationId, setCurrentLocationId] = useState(null);
  const [lastCheckinAt, setLastCheckinAt] = useState(null);
  const [showInlinePicker, setShowInlinePicker] = useState(false);
  const [rerouteHint, setRerouteHint] = useState('');
  const [detailProduct, setDetailProduct] = useState(null);
  const [checkpointPosition, setCheckpointPosition] = useState(null); // {x,y,floor} | null
  const [currentCheckpointId, setCurrentCheckpointId] = useState(null);
  const [checkpointScannerOpen, setCheckpointScannerOpen] = useState(false);
  const stepCounter = useStepCounter();
  const gps = useGeolocationWatch();
  const family = useFamilyMembers();

  const finished = stopIndex >= stops.length;

  const gpsConfident =
    gps.active && gps.position != null && gps.position.accuracy <= GPS_ACCURACY_THRESHOLD_M;
  const gpsMatch = gpsConfident ? matchDepartmentByGps(gps.position, getDepartments(), GPS_MATCH_MAX_M) : null;
  // "יש קליטת-GPS" = יש fix מדויק *וגם* הוא תואם למחלקה-מכוילת — בלי זה
  // אין דרך לתרגם את הנקודה-על-כדור-הארץ למפה-הלוגית שלנו.
  const gpsUsable = gpsConfident && gpsMatch != null;

  // עדכון-מיקום אוטומטי מ-GPS כשיש קליטה שמישה, בלי לפתוח שום פרומפט.
  // אין יותר טיימר-יזום — עדכון-מיקום ידני זמין תמיד דרך הכרטיס הקבוע
  // (locationCard) למטה, בלי לקפוץ למסך המשתמש.
  useEffect(() => {
    if (!gpsUsable || finished) return;
    if (gpsMatch.id === currentLocationId) return;
    handleCheckin(gpsMatch.id, { silent: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gpsUsable, gpsMatch?.id, finished]);

  if (items.length === 0) {
    return (
      <div className="nav-page">
        <p className="empty-hint">אין מוצרים ברשימת הקניות. חזרו והוסיפו מוצרים כדי לחשב מסלול.</p>
        <button className="btn btn--primary" onClick={onBack}>
          <Icon name="arrow-left" /> חזרה לרשימה
        </button>
      </div>
    );
  }

  const stop = !finished ? stops[stopIndex] : null;
  const allPickedAtStop = stop ? stop.items.every((i) => items.find((x) => x.id === i.id)?.picked) : false;
  const saleItemsAtStop = stop ? stop.items.filter((i) => i.salePercent) : [];
  // מיקום-מדויק-אמיתי מסריקת-צ'ק-פוינט (לא הדמיה) גובר על מרכז-תא-
  // המחלקה — אבל רק כשהיעד באותה קומה; אחרת חישוב-הכיוון הדו-ממדי
  // לא משמעותי בין קומות (ר' floorMismatch למטה, שמציג רמז-קומה
  // במקום חץ מטעה).
  const floorMismatch = checkpointPosition && stop && stop.department.floor !== checkpointPosition.floor;
  const fromDept =
    (checkpointPosition && !floorMismatch && { x: checkpointPosition.x, y: checkpointPosition.y }) ||
    (currentLocationId && getDepartment(currentLocationId)) ||
    (stopIndex === 0 ? entrance : stops[stopIndex - 1].department);

  const expectedMeters = stop ? dist(fromDept, stop.department) * GRID_UNIT_METERS : 0;
  const showStepHint =
    stepCounter.active && expectedMeters > 0 && stepCounter.distanceMeters > expectedMeters * 1.5;

  function reportFound(productId) {
    markFound(productId);
  }
  function reportNotFound(item) {
    markNotFound(item.id);
    setDetailProduct(item);
  }
  function goNext() {
    setStopIndex((i) => i + 1);
    if (stopIndex + 1 >= stops.length) setArMode(false);
  }

  function handleFinish() {
    recordPurchase(items.map((i) => i.id));
    clear();
    onBack();
  }

  function handleCheckin(deptId, opts = {}) {
    setCurrentLocationId(deptId);
    setLastCheckinAt(Date.now());
    stepCounter.reset();
    setShowInlinePicker(false);
    if (!opts.viaCheckpoint) {
      setCheckpointPosition(null);
      setCurrentCheckpointId(null);
    }

    if (!finished && deptId !== stop.department.id) {
      const fromPoint = getDepartment(deptId);
      setStops((prev) => reorderRemainingStops(prev, stopIndex, fromPoint));
      setRerouteHint(
        opts.viaCheckpoint
          ? '📷 המסלול עודכן לפי סריקת הצ׳ק-פוינט'
          : opts.silent
            ? '📡 המסלול עודכן אוטומטית לפי GPS'
            : '📍 המסלול עודכן לפי המיקום שדיווחת'
      );
      setTimeout(() => setRerouteHint(''), 4000);
    }
  }

  // סריקת-QR של צ'ק-פוינט אמיתי (ר' CheckpointScanner.jsx) — לא GPS
  // ולא הדמיה. אין מחלקה-מדויקת לצ'ק-פוינט עצמו (הוא נקודת-ניווט, לא
  // מדף), אז לצורך "מיקום נוכחי" בכרטיס+לוגיקת-מסלול-מחדש משתמשים
  // במחלקה הקרובה-ביותר אליו על אותה קומה; לחישוב-הכיוון המדויק
  // (החץ ב-AR) עצמו כן משתמשים בקואורדינטות-הצ'ק-פוינט המדויקות
  // (ר' fromDept למעלה) — לא רק "המחלקה הקרובה".
  function handleCheckpointScan(checkpoint) {
    setCheckpointPosition({ x: checkpoint.x, y: checkpoint.y, floor: checkpoint.floor });
    setCurrentCheckpointId(checkpoint.id);
    const deptsOnFloor = getDepartments().filter((d) => d.floor === checkpoint.floor);
    let nearest = null;
    let nearestDist = Infinity;
    for (const d of deptsOnFloor) {
      const dd = Math.hypot(d.x - checkpoint.x, d.y - checkpoint.y);
      if (dd < nearestDist) {
        nearestDist = dd;
        nearest = d;
      }
    }
    if (nearest) handleCheckin(nearest.id, { viaCheckpoint: true });
  }

  const locationCard = (
    <div className="location-card">
      <div className="location-card-row">
        <span className="location-card-info">
          {currentLocationId ? (
            <>
              <Icon name="pin" /> <DeptIcon dept={getDepartment(currentLocationId)} />{' '}
              {getDepartment(currentLocationId).name}
              <span className="location-card-time"> · {timeAgoLabel(lastCheckinAt)}</span>
            </>
          ) : (
            'מיקום לא ידוע'
          )}
        </span>
        <button
          className="btn btn--ghost btn--small"
          onClick={() => setShowInlinePicker((v) => !v)}
        >
          <Icon name="pin" /> עדכן מיקום
        </button>
        <button className="btn btn--ghost btn--small" onClick={() => setCheckpointScannerOpen(true)}>
          <Icon name="camera" /> סרוק צ׳ק-פוינט
        </button>
      </div>

      {showInlinePicker && <LocationCheckin onSelect={handleCheckin} />}
      {floorMismatch && (
        <p className="step-hint">
          <Icon name="pin" /> הצ׳ק-פוינט האחרון שסרקת הוא בקומה אחרת מהיעד הבא — עלו/רדו קומה ואז
          סרקו צ׳ק-פוינט שם לניווט מדויק.
        </p>
      )}

      <div className="location-card-row location-card-steps">
        {!gps.active ? (
          <button className="btn btn--text btn--small" onClick={gps.start} disabled={!gps.supported}>
            <Icon name="wifi" /> הפעל GPS (אמיתי, תלוי-קליטה)
          </button>
        ) : gpsUsable ? (
          <span className="step-info">
            <Icon name="wifi" /> GPS פעיל — מעדכן מיקום אוטומטית
          </span>
        ) : gpsConfident ? (
          <span className="step-info">
            <Icon name="wifi" /> יש קליטת-GPS, אך המחלקה כאן לא כוילה — עדכנו מיקום ידנית
          </span>
        ) : (
          <span className="step-info">
            <Icon name="wifi" /> מחפש קליטת-GPS… (בד"כ עובד רק ליד כניסה/חוץ)
          </span>
        )}
        {!gps.supported && <span className="step-unsupported">לא נתמך במכשיר זה</span>}
      </div>
      {gps.error && <p className="step-unsupported">שגיאת-GPS: {gps.error}</p>}

      <div className="location-card-row location-card-steps">
        {!stepCounter.active ? (
          <button
            className="btn btn--text btn--small"
            onClick={stepCounter.start}
            disabled={!stepCounter.supported}
          >
            <Icon name="footsteps" solid /> הפעל מד-צעדים (ניסיוני)
          </button>
        ) : (
          <span className="step-info">
            <Icon name="footsteps" solid /> הלכת כ-{stepCounter.distanceMeters} מ׳ מאז העדכון האחרון
          </span>
        )}
        {!stepCounter.supported && <span className="step-unsupported">לא נתמך במכשיר זה</span>}
      </div>
      {showStepHint && (
        <p className="step-hint">
          יכול להיות שהגעת — כדאי לעדכן מיקום? <Icon name="pin" />
        </p>
      )}
      {rerouteHint && <p className="reroute-hint">{rerouteHint}</p>}
    </div>
  );

  if (arMode && stop) {
    return (
      <>
        <CameraNav
          fromDept={fromDept}
          stop={stop}
          items={items}
          togglePicked={(id) => {
            togglePicked(id);
            reportFound(id);
          }}
          onNext={goNext}
          isLast={stopIndex + 1 >= stops.length}
          onExit={() => setArMode(false)}
          currentLocationId={currentLocationId}
          onCheckin={handleCheckin}
          stepCounter={stepCounter}
          onScanCheckpoint={() => setCheckpointScannerOpen(true)}
        />
        {checkpointScannerOpen && (
          <CheckpointScanner onScan={handleCheckpointScan} onClose={() => setCheckpointScannerOpen(false)} />
        )}
      </>
    );
  }

  return (
    <div className="nav-page">
      <div className="nav-summary">
        <div>
          <strong>{stops.length}</strong> תחנות ·{' '}
          <Icon name="clock" /> כ-{routeInit.estimatedMinutes} דק׳ משוער
        </div>
        <button className="btn btn--text" onClick={onBack}>
          <Icon name="arrow-left" /> חזרה לרשימה
        </button>
      </div>

      {locationCard}
      {checkpointScannerOpen && (
        <CheckpointScanner onScan={handleCheckpointScan} onClose={() => setCheckpointScannerOpen(false)} />
      )}

      <StoreMap activeDeptId={stop?.department.id} currentCheckpointId={currentCheckpointId} />

      <ol className="route-steps">
        {stops.map((s, idx) => (
          <li
            key={s.department.id}
            className={
              'route-step' +
              (idx === stopIndex ? ' route-step--active' : '') +
              (idx < stopIndex ? ' route-step--done' : '')
            }
          >
            <span className="route-step-badge">{idx < stopIndex ? <Icon name="check" /> : idx + 1}</span>
            <span>
              <DeptIcon dept={s.department} /> {s.department.name}
            </span>
          </li>
        ))}
      </ol>

      {saleItemsAtStop.length > 0 && (
        <div className="sale-banner">
          <p className="sale-banner-title">
            <Icon name="tag" /> מבצע בתחנה זו!
          </p>
          <ul className="sale-banner-list">
            {saleItemsAtStop.map((i) => (
              <li key={i.id}>
                {i.name} — {i.salePercent}% הנחה
              </li>
            ))}
          </ul>
        </div>
      )}

      {finished ? (
        <div className="nav-finished">
          <h2>
            <Icon name="cart" /> הגעת לקופות!
          </h2>
          <p>כל המחלקות הוקפו במסלול היעיל ביותר.</p>
          <button className="btn btn--primary" onClick={handleFinish}>
            סיום קנייה
          </button>
        </div>
      ) : (
        <div className="nav-stop-card">
          <div className="nav-stop-head">
            <h2>
              <DeptIcon dept={stop.department} /> {stop.department.name}
            </h2>
            <button className="btn btn--ghost btn--small" onClick={() => setArMode(true)}>
              <Icon name="camera" /> ניווט AR
            </button>
          </div>
          <ul className="nav-item-list">
            {stop.items.map((item) => {
              const live = items.find((x) => x.id === item.id);
              return (
                <li className={'nav-item' + (live?.picked ? ' nav-item--picked' : '')} key={item.id}>
                  <label className="nav-item-check">
                    <input
                      type="checkbox"
                      checked={!!live?.picked}
                      onChange={() => {
                        togglePicked(item.id);
                        reportFound(item.id);
                      }}
                    />
                    <span>
                      <span className="nav-item-name">
                        {item.name}
                        {item.assignee &&
                          (() => {
                            const member = family.members.find((m) => m.id === item.assignee);
                            return member ? <span className="assignee-badge"> {member.emoji}</span> : null;
                          })()}
                      </span>
                      <span className="nav-item-loc">{locationLabel(item)}</span>
                    </span>
                  </label>
                  <button
                    className="btn btn--text btn--small"
                    onClick={() => reportNotFound(item)}
                    title="דווח שהמוצר לא נמצא במיקום"
                  >
                    <Icon name="close" /> לא נמצא
                  </button>
                </li>
              );
            })}
          </ul>

          <button className="btn btn--primary nav-next" onClick={goNext}>
            {allPickedAtStop && <Icon name="check" />}
            {stopIndex + 1 < stops.length ? (
              <>
                לתחנה הבאה <Icon name="arrow-left" />
              </>
            ) : (
              <>
                עבור לקופות <Icon name="cart" />
              </>
            )}
          </button>
        </div>
      )}

      {detailProduct && (
        <ProductDetail
          product={detailProduct}
          onClose={() => setDetailProduct(null)}
          onAdd={(p) => {
            addItem(p);
            setDetailProduct(null);
          }}
          onSwap={(alt) => {
            removeItem(detailProduct.id);
            addItem(alt);
            setDetailProduct(null);
          }}
        />
      )}
    </div>
  );
}
