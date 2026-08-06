import { useMemo, useState } from 'react';
import { computeRoute } from '../lib/route';
import { locationLabel } from '../data/storeData';
import { markFound, markNotFound } from '../lib/verification';
import StoreMap from './StoreMap';

export default function Navigation({ list, onBack }) {
  const { items, togglePicked } = list;
  const route = useMemo(() => computeRoute(items), [items]);
  const [stopIndex, setStopIndex] = useState(0);

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

  const finished = stopIndex >= route.stops.length;
  const stop = !finished ? route.stops[stopIndex] : null;
  const allPickedAtStop = stop ? stop.items.every((i) => items.find((x) => x.id === i.id)?.picked) : false;

  function reportFound(productId) {
    markFound(productId);
  }
  function reportNotFound(productId) {
    markNotFound(productId);
  }

  return (
    <div className="nav-page">
      <div className="nav-summary">
        <div>
          <strong>{route.stops.length}</strong> תחנות · ⏱ כ-{route.estimatedMinutes} דק׳ משוער
        </div>
        <button className="btn btn--text" onClick={onBack}>
          ⬅ חזרה לרשימה
        </button>
      </div>

      <StoreMap activeDeptId={stop?.department.id} />

      <ol className="route-steps">
        {route.stops.map((s, idx) => (
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

      {finished ? (
        <div className="nav-finished">
          <h2>🎉 הגעת לקופות!</h2>
          <p>כל המחלקות הוקפו במסלול היעיל ביותר.</p>
          <button className="btn btn--primary" onClick={onBack}>
            סיום קנייה
          </button>
        </div>
      ) : (
        <div className="nav-stop-card">
          <h2>
            {stop.department.icon} {stop.department.name}
          </h2>
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
                      <span className="nav-item-name">{item.name}</span>
                      <span className="nav-item-loc">{locationLabel(item)}</span>
                    </span>
                  </label>
                  <button
                    className="btn btn--text btn--small"
                    onClick={() => reportNotFound(item.id)}
                    title="דווח שהמוצר לא נמצא במיקום"
                  >
                    ❌ לא נמצא
                  </button>
                </li>
              );
            })}
          </ul>

          <button
            className="btn btn--primary nav-next"
            onClick={() => setStopIndex((i) => i + 1)}
          >
            {allPickedAtStop ? '✓ ' : ''}
            {stopIndex + 1 < route.stops.length ? 'לתחנה הבאה ⬅' : 'עבור לקופות 🛒'}
          </button>
        </div>
      )}
    </div>
  );
}
