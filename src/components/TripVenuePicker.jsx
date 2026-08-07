import { useState } from 'react';
import { useVenues } from '../lib/useVenues';
import { STORE_TYPE_LABELS } from '../lib/venues';
import Icon from './Icon';
import CloseButton from './CloseButton';

export default function TripVenuePicker({ onClose, onPick }) {
  const { venues, createVenue } = useVenues();
  const [chainName, setChainName] = useState('');
  const [branchName, setBranchName] = useState('');
  const [storeType, setStoreType] = useState('supermarket');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  async function handleCreateAndStart() {
    if (!chainName.trim() || !branchName.trim()) {
      setError('צריך שם-רשת וסניף');
      return;
    }
    setCreating(true);
    setError('');
    try {
      const venue = await createVenue({ chainName, branchName, storeType });
      onPick(venue.id);
    } catch {
      setError('לא הצלחתי לשמור — נסו שוב');
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal venue-picker-modal" onClick={(e) => e.stopPropagation()}>
        <CloseButton onClick={onClose} />
        <h2>איפה קונים?</h2>
        <p className="settings-hint">בחרו חנות-שמורה, או הוסיפו חדשה — כדי לתייג את הטיול לפי סוג-חנות</p>

        {venues.length > 0 && (
          <ul className="venue-list">
            {venues.map((v) => (
              <li key={v.id}>
                <button className="venue-row-btn" onClick={() => onPick(v.id)}>
                  <span className="venue-row-name">
                    {v.chainName} · {v.branchName}
                  </span>
                  <span className="venue-row-type">{STORE_TYPE_LABELS[v.storeType]}</span>
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="venue-new-form">
          <p className="settings-hint">חנות חדשה:</p>
          <input
            className="map-edit-input"
            placeholder="שם רשת (למשל שופרסל)"
            value={chainName}
            onChange={(e) => setChainName(e.target.value)}
          />
          <input
            className="map-edit-input"
            placeholder="שם סניף (למשל רמת-גן)"
            value={branchName}
            onChange={(e) => setBranchName(e.target.value)}
          />
          <select className="map-edit-input" value={storeType} onChange={(e) => setStoreType(e.target.value)}>
            {Object.entries(STORE_TYPE_LABELS).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
          {error && <p className="settings-error">{error}</p>}
          <button className="btn btn--primary" onClick={handleCreateAndStart} disabled={creating}>
            <Icon name="plus" /> {creating ? 'שומר…' : 'צור והתחל טיול'}
          </button>
        </div>

        <button className="btn btn--ghost" onClick={() => onPick(null)}>
          התחל בלי לציין חנות
        </button>
      </div>
    </div>
  );
}
