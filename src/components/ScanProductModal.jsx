import { useEffect, useRef, useState } from 'react';
import { useCameraStream, CAMERA_STATUS } from '../lib/useCameraStream';
import { api } from '../lib/apiClient';
import Icon from './Icon';
import CloseButton from './CloseButton';

const SCAN_FORMATS = ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128'];
const SCAN_INTERVAL_MS = 400;

export default function ScanProductModal({ onAdd, onClose }) {
  const { videoRef, status } = useCameraStream();
  const [manualCode, setManualCode] = useState('');
  const [lookupStatus, setLookupStatus] = useState('idle'); // idle | loading | found | empty | error
  const [match, setMatch] = useState(null); // {barcode, name, minPrice}
  const [detectorSupported, setDetectorSupported] = useState(typeof window.BarcodeDetector !== 'undefined');
  const detectorRef = useRef(null);

  async function lookup(code) {
    setLookupStatus('loading');
    setMatch(null);
    try {
      const data = await api.get(`/price-import/${encodeURIComponent(code)}`);
      const rows = (data.rows || []).filter((row) => Number.isFinite(row.price));
      if (!rows.length) {
        setLookupStatus('empty');
        return;
      }
      const minPrice = Math.min(...rows.map((row) => row.price));
      setMatch({ barcode: code, name: rows[0].name, minPrice });
      setLookupStatus('found');
    } catch {
      setLookupStatus('error');
    }
  }

  useEffect(() => {
    if (status !== CAMERA_STATUS.READY || !detectorSupported || lookupStatus !== 'idle') return;
    if (!detectorRef.current) {
      try {
        detectorRef.current = new window.BarcodeDetector({ formats: SCAN_FORMATS });
      } catch {
        setDetectorSupported(false);
        return;
      }
    }
    const id = setInterval(async () => {
      if (!videoRef.current) return;
      try {
        const codes = await detectorRef.current.detect(videoRef.current);
        if (codes.length > 0) lookup(codes[0].rawValue);
      } catch {
        /* פריים לא-מוכן/לא-תקין — מדלגים לניסיון-הבא */
      }
    }, SCAN_INTERVAL_MS);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, detectorSupported, lookupStatus]);

  function reset() {
    setLookupStatus('idle');
    setMatch(null);
    setManualCode('');
  }

  function addMatch() {
    onAdd({ id: `official-${match.barcode}`, barcode: match.barcode, name: match.name, price: match.minPrice, official: true });
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal barcode-modal" onClick={(e) => e.stopPropagation()}>
        <CloseButton onClick={onClose} />
        <h2>
          <Icon name="camera" /> סריקת ברקוד להשוואה
        </h2>

        {status === CAMERA_STATUS.READY && detectorSupported && lookupStatus === 'idle' && (
          <div className="barcode-video-wrap">
            <video ref={videoRef} className="barcode-video" autoPlay playsInline muted />
            <p className="barcode-hint">כוונו את המצלמה לברקוד המוצר</p>
          </div>
        )}
        {status === CAMERA_STATUS.LOADING && (
          <p className="barcode-hint"><Icon name="camera" /> מבקש הרשאת מצלמה…</p>
        )}
        {status === CAMERA_STATUS.DENIED && (
          <p className="barcode-hint"><Icon name="warning" /> לא ניתנה הרשאת מצלמה — אפשר להקליד ברקוד ידנית למטה.</p>
        )}
        {status === CAMERA_STATUS.UNSUPPORTED && (
          <p className="barcode-hint">ℹ️ מצלמה לא זמינה כאן — אפשר להקליד ברקוד ידנית למטה.</p>
        )}
        {status === CAMERA_STATUS.READY && !detectorSupported && lookupStatus === 'idle' && (
          <p className="barcode-hint">ℹ️ הדפדפן הזה לא תומך בזיהוי-ברקוד אוטומטי — הקלידו ידנית.</p>
        )}

        <div className="barcode-manual-row">
          <input
            className="map-edit-input"
            type="text"
            inputMode="numeric"
            placeholder="או הקלידו ברקוד ידנית"
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && manualCode.trim() && lookup(manualCode.trim())}
          />
          <button
            className="btn btn--ghost btn--small"
            disabled={!manualCode.trim()}
            onClick={() => lookup(manualCode.trim())}
          >
            <Icon name="search" /> חפש
          </button>
        </div>

        {lookupStatus === 'loading' && (
          <p className="barcode-hint"><Icon name="search" /> בודק מחירים במאגר הרשמי…</p>
        )}

        {lookupStatus === 'found' && match && (
          <div className="barcode-result">
            <p className="barcode-found">
              <Icon name="check" /> {match.name} · החל מ־₪{match.minPrice.toFixed(2)}
            </p>
            <div className="barcode-result-actions">
              <button className="btn btn--primary btn--small" onClick={addMatch}>
                <Icon name="plus" /> הוסף להשוואה
              </button>
              <button className="btn btn--text btn--small" onClick={reset}>
                <Icon name="reset" /> סרוק שוב
              </button>
            </div>
          </div>
        )}

        {lookupStatus === 'empty' && (
          <div className="barcode-result">
            <p className="barcode-not-found"><Icon name="close" /> אין עדיין מחיר-רשמי שמור לברקוד הזה.</p>
            <button className="btn btn--text btn--small" onClick={reset}>נסה שוב</button>
          </div>
        )}

        {lookupStatus === 'error' && (
          <div className="barcode-result">
            <p className="barcode-not-found"><Icon name="warning" /> לא הצלחנו לבדוק את הברקוד הזה.</p>
            <button className="btn btn--text btn--small" onClick={reset}>נסה שוב</button>
          </div>
        )}
      </div>
    </div>
  );
}
