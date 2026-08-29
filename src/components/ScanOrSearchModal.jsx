import { useEffect, useRef, useState } from 'react';
import { getDepartment, getDepartments } from '../lib/storeConfig';
import { locationLabel } from '../data/storeData';
import { getProductByBarcode, addProductToCatalog, getAllProducts } from '../lib/catalog';
import { useCameraStream, CAMERA_STATUS } from '../lib/useCameraStream';
import { lookupBarcodeExternal } from '../lib/openFoodFacts';
import { api } from '../lib/apiClient';
import ProductDetail from './ProductDetail';
import PriceTag from './PriceTag';
import Icon from './Icon';
import ProductImage from './ProductImage';
import CloseButton from './CloseButton';

const SCAN_FORMATS = ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128'];
const SCAN_INTERVAL_MS = 400;

function captureFrameAsJpeg(video) {
  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth || 320;
  canvas.height = video.videoHeight || 240;
  canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', 0.8); // "data:image/jpeg;base64,...."
}

/**
 * כפתור-סריקה אחד: זיהוי-ברקוד רץ אוטומטית ברקע (לולאה חוזרת), וזיהוי-
 * תמונה-אמיתית (Gemini Vision) מופעל ביודעין ע"י המשתמש (כפתור "צלם
 * עכשיו לזיהוי") — לא אוטומטי, כדי לא לחייב אותו להחזיק את המוצר
 * מוכן מהרגע שהמצלמה נפתחת. מי שמזהה קודם מנצח ומבטל את השני.
 */
