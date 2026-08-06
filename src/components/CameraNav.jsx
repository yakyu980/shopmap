import { useEffect, useRef, useState } from 'react';
import { locationLabel } from '../data/storeData';
import { computeDirection } from '../lib/direction';

const STATUS = {
  LOADING: 'loading',
  READY: 'ready',
  DENIED: 'denied',
  UNSUPPORTED: 'unsupported',
};

export default function CameraNav({ fromDept, stop, items, togglePicked, onNext, isLast, onExit }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [status, setStatus] = useState(STATUS.LOADING);

  useEffect(() => {
    let cancelled = false;

    if (!window.isSecureContext) {
      setStatus(STATUS.UNSUPPORTED);
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus(STATUS.UNSUPPORTED);
      return;
    }

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'environment' }, audio: false })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
        setStatus(STATUS.READY);
      })
      .catch(() => {
        if (!cancelled) setStatus(STATUS.DENIED);
      });

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

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
      </div>

      <div className="ar-arrow-wrap">
        <div className="ar-arrow" style={{ transform: `rotate(${dir.rotation}deg)` }}>
          {dir.arrow}
        </div>
        <div className="ar-arrow-label">{dir.label}</div>
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
