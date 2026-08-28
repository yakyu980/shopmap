import { useEffect, useRef, useState } from 'react';
import { useCameraStream, CAMERA_STATUS } from '../lib/useCameraStream';
import { findCheckpointByCode, getStoreConfig } from '../lib/storeConfig';
import Icon from './Icon';
import CloseButton from './CloseButton';

const SCAN_INTERVAL_MS = 400;

// שימוש-חוזר מלא בתבנית של BarcodeScanner.jsx — אותו useCameraStream +
// window.BarcodeDetector, רק עם formats:['qr_code'] במקום ברקוד-מוצר.
// סריקה מוצלחת של קוד שמזוהה כ-צ'ק-פוינט קיים מעדכנת מיקום אמיתי
// (לא GPS/הדמיה) — ר' CLAUDE.md §16 "מפה רב-קומתית + צ'ק-פוינטים".
export default function CheckpointScanner({ onScan, onClose }) {
  const { videoRef, status, retry } = useCameraStream();
  const [manualCode, setManualCode] = useState('');
  const [result, setResult] = useState(null); // {found, checkpoint?, code}
  const [detectorSupported, setDetectorSupported] = useState(typeof window.BarcodeDetector !== 'undefined');
  const detectorRef = useRef(null);

  function lookup(code) {
    const checkpoint = findCheckpointByCode(getStoreConfig(), code.trim().toUpperCase());
    setResult({ found: !!checkpoint, checkpoint, code });
  }

  useEffect(() => {
    if (status !== CAMERA_STATUS.READY || !detectorSupported || result) return;
    if (!detectorRef.current) {
      try {
        detectorRef.current = new window.BarcodeDetector({ formats: ['qr_code'] });
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

  function useResult() {
    onScan(result.checkpoint);
    onClose();
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal barcode-modal" onClick={(e) => e.stopPropagation()}>
        <CloseButton onClick={onClose} />
        <h2>
          <Icon name="camera" /> סריקת צ'ק-פוינט
        </h2>
        <p className="mock-disclaimer">
          עדכון-מיקום אמיתי: סריקת QR של תווית-צ'ק-פוינט אמיתית שהוצבה בחנות (ר' "ערוך מפה" ליצירתן).
        </p>

        {status === CAMERA_STATUS.READY && detectorSupported && !result && (
          <div className="barcode-video-wrap">
            <video ref={videoRef} className="barcode-video" autoPlay playsInline muted />
            <p className="barcode-hint">כוונו את המצלמה לתווית ה-QR של הצ'ק-פוינט</p>
          </div>
        )}
        {status === CAMERA_STATUS.LOADING && (
          <p className="barcode-hint">
            <Icon name="camera" /> מבקש הרשאת מצלמה…
          </p>
        )}
        {status === CAMERA_STATUS.DENIED && (
          <p className="barcode-hint">
            <Icon name="warning" /> לא ניתנה הרשאת מצלמה — אפשר להקליד קוד ידנית למטה.
            <button type="button" className="camera-retry-btn" onClick={retry}>
              נסה שוב
            </button>
          </p>
        )}
        {status === CAMERA_STATUS.UNSUPPORTED && (
          <p className="barcode-hint">מצלמה לא זמינה כאן — אפשר להקליד קוד ידנית למטה.</p>
        )}
        {status === CAMERA_STATUS.READY && !detectorSupported && !result && (
          <p className="barcode-hint">הדפדפן הזה לא תומך בזיהוי-QR אוטומטי — הקלידו את הקוד ידנית.</p>
        )}

        <div className="barcode-manual-row">
          <input
            className="map-edit-input"
            type="text"
            placeholder="או הקלידו קוד-צ'ק-פוינט ידנית"
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

        {result && (
          <div className="barcode-result">
            {result.found ? (
              <>
                <p className="barcode-found">
                  <Icon name="check" /> צ'ק-פוינט אומת — קומה {result.checkpoint.floor}
                </p>
                <div className="barcode-result-actions">
                  <button className="btn btn--primary btn--small" onClick={useResult}>
                    <Icon name="pin" /> זה המיקום שלי
                  </button>
                  <button
                    className="btn btn--text btn--small"
                    onClick={() => {
                      setResult(null);
                      setManualCode('');
                    }}
                  >
                    <Icon name="reset" /> סרוק שוב
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="barcode-not-found">
                  <Icon name="close" /> קוד "{result.code}" אינו צ'ק-פוינט מוכר במפה הזו
                </p>
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
    </div>
  );
}
