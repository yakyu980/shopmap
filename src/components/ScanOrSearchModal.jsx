import { useEffect, useRef, useState } from 'react';
import { getDepartment } from '../lib/storeConfig';
import { getProductByBarcode, locationLabel, PRODUCTS } from '../data/storeData';
import { useCameraStream, CAMERA_STATUS } from '../lib/useCameraStream';
import { lookupBarcodeExternal } from '../lib/openFoodFacts';
import { pickCandidates } from '../lib/imageRecognitionMock';
import { classifyImage } from '../lib/imageClassify';
import { matchPredictionsToCatalog } from '../lib/imageClassifyMatch';
import { useAuth } from '../lib/useAuth';
import { api } from '../lib/apiClient';
import ProductDetail from './ProductDetail';
import PriceTag from './PriceTag';
import Icon from './Icon';
import DeptIcon from './DeptIcon';
import CloseButton from './CloseButton';

const SCAN_FORMATS = ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128'];
const SCAN_INTERVAL_MS = 400;
const IMAGE_FALLBACK_MS = 2500; // כמה זמן לתת לזיהוי-ברקוד לפני שנופלים לזיהוי-לפי-תמונה
const SAMPLE_SIZE = 24;

/**
 * כפתור-סריקה אחד: מנסה ברקוד קודם (אם הדפדפן תומך ב-BarcodeDetector),
 * ואם לא נמצא תוך IMAGE_FALLBACK_MS נופל אוטומטית לזיהוי-לפי-תמונה
 * (אותה מצלמה, בלי לפתוח מודל נפרד) — כדי לא להכריח את המשתמש לבחור
 * מראש איזה סוג זיהוי הוא רוצה.
 */
