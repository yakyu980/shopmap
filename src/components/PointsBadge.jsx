import { useState } from 'react';
import { usePoints } from '../lib/usePoints';
import { getTier } from '../lib/points';

export default function PointsBadge() {
  const points = usePoints();
  const tier = getTier(points.total);
  const [open, setOpen] = useState(false);

  return (
    <div className="points-badge-wrap">
      <button className="points-badge" onClick={() => setOpen((v) => !v)}>
        {tier.icon} {points.total} נק׳
      </button>
      {open && (
        <div className="points-popover">
          <p className="points-tier">
            {tier.icon} דרגה: {tier.name}
          </p>
          <p className="points-disclaimer">ניקוד מקומי להנאה — עדיין בלי מימוש-הטבות אמיתי (דורש שרת).</p>
          {points.log.length > 0 && (
            <ul className="points-log">
              {[...points.log]
                .slice(-6)
                .reverse()
                .map((l, i) => (
                  <li key={i}>
                    +{l.amount} · {l.reason}
                  </li>
                ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
