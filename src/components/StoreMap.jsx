import { DEPARTMENTS, GRID_COLS, GRID_ROWS } from '../data/storeData';

export default function StoreMap({ activeDeptId }) {
  return (
    <div className="store-map">
      <div
        className="store-map-grid"
        style={{
          gridTemplateColumns: `repeat(${GRID_COLS}, 1fr)`,
          gridTemplateRows: `repeat(${GRID_ROWS}, 1fr)`,
        }}
      >
        {DEPARTMENTS.map((d) => (
          <div
            key={d.id}
            className={
              'store-map-cell' +
              (d.fixed ? ' store-map-cell--fixed' : '') +
              (d.id === activeDeptId ? ' store-map-cell--active' : '')
            }
            style={{ gridColumn: d.x + 1, gridRow: d.y + 1 }}
          >
            <span className="store-map-icon">{d.icon}</span>
            <span className="store-map-name">{d.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