export default function ScanOrSearchModal({ onAdd, onClose, onFallbackToSearch, activeVenueId = null }) {
  const { videoRef, status, retry, pause } = useCameraStream();
  const detectorRef = useRef(null);
  const geminiAbortRef = useRef(null);
  const settledRef = useRef(false); // true ברגע שאחד מהמסלולים "ניצח" — עוצר את השני

  const [manualCode, setManualCode] = useState('');
  const [detectorSupported] = useState(typeof window.BarcodeDetector !== 'undefined');
  const [recognizing, setRecognizing] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const [imageStatus, setImageStatus] = useState('idle'); // 'idle' | 'sent' | 'no-match'
  const [imageFailureReason, setImageFailureReason] = useState(null);
  const [capturedPhoto, setCapturedPhoto] = useState(null);
  const [priceLookupBusy, setPriceLookupBusy] = useState(false);
  const [priceLookupMessage, setPriceLookupMessage] = useState('');

  // outcome: null | {kind:'barcode-found', product} | {kind:'barcode-not-found', code, externalProduct}
  //        | {kind:'image-found', product, photoDataUrl} | {kind:'image-not-found', name, brand, category, photoDataUrl, reason}
  const [outcome, setOutcome] = useState(null);
  const [showDetail, setShowDetail] = useState(false);

  // טופס "הוסף מוצר חדש"
  const [addForm, setAddForm] = useState(null); // {name, barcode, department, price, priceSource, category, photoDataUrl}
  const [addBusy, setAddBusy] = useState(false);
  const [addError, setAddError] = useState('');

  function stopOtherTracks() {
    settledRef.current = true;
    geminiAbortRef.current?.abort();
  }

  async function lookupBarcode(code) {
    if (settledRef.current) return;
    const product = getProductByBarcode(code);
    if (product) {
      stopOtherTracks();
      setOutcome({ kind: 'barcode-found', product, code });
      return;
    }
    // צילום-מסך של רגע-הסריקה — משמש כתמונה-חלופית אם ל-Open Food Facts
    // אין תמונה למוצר הזה (עדיין עדיף על שום תמונה בטופס "הוסף מוצר חדש").
    const fallbackPhoto = videoRef.current ? captureFrameAsJpeg(videoRef.current) : null;
    let externalProduct = null;
    try {
      externalProduct = await lookupBarcodeExternal(code);
    } catch {
      /* אין רשת/השירות לא זמין — נופלים ל"לא נמצא" הרגיל */
    }
    if (settledRef.current) return;
    stopOtherTracks();
    setOutcome({ kind: 'barcode-not-found', code, externalProduct, fallbackPhoto });
  }

  async function tryGeminiRecognition() {
    const video = videoRef.current;
    if (!video || !videoReady || video.readyState < 2 || !video.videoWidth || !video.videoHeight) {
      setImageStatus('no-match');
      setImageFailureReason('camera-frame-not-ready');
      return;
    }
    setRecognizing(true);
    setImageStatus('sent');
    setImageFailureReason(null);
    const photoDataUrl = captureFrameAsJpeg(video);
    setCapturedPhoto(photoDataUrl);
    // הצילום הוא פריים קפוא: מכבים בפועל את זרם המצלמה (כולל נורית
    // המצלמה במכשיר) ומציגים את התמונה שנשלחה. "צלם שוב" יפתח זרם חדש.
    pause();
    const imageBase64 = photoDataUrl.split(',')[1];
    const controller = new AbortController();
    geminiAbortRef.current = controller;
    try {
      const data = await api.post(
        '/recognize-product',
        { imageBase64, mimeType: 'image/jpeg' },
        { signal: controller.signal }
      );
      if (settledRef.current) return;
      setRecognizing(false);
      if (!data.recognized) {
        // Gemini קיבל את התמונה ובדק אותה, אבל לא זיהה מוצר — לא "מנצח"
        // בעצמו, פשוט לא תורם תוצאה; מציגים הודעה ברורה כדי שהמשתמש
        // יידע שהתמונה כן נשלחה ולא שהתקלקל משהו, והברקוד ממשיך לרוץ.
        setImageStatus('no-match');
        setImageFailureReason(data.reason || 'no-product-in-image');
        return;
      }
      // ניסיון-התאמה בקטלוג לפי שם (התחלת-מחרוזת, כמו חיפוש רגיל)
      const q = data.name.trim().toLowerCase();
      const match = getAllProducts().find((p) => p.name.toLowerCase().startsWith(q));
      stopOtherTracks();
      if (match) {
        setOutcome({ kind: 'image-found', product: match, photoDataUrl });
      } else {
        setOutcome({
          kind: 'image-not-found',
          name: data.name,
          brand: data.brand,
          category: data.category,
          photoDataUrl,
        });
      }
    } catch (err) {
      if (err?.name === 'AbortError') return;
      if (!settledRef.current) {
        setRecognizing(false);
        setImageStatus('no-match');
        setImageFailureReason('network-error');
      }
    }
  }

  function restartScan() {
    settledRef.current = false;
    geminiAbortRef.current = null;
    setOutcome(null);
    setAddForm(null);
    setAddError('');
    setManualCode('');
    setRecognizing(false);
    setVideoReady(false);
    setImageStatus('idle');
    setImageFailureReason(null);
    setCapturedPhoto(null);
    setPriceLookupMessage('');
  }

  // מריצים את שני המסלולים במקביל ברגע שהמצלמה מוכנה.
  useEffect(() => {
    if (status !== CAMERA_STATUS.READY || outcome) return;
    settledRef.current = false;

    // מסלול 1: זיהוי-ברקוד לולאתי
    let intervalId = null;
    if (detectorSupported) {
      if (!detectorRef.current) {
        try {
          detectorRef.current = new window.BarcodeDetector({ formats: SCAN_FORMATS });
        } catch {
          detectorRef.current = null;
        }
      }
      if (detectorRef.current) {
        intervalId = setInterval(async () => {
          if (!videoRef.current || settledRef.current) return;
          try {
            const codes = await detectorRef.current.detect(videoRef.current);
            if (codes.length > 0) lookupBarcode(codes[0].rawValue);
          } catch {
            /* פריים לא-מוכן/לא-תקין — מדלגים לניסיון-הבא */
          }
        }, SCAN_INTERVAL_MS);
      }
    }

    // מסלול 2: זיהוי-תמונה (Gemini) — לא אוטומטי (לא רוצים לחייב את
    // המשתמש להחזיק את המוצר מוכן מהרגע הראשון); המשתמש מפעיל את זה
    // ביודעין דרך כפתור "צלם עכשיו לזיהוי", בזמן שהוא בוחר.

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, outcome]);

  async function lookupPriceForForm(name, barcode) {
    setPriceLookupBusy(true);
    setPriceLookupMessage('');
    try {
      let rows = [];
      if (barcode) {
        const data = await api.get(`/price-import/${encodeURIComponent(barcode)}`);
        rows = data?.rows || [];
      } else if (name?.trim().length >= 2) {
        const data = await api.get(`/price-import/catalog/search?q=${encodeURIComponent(name.trim())}`);
        const first = data?.products?.[0];
        if (first) {
          const exact = await api.get(`/price-import/${encodeURIComponent(first.barcode)}`);
          rows = exact?.rows || [];
          setAddForm((prev) => prev ? { ...prev, barcode: prev.barcode || first.barcode, name: prev.name || first.name } : prev);
        }
      }
      if (!rows.length) {
        setPriceLookupMessage('לא נמצא מחיר במאגר — נא להזין מחיר ידנית.');
        return;
      }
      const venueRow = activeVenueId ? rows.find((row) => row.venueId === activeVenueId) : null;
      const selected = venueRow || rows.reduce((min, row) => row.price < min.price ? row : min, rows[0]);
      setAddForm((prev) => prev ? {
        ...prev,
        name: prev.name || selected.name || '',
        price: String(selected.price),
        priceSource: 'official',
      } : prev);
      setPriceLookupMessage(venueRow
        ? `נמצא מחיר בסניף הפעיל: ₪${selected.price}`
        : `נמצא מחיר ממאגר המחירים: ₪${selected.price}${activeVenueId ? ' (לא נמצא מחיר מדויק לסניף הפעיל)' : ''}`);
    } catch {
      setPriceLookupMessage('לא ניתן לחפש מחיר כרגע — נא להזין מחיר ידנית.');
    } finally {
      setPriceLookupBusy(false);
    }
  }

  function openAddForm({ name, barcode, category, photoDataUrl }) {
    setAddForm({
      name: name || '',
      barcode: barcode || '',
      department: getDepartments()[0]?.id || '',
      price: '',
      priceSource: null,
      category: category || '',
      photoDataUrl: photoDataUrl || null,
    });
    setAddError('');
    // אם יש ברקוד — בודקים אם יש לו מחיר-רשמי-אמיתי (חוק שקיפות-מחירים)
    if (barcode) lookupPriceForForm(name, barcode);
  }

  async function submitAddForm() {
    if (!addForm.name.trim()) return setAddError('שם המוצר נדרש');
    const priceNum = Number(addForm.price);
    if (!priceNum || priceNum <= 0) return setAddError('נא להזין מחיר תקין');
    if (!addForm.department) return setAddError('נא לבחור מחלקה');

    setAddBusy(true);
    setAddError('');
    try {
      const data = await api.post('/products', {
        name: addForm.name.trim(),
        barcode: addForm.barcode.trim() || null,
        department: addForm.department,
        shelf: 1,
        zone: 1,
        price: priceNum,
        category: addForm.category || null,
        imageDataUrl: addForm.photoDataUrl || null,
      });
      addProductToCatalog(data.product);
      onAdd(data.product);
      onClose();
    } catch (err) {
      setAddError(err?.message || 'שגיאת-שרת');
    } finally {
      setAddBusy(false);
    }
  }

  const scanning = status === CAMERA_STATUS.READY && !outcome;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal barcode-modal" onClick={(e) => e.stopPropagation()}>
        <CloseButton onClick={onClose} />
        <h2>
          <Icon name="camera" /> סרוק / זהה מוצר
        </h2>

        {!outcome && !addForm && (
          <>
            {status === CAMERA_STATUS.READY && (
              <div className="barcode-video-wrap">
                <video
                  ref={videoRef}
                  className="barcode-video"
                  autoPlay
                  playsInline
                  muted
                  onLoadedData={() => setVideoReady(true)}
                  onCanPlay={() => setVideoReady(true)}
                />
                <p className="barcode-hint">
                  {!videoReady ? 'מכין את המצלמה לצילום…' : 'כוונו את המצלמה למוצר או לברקוד'}
                </p>
              </div>
            )}
            {capturedPhoto && (
              <div className="captured-photo-preview" role="status">
                <strong><Icon name="check" /> התמונה צולמה ונשלחה לזיהוי</strong>
                <img src={capturedPhoto} alt="התמונה שצולמה לזיהוי המוצר" />
                {recognizing && (
                  <div className="gemini-analysis" role="status" aria-live="polite">
                    <span className="gemini-analysis__spinner" aria-hidden="true" />
                    <span><strong>Gemini מנתח את התמונה…</strong><small>מזהה שם מוצר, מותג וקטגוריה</small></span>
                  </div>
                )}
                {imageStatus === 'no-match' && !recognizing && (
                  <p className="barcode-hint">
                    <Icon name="warning" /> {imageFailureReason === 'no-api-key'
                      ? 'מפתח Gemini אינו מוגדר בשרת. יש להוסיף GEMINI_API_KEY ב-Render ולהפעיל את השרת מחדש.'
                      : imageFailureReason?.startsWith('gemini-http-')
                        ? `Gemini דחה את הבקשה (${imageFailureReason.replace('gemini-http-', 'HTTP ')}). בדקו את המפתח וההרשאות בשרת.`
                        : imageFailureReason === 'timeout'
                          ? 'Gemini לא הגיב בזמן. נסו שוב בעוד רגע.'
                          : imageFailureReason === 'network-error' || imageFailureReason === 'error'
                            ? 'לא ניתן היה להתחבר לשירות הזיהוי. בדקו שהשרת פעיל ונסו שוב.'
                            : imageFailureReason === 'no-json-in-response'
                              ? 'Gemini החזיר תשובה לא תקינה. נסו לצלם שוב.'
                              : imageFailureReason === 'camera-frame-not-ready'
                                ? 'המצלמה עדיין לא הכינה פריים לצילום. המתינו רגע ונסו שוב.'
                              : 'Gemini לא זיהה מוצר בתמונה. ודאו שהמוצר מואר, ממלא את מרכז התמונה וששם המותג פונה למצלמה, ואז צלמו שוב.'}
                  </p>
                )}
                {!recognizing && imageStatus === 'no-match' && (
                  <button
                    type="button"
                    className="btn btn--ghost btn--small"
                    onClick={() => {
                      setCapturedPhoto(null);
                      setImageStatus('idle');
                      setImageFailureReason(null);
                      setVideoReady(false);
                      retry();
                    }}
                  >
                    <Icon name="camera" /> צלם שוב
                  </button>
                )}
              </div>
            )}
            {status === CAMERA_STATUS.READY && (
              <>
                <button
                  type="button"
                  className="btn btn--primary"
                  onClick={tryGeminiRecognition}
                  disabled={recognizing || !videoReady}
                >
                  <Icon name="camera" /> {!videoReady ? 'המצלמה נטענת…' : 'צלם עכשיו לזיהוי'}
                </button>
              </>
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
          </>
        )}

        {!outcome && !addForm && (
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
        )}

        {outcome?.kind === 'barcode-found' && (
          <div className="barcode-result">
            <p className="barcode-found">
              <Icon name="check" /> <ProductImage product={outcome.product} />{' '}
              {outcome.product.name} · <PriceTag product={outcome.product} size="small" /> ·{' '}
              {getDepartment(outcome.product.department)?.name}, {locationLabel(outcome.product)}
            </p>
            <div className="barcode-result-actions">
              <button
                className="btn btn--primary btn--small"
                onClick={() => {
                  onAdd(outcome.product);
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
          </div>
        )}

        {outcome?.kind === 'image-found' && (
          <div className="barcode-result">
            <p className="barcode-found">
              <Icon name="check" /> זוהה-לפי-תמונה (Gemini) כ-"{outcome.product.name}" —{' '}
              <ProductImage product={outcome.product} /> {outcome.product.name} ·{' '}
              <PriceTag product={outcome.product} size="small" /> · {getDepartment(outcome.product.department)?.name},{' '}
              {locationLabel(outcome.product)}
            </p>
            <div className="barcode-result-actions">
              <button
                className="btn btn--primary btn--small"
                onClick={() => {
                  onAdd(outcome.product);
                  onClose();
                }}
              >
                <Icon name="plus" /> הוסף לרשימה
              </button>
              <button className="btn btn--text btn--small" onClick={restartScan}>
                <Icon name="reset" /> סרוק שוב
              </button>
            </div>
          </div>
        )}

        {outcome?.kind === 'barcode-not-found' && !addForm && (
          <div className="barcode-result">
            {outcome.externalProduct ? (
              <p className="barcode-not-found">
                <Icon name="check" /> זוהה כ-"{outcome.externalProduct.name}"
                {outcome.externalProduct.brand ? ` (${outcome.externalProduct.brand})` : ''} — ברקוד אמיתי (Open
                Food Facts), אבל <strong>לא בקטלוג של הסניף הזה</strong>.
              </p>
            ) : (
              <p className="barcode-not-found">
                <Icon name="close" /> לא נמצא מוצר עם ברקוד "{outcome.code}" (גם לא בזיהוי-חיצוני)
              </p>
            )}
            <div className="barcode-result-actions">
              <button className="btn btn--text btn--small" onClick={restartScan}>
                נסה שוב
              </button>
              <button
                className="btn btn--primary btn--small"
                onClick={() =>
                  openAddForm({
                    name: outcome.externalProduct?.name || '',
                    barcode: outcome.code,
                    category: null,
                    // תמונה אמיתית מ-Open Food Facts — התאמת-ברקוד מדויקת (לא
                    // חיפוש-שם מעורפל), אז אפשר לסמוך עליה בניגוד לניסיון הקודם;
                    // אם אין לה תמונה, נופלים לצילום-מסך מרגע הסריקה.
                    photoDataUrl: outcome.externalProduct?.imageUrl || outcome.fallbackPhoto || null,
                  })
                }
              >
                <Icon name="plus" /> הוסף מוצר חדש למאגר
              </button>
            </div>
          </div>
        )}

        {outcome?.kind === 'image-not-found' && !addForm && (
          <div className="barcode-result">
            <p className="barcode-not-found">
              <Icon name="check" /> Gemini זיהה תמונה כ-"{outcome.name}"
              {outcome.brand ? ` (${outcome.brand})` : ''} — אבל <strong>אין התאמה בקטלוג שלנו</strong>.
            </p>
            <div className="barcode-result-actions">
              <button className="btn btn--text btn--small" onClick={restartScan}>
                נסה שוב
              </button>
              <button
                className="btn btn--primary btn--small"
                onClick={() =>
                  openAddForm({
                    name: outcome.name,
                    barcode: '',
                    category: outcome.category,
                    photoDataUrl: outcome.photoDataUrl,
                  })
                }
              >
                <Icon name="plus" /> הוסף מוצר חדש למאגר
              </button>
              <button
                className="btn btn--text btn--small"
                onClick={() => {
                  onClose();
                  onFallbackToSearch?.();
                }}
              >
                חפש ידנית
              </button>
            </div>
          </div>
        )}

        {addForm && (
          <div className="barcode-result add-product-form">
            <h3>הוסף מוצר חדש למאגר</h3>
            {addForm.barcode && <p className="barcode-hint"><strong>ברקוד שנסרק:</strong> {addForm.barcode}</p>}
            {addForm.photoDataUrl && (
              <img src={addForm.photoDataUrl} alt="" className="add-product-photo" />
            )}
            <label className="map-edit-label">
              שם המוצר
              <input
                className="map-edit-input"
                type="text"
                value={addForm.name}
                onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
              />
            </label>
            <button
              type="button"
              className="btn btn--ghost btn--small"
              disabled={priceLookupBusy || (!addForm.name.trim() && !addForm.barcode.trim())}
              onClick={() => lookupPriceForForm(addForm.name, addForm.barcode)}
            >
              <Icon name="search" /> {priceLookupBusy ? 'מחפש מחיר…' : 'חפש שם ומחיר במאגר'}
            </button>
            {priceLookupMessage && <p className="barcode-hint">{priceLookupMessage}</p>}
            <label className="map-edit-label">
              ברקוד (אופציונלי)
              <input
                className="map-edit-input"
                type="text"
                inputMode="numeric"
                value={addForm.barcode}
                onChange={(e) => setAddForm({ ...addForm, barcode: e.target.value })}
              />
            </label>
            <label className="map-edit-label">
              מחלקה
              <select
                className="map-edit-input"
                value={addForm.department}
                onChange={(e) => setAddForm({ ...addForm, department: e.target.value })}
              >
                {getDepartments().map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.icon} {d.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="map-edit-label">
              מחיר (₪)
              <input
                className="map-edit-input"
                type="number"
                min="0.1"
                step="0.1"
                value={addForm.price}
                onChange={(e) => setAddForm({ ...addForm, price: e.target.value, priceSource: 'manual' })}
              />
              {addForm.priceSource === 'official' && (
                <span className="barcode-hint">
                  <Icon name="check" /> מחיר רשמי-אמיתי (חוק שקיפות-מחירים) — אפשר לערוך
                </span>
              )}
              {addForm.priceSource === 'manual' && (
                <span className="barcode-hint">מחיר שהוזן ידנית — אין לזה מקור-רשמי</span>
              )}
            </label>
            {addError && (
              <p className="barcode-not-found">
                <Icon name="warning" /> {addError}
              </p>
            )}
            <div className="barcode-result-actions">
              <button className="btn btn--primary btn--small" disabled={addBusy} onClick={submitAddForm}>
                <Icon name="plus" /> {addBusy ? 'שומר…' : 'שמור והוסף לרשימה'}
              </button>
              <button className="btn btn--text btn--small" onClick={restartScan}>
                ביטול
              </button>
            </div>
          </div>
        )}
      </div>

      {showDetail && outcome?.product && (
        <ProductDetail
          product={outcome.product}
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
