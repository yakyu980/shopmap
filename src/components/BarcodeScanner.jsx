import { useEffect, useRef, useState } from 'react';
import { getDepartment } from '../lib/storeConfig';
import { getProductByBarcode, locationLabel } from '../data/storeData';
import { useCameraStream, CAMERA_STATUS } from '../lib/useCameraStream';
import { lookupBarcodeExternal } from '../lib/openFoodFacts';
import ProductDetail from './ProductDetail';
import PriceTag from './PriceTag';
import Icon from './Icon';
import DeptIcon from './DeptIcon';
import CloseButton from './CloseButton';

const SCAN_FORMATS = ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128'];
const SCAN_INTERVAL_MS = 400;

export default function BarcodeScanner({ onAdd, onClose }) {
  const { videoRef, status, retry } = useCameraStream();
  const [manualCode, setManualCode] = useState('');
  const [result, setResult] = useState(null); // {found, product?, externalProduct?, code}
  const [detectorSupported, setDetectorSupported] = useState(typeof window.BarcodeDetector !== 'undefined');
  const [showDetail, setShowDetail] = useState(false);
  const [checkingExternal, setCheckingExternal] = useState(false);
  const detectorRef = useRef(null);

  async function lookup(code) {
    const product = getProductByBarcode(code);
    if (product) {
      setResult({ found: true, product, code });
      return;
    }
    // לא בקטלוג-שלנו — ננסה זיהוי אמיתי מול Open Food Facts (מסד-
    // ברקודים גלובלי, לא מומצא). אם זה נכשל (בלי-רשת/ברקוד-לא-קיים-
    // גם-שם) חוזרים לתשובת "לא נמצא" הרגילה. ⚠️ הזיהוי-הזה הוא רק
    // *שם-מוצר* אמיתי — אין לו מחיר/מיקום בסניף שלנו (זה לא בקטלוג).
    setCheckingExternal(true);
    setResult(null);
    let externalProduct = null;
    try {
      externalProduct = await lookupBarcodeExternal(code);
    } catch {
      /* אין רשת/השירות לא זמין — נופלים ל"לא נמצא" הרגיל */
    }
    setCheckingExternal(false);
    setResult({ found: false, externalProduct, code });
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
        <CloseButton onClick={onClose} />
        <h2>
          <Icon name="camera" /> סריקת ברקוד
        </h2>

        {status === CAMERA_STATUS.READY && detectorSupported && !result && (
          <div className="barcode-video-wrap">
            <video ref={videoRef} className="barcode-video" autoPlay playsInline muted />
            <p className="barcode-hint">כוונו את המצלמה לברקוד</p>
          </div>
        )}
        {status === CAMERA_STATUS.LOADING && (
          <p className="barcode-hint">
            <Icon name="camera" /> מבקש הרשאת מצלמה…
          </p>
        )}
        {status === CAMERA_STATUS.DENIED && (
          <p className="barcode-hint">
            <Icon name="warning" /> לא ניתנה הרשאת מצלמה — אפשר להקליד ברקוד ידנית למטה.
            <button type="button" className="camera-retry-btn" onClick={retry}>
              נסה שוב
            </button>
          </p>
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
            <Icon name="search" /> חפש
          </button>
        </div>

        {checkingExternal && (
          <p className="barcode-hint">
            <Icon name="search" /> לא בקטלוג שלנו — בודק זיהוי-אמיתי מול Open Food Facts…
          </p>
        )}

        {result && (
          <div className="barcode-result">
            {result.found ? (
              <>
                <p className="barcode-found">
                  <Icon name="check" /> <DeptIcon dept={getDepartment(result.product.department)} />{' '}
                  {result.product.name} ·{' '}
                  <PriceTag product={result.product} size="small" /> ·{' '}
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
                    <Icon name="plus" /> הוסף לרשימה
                  </button>
                  <button className="btn btn--ghost btn--small" onClick={() => setShowDetail(true)}>
                    <Icon name="search" /> פרטים נוספים
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
                {result.externalProduct ? (
                  <p className="barcode-not-found">
                    <Icon name="check" /> זוהה כ-"{result.externalProduct.name}"
                    {result.externalProduct.brand ? ` (${result.externalProduct.brand})` : ''} — ברקוד אמיתי
                    (Open Food Facts), אבל <strong>לא בקטלוג של הסניף הזה</strong> (אין לו מחיר/מיקום-מדף
                    אצלנו).
                  </p>
                ) : (
                  <p className="barcode-not-found">
                    <Icon name="close" /> לא נמצא מוצר עם ברקוד "{result.code}" (גם לא בזיהוי-חיצוני)
                  </p>
                )}
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
