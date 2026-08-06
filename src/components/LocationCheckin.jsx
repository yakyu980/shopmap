import { useStoreConfig } from '../lib/useStoreConfig';

/** בורר-צ'יפים קומפקטי מוטבע לעדכון-מיקום ידני. */
export default function LocationCheckin({ onSelect }) {
  const config = useStoreConfig();
  const checkinDepts = config.departments.filter((d) => !d.fixed);
  return (
    <div className="location-chips-inline">
      <div className="location-chips">
        {checkinDepts.map((d) => (
          <button key={d.id} className="location-chip" onClick={() => onSelect(d.id)}>
            {d.icon} {d.name}
          </button>
        ))}
      </div>
    </div>
  );
}
