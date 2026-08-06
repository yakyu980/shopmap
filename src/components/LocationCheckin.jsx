import { useStoreConfig } from '../lib/useStoreConfig';

function Chips({ onSelect }) {
  const config = useStoreConfig();
  const checkinDepts = config.departments.filter((d) => !d.fixed);
  return (
    <div className="location-chips">
      {checkinDepts.map((d) => (
        <button key={d.id} className="location-chip" onClick={() => onSelect(d.id)}>
          {d.icon} {d.name}
        </button>
      ))}
    </div>
  );
}

/** inline: בורר-צ'יפים קומפקטי מוטבע. prompt: מודל תקופתי-יזום עם אפשרות דילוג. */
export default function LocationCheckin({ variant = 'inline', onSelect, onSkip }) {
  if (variant === 'prompt') {
    return (
      <div className="checkin-prompt-backdrop" onClick={onSkip}>
        <div className="checkin-prompt" onClick={(e) => e.stopPropagation()}>
          <h3>📍 איפה אתה נמצא עכשיו?</h3>
          <p>עדכון קצר עוזר לנו לוודא שהמסלול שלך עדיין הכי יעיל.</p>
          <Chips onSelect={onSelect} />
          <button className="btn btn--text" onClick={onSkip}>
            לא כרגע
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="location-chips-inline">
      <Chips onSelect={onSelect} />
    </div>
  );
}
