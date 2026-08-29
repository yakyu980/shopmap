import { useState } from 'react';
import { locationLabel } from '../data/storeData';
import { getDepartment } from '../lib/storeConfig';
import { computeDirection } from '../lib/direction';
import { useCameraStream, CAMERA_STATUS as STATUS } from '../lib/useCameraStream';
import { useFamilyMembers } from '../lib/useFamilyMembers';
import LocationCheckin from './LocationCheckin';
import Icon from './Icon';
import DeptIcon from './DeptIcon';

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
  onScanCheckpoint,
}) {
  const { videoRef, status, retry } = useCameraStream();
  const [showPicker, setShowPicker] = useState(false);
  const family = useFamilyMembers();

  const dir = computeDirection(fromDept, stop.department);
  const allPicked = stop.items.every((i) => items.find((x) => x.id === i.id)?.picked);
  const saleItemsAtStop = stop.items.filter((i) => i.salePercent);

  return (
    <div className="ar-overlay">
      {status === STATUS.READY && (
        <video ref={videoRef} className="ar-video" autoPlay playsInline muted />
      )}

      {status !== STATUS.READY && (
        <div className="ar-fallback">
          {status === STATUS.LOADING && (
            <p>
              <Icon name="camera" /> מבקש הרשאת מצלמה…
            </p>
          )}
          {status === STATUS.DENIED && (
            <>
              <p>
                <Icon name="warning" /> לא ניתנה הרשאת מצלמה. אפשר לאשר גישה למצלמה בהגדרות הדפדפן
                ולנסות שוב — או להמשיך עם הניווט הרגיל.
              </p>
              <button type="button" className="camera-retry-btn" onClick={retry}>
                נסה שוב
              </button>
            </>
          )}
          {status === STATUS.UNSUPPORTED && (
            <p>
              מצב AR דורש דפדפן עם תמיכה במצלמה בחיבור מאובטח (HTTPS/localhost). ממשיכים בלי
              וידאו-רקע — החצים עדיין עובדים.
            </p>
          )}
        </div>
      )}

      <div className="ar-topbar">
        <button className="btn btn--ghost ar-exit" onClick={onExit}>
          <Icon name="close" /> יציאה מ-AR
        </button>
        <span className="ar-dept-chip">
          <DeptIcon dept={stop.department} /> {stop.department.name}
        </span>
        <button className="btn btn--ghost btn--small ar-location-btn" onClick={() => setShowPicker((v) => !v)}>
          <Icon name="pin" />
          {currentLocationId ? <DeptIcon dept={getDepartment(currentLocationId)} /> : ''}
        </button>
        {onScanCheckpoint && (
          <button className="btn btn--ghost btn--small ar-location-btn" onClick={onScanCheckpoint}>
            <Icon name="camera" />
          </button>
        )}
      </div>

      {showPicker && (
        <div className="ar-location-picker">
          <LocationCheckin
            onSelect={(id) => {
              onCheckin(id);
              setShowPicker(false);
            }}
          />
        </div>
      )}

      <div className="ar-arrow-wrap">
        <div className="ar-arrow">
          {dir.arrived ? (
            <Icon name="pin" />
          ) : (
            <Icon name="arrow-left" style={{ transform: `rotate(${dir.rotation}deg)` }} />
          )}
        </div>
        <div className="ar-arrow-label">{dir.label}</div>
        {stepCounter?.active && (
          <div className="ar-step-info">
            <Icon name="footsteps" solid /> כ-{stepCounter.distanceMeters} מ׳ מאז העדכון
          </div>
        )}
        {saleItemsAtStop.length > 0 && (
          <div className="ar-sale-info">
            <Icon name="tag" /> מבצע: {saleItemsAtStop.map((i) => i.name).join(', ')}
          </div>
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
              </li>
            );
          })}
        </ul>
        <button className="btn btn--primary nav-next" onClick={onNext}>
          {allPicked && <Icon name="check" />}
          {isLast ? (
            <>
              עבור לקופות <Icon name="cart" />
            </>
          ) : (
            <>
              לתחנה הבאה <Icon name="arrow-left" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
