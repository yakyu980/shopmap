import { useEffect, useRef, useState } from 'react';
import { useVenues } from '../lib/useVenues';
import { findNearbySupermarkets, STORE_TYPE_LABELS } from '../lib/venues';
import { useGeolocationWatch } from '../lib/useGeolocationWatch';
import Icon from './Icon';
import CloseButton from './CloseButton';

export default function TripVenuePicker({ onClose, onPick }) {
  const { venues, createVenue } = useVenues();
  const [chainName, setChainName] = useState('');
  const [branchName, setBranchName] = useState('');
  const [storeType, setStoreType] = useState('supermarket');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [nearby, setNearby] = useState([]);
  const [locating, setLocating] = useState(false);
  const handledPositionRef = useRef(null);
  const gps = useGeolocationWatch();

  useEffect(() => {
    if (!locating || !gps.position) return;
    const positionKey = `${gps.position.lat},${gps.position.lng}`;
    if (handledPositionRef.current === positionKey) return;
    handledPositionRef.current = positionKey;

    findNearbySupermarkets(gps.position)
      .then((results) => {
        setNearby(results);
        if (results.length === 0) setError('לא נמצאו סופרים בטווח של 5 ק״מ');
      })
      .catch((err) => setError(err.message || 'לא הצלחנו למצוא סופרים לידך'))
      .finally(() => {
        setLocating(false);
        gps.stop();
      });
  }, [gps, locating]);

  useEffect(() => {
    if (!locating || !gps.error) return;
    setLocating(false);
    setError('לא הצלחנו לקבל מיקום. בדקו שהרשאת ה־GPS פעילה.');
    gps.stop();
  }, [gps, locating]);

  function handleFindNearby() {
    setError('');
    setNearby([]);
    handledPositionRef.current = null;
    if (!gps.supported) {
      setError('המכשיר או הדפדפן אינם תומכים ב־GPS');
      return;
    }
    setLocating(true);
    gps.start();
  }

  async function handleNearbyPick(store) {
    setCreating(true);
    setError('');
    try {
      const venue = await createVenue({
        chainName: store.name,
        branchName: store.branchName,
        storeType: 'supermarket',
        address: store.address,
      });
      onPick(venue.id);
    } catch {
      setError('מצאנו את הסופר, אבל לא הצלחנו לשמור אותו');
    } finally {
      setCreating(false);
    }
  }

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

        <button className="btn btn--primary" onClick={handleFindNearby} disabled={locating || creating}>
          <Icon name="location" /> {locating ? 'מאתר GPS וסופרים…' : 'מצא סופרים לידי'}
        </button>

        {nearby.length > 0 && (
          <div>
            <p className="settings-hint">סופרים שנמצאו לפי ה־GPS שלך:</p>
            <ul className="venue-list">
              {nearby.map((store) => (
                <li key={store.id}>
                  <button className="venue-row-btn" onClick={() => handleNearbyPick(store)} disabled={creating}>
                    <span className="venue-row-name">{store.name}</span>
                    <span className="venue-row-type">
                      {store.address || store.branchName}
                      {store.distance != null ? ` · ${store.distance < 1000 ? `${store.distance} מ׳` : `${(store.distance / 1000).toFixed(1)} ק״מ`}` : ''}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

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
          {error && <p className="settings-error" role="alert">{error}</p>}
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
