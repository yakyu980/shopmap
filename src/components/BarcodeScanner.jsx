import { useEffect, useRef, useState } from 'react';
import { getDepartment } from '../lib/storeConfig';
import { getProductByBarcode, locationLabel } from '../data/storeData';
import { useCameraStream, CAMERA_STATUS } from '../lib/useCameraStream';
import ProductDetail from './ProductDetail';

const SCAN_FORMATS = ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128'];
const SCAN_INTERVAL_MS = 400;

export default function BarcodeScanner({ onAdd, onClose }) {
  const { videoRef, status } = useCameraStream();
  const [manualCode, setManualCode] = useState('');
  const [result, setResult] = useState(null); // {found, product?, code}
  const [detectorSupported, setDetectorSupported] = useState(typeof window.BarcodeDetector !== 'undefined');
  const [showDetail, setShowDetail] = useState(false);
  const detectorRef = useRef(null);

  function lookup(code) {
    const product = getProductByBarcode(code);
    setResult({ found: !!product, product, code });
  }

  useEffect(() => {
    if (status !== CAMERA_STATUS.READY || !detectorSupported || result) return;
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
  }, [status, detectorSupported, result]);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal barcode-modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="סגור">
          ✕
        </button>
        <h2>📷 סריקת ברקוד</h2>

        {status === CAMERA_STATUS.READY && detectorSupported && !result && (
          <div className="barcode-video-wrap">
            <video ref={videoRef} className="barcode-video" autoPlay playsInline muted />
            <p className="barcode-hint">כוונו את המצלמה לברקוד</p>
          </div>
        )}
        {status === CAMERA_STATUS.LOADING && <p className="barcode-hint">📷 מבקש הרשאת מצלמה…</p>}
        {status === CAMERA_STATUS.DENIED && (
          <p className="barcode-hint">🚫 לא ניתנה הרשאת מצלמה — אפשר להקליד ברקוד ידנית למטה.</p>
        )}
        {status === CAMERA_STATUS.UNSUPPORTED && (
          <p className="barcode-hint">ℹ️ מצלמה לא זמינה כאן — אפשר להקליד ברקוד ידנית למטה.</p>
        )}
        {status === CAMERA_STATUS.READY && !detectorSupported && !result && (
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
            🔍 חפש
          </button>
        </div>

        {result && (
          <div className="barcode-result">
            {result.found ? (
              <>
                <p className="barcode-found">
                  ✅ {getDepartment(result.product.department).icon} {result.product.name} · ₪
                  {result.product.price.toFixed(2)} ·{' '}
                  {getDepartment(result.product.department).name},{' '}
                  {locationLabel(result.product)}
                </p>
                <div className="barcode-result-actions">
                  <button
                    className="btn btn--primary btn--small"
                    onClick={() => {
                      onAdd(result.product);
                      onClose();
                    }}
                  >
                    ➕ הוסף לרשימה
                  </button>
                  <button className="btn btn--ghost btn--small" onClick={() => setShowDetail(true)}>
                    🔎 פרטים נוספים
                  </button>
                  <button
                    className="btn btn--text btn--small"
                    onClick={() => {
                      setResult(null);
                      setManualCode('');
                    }}
                  >
                    🔁 סרוק שוב
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="barcode-not-found">❌ לא נמצא מוצר עם ברקוד "{result.code}"</p>
                <button
                  className="btn btn--text btn--small"
                  onClick={() => {
                    setResult(null);
                    setManualCode('');
                  }}
                >
                  נסה שוב
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {showDetail && result?.product && (
        <ProductDetail
          product={result.product}
          onClose={() => setShowDetail(false)}
          onAdd={(p) => {
            onAdd(p);
            onClose();
          }}
        />
      )}
    </div>
  );
}
