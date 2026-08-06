import { useState } from 'react';
import { locationLabel } from '../data/storeData';
import { getDepartment } from '../lib/storeConfig';
import { computeDirection } from '../lib/direction';
import { useCameraStream, CAMERA_STATUS as STATUS } from '../lib/useCameraStream';
import LocationCheckin from './LocationCheckin';

export default function CameraNav({
  fromDept,
  stop,
  items,
  togglePicked,
  onNext,
  isLast,
  onExit,
  currentLocationId,
  onCheckin,
  stepCounter,
}) {
  const { videoRef, status } = useCameraStream();
  const [showPicker, setShowPicker] = useState(false);

  const dir = computeDirection(fromDept, stop.department);
  const allPicked = stop.items.every((i) => items.find((x) => x.id === i.id)?.picked);

  return (
    <div className="ar-overlay">
      {status === STATUS.READY && (
        <video ref={videoRef} className="ar-video" autoPlay playsInline muted />
      )}

      {status !== STATUS.READY && (
        <div className="ar-fallback">
          {status === STATUS.LOADING && <p>📷 מבקש הרשאת מצלמה…</p>}
          {status === STATUS.DENIED && (
            <p>
              🚫 לא ניתנה הרשאת מצלמה. אפשר לאשר גישה למצלמה בהגדרות הדפדפן ולנסות שוב — או
              להמשיך עם הניווט הרגיל.
            </p>
          )}
          {status === STATUS.UNSUPPORTED && (
            <p>
              ℹ️ מצב AR דורש דפדפן עם תמיכה במצלמה בחיבור מאובטח (HTTPS/localhost). ממשיכים בלי
              וידאו-רקע — החצים עדיין עובדים.
            </p>
          )}
        </div>
      )}

      <div className="ar-topbar">
        <button className="btn btn--ghost ar-exit" onClick={onExit}>
          ✕ יציאה מ-AR
        </button>
        <span className="ar-dept-chip">
          {stop.department.icon} {stop.department.name}
        </span>
        <button className="btn btn--ghost btn--small ar-location-btn" onClick={() => setShowPicker((v) => !v)}>
          📍{currentLocationId ? ` ${getDepartment(currentLocationId).icon}` : ''}
        </button>
      </div>

      {showPicker && (
        <div className="ar-location-picker">
          <LocationCheckin
            variant="inline"
            onSelect={(id) => {
              onCheckin(id);
              setShowPicker(false);
            }}
          />
        </div>
      )}

      <div className="ar-arrow-wrap">
        <div className="ar-arrow" style={{ transform: `rotate(${dir.rotation}deg)` }}>
          {dir.arrow}
        </div>
        <div className="ar-arrow-label">{dir.label}</div>
        {stepCounter?.active && (
          <div className="ar-step-info">🚶 כ-{stepCounter.distanceMeters} מ׳ מאז העדכון</div>
        )}
      </div>

      <div className="ar-bottom-card">
        <ul className="ar-item-list">
          {stop.items.map((item) => {
            const live = items.find((x) => x.id === item.id);
            return (
              <li className={'ar-item' + (live?.picked ? ' ar-item--picked' : '')} key={item.id}>
                <label className="nav-item-check">
                  <input
                    type="checkbox"
                    checked={!!live?.picked}
                    onChange={() => togglePicked(item.id)}
                  />
                  <span>
                    <span className="nav-item-name">{item.name}</span>
                    <span className="nav-item-loc">{locationLabel(item)}</span>
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
        <button className="btn btn--primary nav-next" onClick={onNext}>
          {allPicked ? '✓ ' : ''}
          {isLast ? 'עבור לקופות 🛒' : 'לתחנה הבאה ⬅'}
        </button>
      </div>
    </div>
  );
}
