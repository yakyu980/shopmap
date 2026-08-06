import { useEffect, useState } from 'react';
import { computeRoute, dist, reorderRemainingStops, GRID_UNIT_METERS } from '../lib/route';
import { locationLabel } from '../data/storeData';
import { getDepartment } from '../lib/storeConfig';
import { markFound, markNotFound } from '../lib/verification';
import { useStepCounter } from '../lib/useStepCounter';
import { useFamilyMembers } from '../lib/useFamilyMembers';
import { addPoints } from '../lib/points';
import { recordPurchase } from '../lib/purchaseHistory';
import StoreMap from './StoreMap';
import CameraNav from './CameraNav';
import LocationCheckin from './LocationCheckin';
import ProductDetail from './ProductDetail';

const CHECKIN_INTERVAL_MS = 90_000;

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
  const [showCheckinPrompt, setShowCheckinPrompt] = useState(false);
  const [showInlinePicker, setShowInlinePicker] = useState(false);
  const [rerouteHint, setRerouteHint] = useState('');
  const [detailProduct, setDetailProduct] = useState(null);
  const stepCounter = useStepCounter();
  const family = useFamilyMembers();

  const finished = stopIndex >= stops.length;

  useEffect(() => {
    if (finished) return;
    const id = setInterval(() => setShowCheckinPrompt(true), CHECKIN_INTERVAL_MS);
    return () => clearInterval(id);
  }, [finished]);

  if (items.length === 0) {
    return (
      <div className="nav-page">
        <p className="empty-hint">אין מוצרים ברשימת הקניות. חזרו והוסיפו מוצרים כדי לחשב מסלול.</p>
        <button className="btn btn--primary" onClick={onBack}>
          ⬅ חזרה לרשימה
        </button>
      </div>
    );
  }

  const stop = !finished ? stops[stopIndex] : null;
  const allPickedAtStop = stop ? stop.items.every((i) => items.find((x) => x.id === i.id)?.picked) : false;
  const saleItemsAtStop = stop ? stop.items.filter((i) => i.salePercent) : [];
  const fromDept =
    (currentLocationId && getDepartment(currentLocationId)) ||
    (stopIndex === 0 ? entrance : stops[stopIndex - 1].department);

  const expectedMeters = stop ? dist(fromDept, stop.department) * GRID_UNIT_METERS : 0;
  const showStepHint =
    stepCounter.active && expectedMeters > 0 && stepCounter.distanceMeters > expectedMeters * 1.5;

  function reportFound(productId) {
    markFound(productId);
    addPoints(1, 'אימות מוצר');
  }
  function reportNotFound(item) {
    markNotFound(item.id);
    addPoints(1, 'אימות מוצר');
    setDetailProduct(item);
  }
  function goNext() {
    setStopIndex((i) => i + 1);
    if (stopIndex + 1 >= stops.length) setArMode(false);
  }

  function handleFinish() {
    recordPurchase(items.map((i) => i.id));
    addPoints(10, 'השלמת קנייה');
    clear();
    onBack();
  }

  function handleCheckin(deptId) {
    setCurrentLocationId(deptId);
    setLastCheckinAt(Date.now());
    stepCounter.reset();
    setShowCheckinPrompt(false);
    setShowInlinePicker(false);
    addPoints(1, 'עדכון מיקום');

    if (!finished && deptId !== stop.department.id) {
      const fromPoint = getDepartment(deptId);
      setStops((prev) => reorderRemainingStops(prev, stopIndex, fromPoint));
      setRerouteHint('📍 המסלול עודכן לפי המיקום שדיווחת');
      setTimeout(() => setRerouteHint(''), 4000);
    }
  }

  const locationCard = (
    <div className="location-card">
      <div className="location-card-row">
        <span className="location-card-info">
          {currentLocationId ? (
            <>
              📍 {getDepartment(currentLocationId).icon} {getDepartment(currentLocationId).name}
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
          📍 עדכן מיקום
        </button>
      </div>

      {showInlinePicker && <LocationCheckin variant="inline" onSelect={handleCheckin} />}

      <div className="location-card-row location-card-steps">
        {!stepCounter.active ? (
          <button
            className="btn btn--text btn--small"
            onClick={stepCounter.start}
            disabled={!stepCounter.supported}
          >
            🚶 הפעל מד-צעדים (ניסיוני)
          </button>
        ) : (
          <span className="step-info">🚶 הלכת כ-{stepCounter.distanceMeters} מ׳ מאז העדכון האחרון</span>
        )}
        {!stepCounter.supported && <span className="step-unsupported">לא נתמך במכשיר זה</span>}
      </div>
      {showStepHint && (
        <p className="step-hint">יכול להיות שהגעת — כדאי לעדכן מיקום? 📍</p>
      )}
      {rerouteHint && <p className="reroute-hint">{rerouteHint}</p>}
    </div>
  );

  if (arMode && stop) {
    return (
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
      />
    );
  }

  return (
    <div className="nav-page">
      <div className="nav-summary">
        <div>
          <strong>{stops.length}</strong> תחנות · ⏱ כ-{routeInit.estimatedMinutes} דק׳ משוער
        </div>
        <button className="btn btn--text" onClick={onBack}>
          ⬅ חזרה לרשימה
        </button>
      </div>

      {locationCard}

      <StoreMap activeDeptId={stop?.department.id} />

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
            <span className="route-step-badge">{idx < stopIndex ? '✓' : idx + 1}</span>
            <span>
              {s.department.icon} {s.department.name}
            </span>
          </li>
        ))}
      </ol>

      {saleItemsAtStop.length > 0 && (
        <div className="sale-banner">
          <p className="sale-banner-title">🏷️ מבצע בתחנה זו!</p>
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
          <h2>🎉 הגעת לקופות!</h2>
          <p>כל המחלקות הוקפו במסלול היעיל ביותר.</p>
          <button className="btn btn--primary" onClick={handleFinish}>
            סיום קנייה
          </button>
        </div>
      ) : (
        <div className="nav-stop-card">
          <div className="nav-stop-head">
            <h2>
              {stop.department.icon} {stop.department.name}
            </h2>
            <button className="btn btn--ghost btn--small" onClick={() => setArMode(true)}>
              📷 ניווט AR
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
                    ❌ לא נמצא
                  </button>
                </li>
              );
            })}
          </ul>

          <button className="btn btn--primary nav-next" onClick={goNext}>
            {allPickedAtStop ? '✓ ' : ''}
            {stopIndex + 1 < stops.length ? 'לתחנה הבאה ⬅' : 'עבור לקופות 🛒'}
          </button>
        </div>
      )}

      {showCheckinPrompt && (
        <LocationCheckin
          variant="prompt"
          onSelect={handleCheckin}
          onSkip={() => setShowCheckinPrompt(false)}
        />
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