export default function ScanOrSearchModal({ onAdd, onClose, onFallbackToSearch }) {
  const { user } = useAuth();
  const { videoRef, status, retry } = useCameraStream();
  const canvasRef = useRef(null);
  const detectorRef = useRef(null);
  const fallbackTimerRef = useRef(null);

  const [manualCode, setManualCode] = useState('');
  const [result, setResult] = useState(null); // תוצאת-ברקוד: {found, product?, externalProduct?, code}
  const [detectorSupported] = useState(typeof window.BarcodeDetector !== 'undefined');
  const [showDetail, setShowDetail] = useState(false);
  const [checkingExternal, setCheckingExternal] = useState(false);

  const [mode, setMode] = useState('barcode'); // 'barcode' | 'image'
  const [candidates, setCandidates] = useState(null);
  const [added, setAdded] = useState(null);
  const [realMatch, setRealMatch] = useState(null);
  const [noMatchLabel, setNoMatchLabel] = useState(null);
  const [classifying, setClassifying] = useState(false);

  async function lookupBarcode(code) {
    clearTimeout(fallbackTimerRef.current);
    const product = getProductByBarcode(code);
    if (product) {
      setResult({ found: true, product, code });
      return;
    }
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

  async function classifyByImage() {
    setMode('image');
    const video = videoRef.current;
    if (!video) return;
    setClassifying(true);
    setNoMatchLabel(null);
    try {
      const fullCanvas = document.createElement('canvas');
      fullCanvas.width = video.videoWidth || 320;
      fullCanvas.height = video.videoHeight || 240;
      fullCanvas.getContext('2d').drawImage(video, 0, 0, fullCanvas.width, fullCanvas.height);
      const predictions = await classifyImage(fullCanvas, 5);
      const matched = matchPredictionsToCatalog(predictions, PRODUCTS);
      if (matched) {
        setCandidates(matched.matched);
        setRealMatch({ predictedLabel: matched.predictedLabel });
        setAdded(null);
        setClassifying(false);
        return;
      }
      if (predictions.length > 0) setNoMatchLabel(predictions[0].className);
    } catch {
      /* המודל לא נטען (אופליין/רשת) — noMatchLabel נשאר null */
    }
    setClassifying(false);

    const canvas = canvasRef.current;
    let seed = String(Date.now());
    if (canvas) {
      canvas.width = SAMPLE_SIZE;
      canvas.height = SAMPLE_SIZE;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, SAMPLE_SIZE, SAMPLE_SIZE);
      try {
        const data = ctx.getImageData(0, 0, SAMPLE_SIZE, SAMPLE_SIZE).data;
        seed = '';
        for (let i = 0; i < data.length; i += 37) seed += data[i];
      } catch {
        /* קנבס מזוהם (CORS) — נשארים עם seed מבוסס-זמן */
      }
    }

    setRealMatch(null);
    if (user) {
      try {
        const data = await api.post('/image-search', { seed });
        setCandidates(data.candidates);
        setAdded(null);
        return;
      } catch {
        /* השרת לא זמין — נופלים לזיהוי-הדמה המקומי */
      }
    }
    setCandidates(pickCandidates(seed, 3));
    setAdded(null);
  }

  function restartScan() {
    clearTimeout(fallbackTimerRef.current);
    setMode('barcode');
    setResult(null);
    setManualCode('');
    setCandidates(null);
    setAdded(null);
    setRealMatch(null);
    setNoMatchLabel(null);
  }

  // לולאת-זיהוי-ברקוד — פועלת רק ב-mode==='barcode' וכשאין תוצאה עדיין.
  useEffect(() => {
    if (mode !== 'barcode' || status !== CAMERA_STATUS.READY || result) return;

    if (!detectorSupported) {
      // אין תמיכה בזיהוי-ברקוד אוטומטי בדפדפן הזה — נופלים ישר לתמונה.
      classifyByImage();
      return;
    }

    if (!detectorRef.current) {
      try {
        detectorRef.current = new window.BarcodeDetector({ formats: SCAN_FORMATS });
      } catch {
        classifyByImage();
        return;
      }
    }

    const intervalId = setInterval(async () => {
      if (!videoRef.current) return;
      try {
        const codes = await detectorRef.current.detect(videoRef.current);
        if (codes.length > 0) lookupBarcode(codes[0].rawValue);
      } catch {
        /* פריים לא-מוכן/לא-תקין — מדלגים לניסיון-הבא */
      }
    }, SCAN_INTERVAL_MS);

    fallbackTimerRef.current = setTimeout(() => {
      clearInterval(intervalId);
      classifyByImage();
    }, IMAGE_FALLBACK_MS);

    return () => {
      clearInterval(intervalId);
      clearTimeout(fallbackTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, status, result]);

  function handlePickCandidate(product) {
    onAdd(product);
    setAdded(product.name);
  }

  const scanningForBarcode =
    mode === 'barcode' && status === CAMERA_STATUS.READY && detectorSupported && !result;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal barcode-modal" onClick={(e) => e.stopPropagation()}>
        <CloseButton onClick={onClose} />
        <h2>
          <Icon name="camera" /> סרוק / זהה מוצר
        </h2>

        {!result && !candidates && (
          <>
            {(status === CAMERA_STATUS.READY) && (
              <div className="barcode-video-wrap">
                <video ref={videoRef} className="barcode-video" autoPlay playsInline muted />
                <p className="barcode-hint">
                  {scanningForBarcode
                    ? 'כוונו את המצלמה לברקוד — אם לא יימצא נעבור אוטומטית לזיהוי לפי תמונה'
                    : classifying
                      ? 'לא זוהה ברקוד — מזהה לפי תמונה…'
                      : 'כוונו את המצלמה למוצר'}
                </p>
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
            <canvas ref={canvasRef} style={{ display: 'none' }} />
          </>
        )}

        <div className="barcode-manual-row">
          <input
            className="map-edit-input"
            type="text"
            inputMode="numeric"
            placeholder="או הקלידו ברקוד ידנית"
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && manualCode.trim() && lookupBarcode(manualCode.trim())}
          />
          <button
            className="btn btn--ghost btn--small"
            disabled={!manualCode.trim()}
            onClick={() => lookupBarcode(manualCode.trim())}
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
                  <button className="btn btn--text btn--small" onClick={restartScan}>
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
                <div className="barcode-result-actions">
                  <button className="btn btn--text btn--small" onClick={restartScan}>
                    נסה שוב
                  </button>
                  <button
                    className="btn btn--ghost btn--small"
                    onClick={() => {
                      setResult(null);
                      classifyByImage();
                    }}
                  >
                    <Icon name="camera" /> נסה זיהוי לפי תמונה במקום
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {candidates && (
          <div className="image-search-result">
            {realMatch ? (
              <p className="mock-disclaimer">
                <Icon name="check" /> זיהוי-תמונה אמיתי (TensorFlow.js/MobileNet, רץ בדפדפן) — זוהה כ-"
                {realMatch.predictedLabel}". זו קטגוריה חזותית-כללית, לא מותג-מדויק — בחרו את המוצר הנכון:
              </p>
            ) : noMatchLabel ? (
              <p className="mock-disclaimer">
                <Icon name="check" /> הזיהוי-האמיתי רץ בהצלחה וזיהה "{noMatchLabel}" — אבל אין לזה התאמה
                בקטלוג המצומצם שלנו. הצעות-הדמה במקום. בחרו את המוצר הנכון:
              </p>
            ) : (
              <p className="mock-disclaimer">
                🔮 לא זוהה ברקוד, והזיהוי-האמיתי-לפי-תמונה לא רץ (מודל לא נטען/אופליין) — הצעות-הדמה במקום.
                בחרו את המוצר הנכון:
              </p>
            )}
            <ul className="candidate-list">
              {candidates.map((p) => {
                const dept = getDepartment(p.department);
                return (
                  <li key={p.id} className="candidate-row">
                    <button className="candidate-btn" onClick={() => handlePickCandidate(p)}>
                      <span className="candidate-icon">
                        <DeptIcon dept={dept} />
                      </span>
                      <span className="candidate-info">
                        <span className="candidate-name">{p.name}</span>
                        <span className="candidate-loc">
                          {dept.name} · {locationLabel(p)}
                        </span>
                      </span>
                      <span className="candidate-price">
                        <PriceTag product={p} size="small" />
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
            {added && (
              <p className="voice-matched">
                <Icon name="check" /> נוסף: {added}
              </p>
            )}
            <div className="image-search-actions">
              <button className="btn btn--text btn--small" onClick={restartScan}>
                <Icon name="reset" /> צלם/סרוק שוב
              </button>
              <button
                className="btn btn--text btn--small"
                onClick={() => {
                  onClose();
                  onFallbackToSearch?.();
                }}
              >
                אף אחד מאלה — חפש ידנית
              </button>
            </div>
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
