import { useRef, useState } from 'react';
import { PRODUCTS } from '../data/storeData';
import { useCameraStream, CAMERA_STATUS } from '../lib/useCameraStream';
import { recognizeReceiptText } from '../lib/receiptOcr';
import { parseReceiptText, matchReceiptItemsToCatalog } from '../lib/receiptParse';
import { saveReceipt } from '../lib/receiptHistory';
import { useAuth } from '../lib/useAuth';
import { useVenues } from '../lib/useVenues';
import { api } from '../lib/apiClient';
import Icon from './Icon';
import CloseButton from './CloseButton';

const STAGE = { CAPTURE: 'capture', OCR: 'ocr', REVIEW: 'review', SAVED: 'saved' };

export default function ReceiptScanner({ onClose }) {
  const { videoRef, status } = useCameraStream();
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);
  const [stage, setStage] = useState(STAGE.CAPTURE);
  const [progress, setProgress] = useState(0);
  const [rows, setRows] = useState([]);
  const [error, setError] = useState('');
  const [venueId, setVenueId] = useState('');
  const [syncedToServer, setSyncedToServer] = useState(false);
  const { token } = useAuth();
  const { venues } = useVenues();

  async function runOcr(imageSource) {
    setStage(STAGE.OCR);
    setProgress(0);
    setError('');
    try {
      const rawText = await recognizeReceiptText(imageSource, (m) => {
        if (m.status === 'recognizing text') setProgress(Math.round(m.progress * 100));
      });
      const parsed = parseReceiptText(rawText);
      const matched = matchReceiptItemsToCatalog(parsed, PRODUCTS);
      setRows(matched);
      setStage(STAGE.REVIEW);
    } catch (err) {
      setError('זיהוי-הטקסט נכשל: ' + (err?.message || 'שגיאה לא-ידועה'));
      setStage(STAGE.CAPTURE);
    }
  }

  function handleCapture() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
    runOcr(canvas);
  }

  function handleFileUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    runOcr(file);
  }

  function updateRow(index, patch) {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  }

  function removeRow(index) {
    setRows((prev) => prev.filter((_, i) => i !== index));
  }

  function addManualRow() {
    setRows((prev) => [...prev, { name: '', price: 0, discountPercent: null, matchedProductId: null }]);
  }

  async function handleSave() {
    const valid = rows.filter((r) => r.name.trim() && r.price > 0);

    // סנכרון-לשרת: רק כשמחוברים *וגם* נבחרה חנות מפורשת — בלעדיהם
    // הקבלה נשארת מקומית-בלבד, כמו שהייתה עד עכשיו (ר' CLAUDE.md §16).
    // venueId מועבר להיסטוריה המקומית *רק* אם הסנכרון הצליח באמת —
    // כדי שלא תיווצר שורה-כפולה (מקומית+שרת) לאותה קנייה בפועל.
    let synced = false;
    if (token && venueId) {
      try {
        await api.post('/price-observations', { venueId, items: valid, purchasedAt: Date.now() });
        synced = true;
      } catch {
        /* השרת לא זמין — נשמור מקומית-בלבד, לא חוסמים */
      }
    }
    saveReceipt(valid, synced ? venueId : null);
    setSyncedToServer(synced);
    setStage(STAGE.SAVED);
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal receipt-modal" onClick={(e) => e.stopPropagation()}>
        <CloseButton onClick={onClose} />
        <h2>
          <Icon name="receipt" /> סרוק קבלה
        </h2>
        <p className="mock-disclaimer">
          זיהוי-טקסט אמיתי (OCR בדפדפן) — לא הדמיה, אבל לא תמיד מדויק. בדקו ותקנו את הטבלה לפני
          שמירה. נשמר במכשיר הזה בלבד.
        </p>

        {stage === STAGE.CAPTURE && (
          <>
            {status === CAMERA_STATUS.READY && (
              <div className="barcode-video-wrap">
                <video ref={videoRef} className="barcode-video" autoPlay playsInline muted />
                <p className="barcode-hint">צלמו את הקבלה כשהיא ישרה ומוארת</p>
              </div>
            )}
            {status === CAMERA_STATUS.LOADING && (
              <p className="barcode-hint">
                <Icon name="camera" /> מבקש הרשאת מצלמה…
              </p>
            )}
            {status === CAMERA_STATUS.DENIED && (
              <p className="barcode-hint">
                <Icon name="warning" /> לא ניתנה הרשאת מצלמה — אפשר להעלות תמונה במקום.
              </p>
            )}
            {status === CAMERA_STATUS.UNSUPPORTED && (
              <p className="barcode-hint">מצלמה לא זמינה כאן — אפשר להעלות תמונה במקום.</p>
            )}
            <canvas ref={canvasRef} style={{ display: 'none' }} />
            {status === CAMERA_STATUS.READY && (
              <button className="btn btn--primary" onClick={handleCapture}>
                <Icon name="camera" /> צלם
              </button>
            )}
            <div className="receipt-upload-row">
              <button className="btn btn--ghost" onClick={() => fileInputRef.current?.click()}>
                <Icon name="receipt" /> או העלו תמונה של קבלה
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleFileUpload}
              />
            </div>
            {error && (
              <p className="login-error">
                <Icon name="warning" /> {error}
              </p>
            )}
          </>
        )}

        {stage === STAGE.OCR && (
          <div className="receipt-ocr-progress">
            <p>
              <Icon name="receipt" /> מזהה טקסט… {progress}%
            </p>
            <div className="goal-bar">
              <div className="goal-bar-fill" style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}

        {stage === STAGE.REVIEW && (
          <div className="receipt-review">
            <p className="settings-hint">
              {rows.length} שורות זוהו. תגי "✓ בקטלוג" מסמנים פריטים שישתלבו בהשוואת-המחיר
              האישית שלכם.
            </p>
            <ul className="receipt-row-list">
              {rows.map((row, i) => (
                <li className="receipt-row" key={i}>
                  <input
                    className="map-edit-input receipt-row-name"
                    value={row.name}
                    onChange={(e) => updateRow(i, { name: e.target.value })}
                    placeholder="שם מוצר"
                  />
                  <input
                    className="map-edit-input receipt-row-price"
                    type="number"
                    step="0.1"
                    value={row.price}
                    onChange={(e) => updateRow(i, { price: parseFloat(e.target.value) || 0 })}
                  />
                  <input
                    className="map-edit-input receipt-row-discount"
                    type="number"
                    placeholder="הנחה %"
                    value={row.discountPercent ?? ''}
                    onChange={(e) =>
                      updateRow(i, { discountPercent: e.target.value ? parseInt(e.target.value, 10) : null })
                    }
                  />
                  {row.matchedProductId ? (
                    <span className="receipt-row-matched">
                      <Icon name="check" /> בקטלוג
                    </span>
                  ) : (
                    <span className="receipt-row-unmatched">לא זוהה</span>
                  )}
                  <button className="btn btn--icon btn--danger" onClick={() => removeRow(i)} aria-label="הסר שורה">
                    <Icon name="trash" />
                  </button>
                </li>
              ))}
            </ul>
            <button className="btn btn--ghost btn--small" onClick={addManualRow}>
              <Icon name="plus" /> הוסף שורה ידנית
            </button>

            {token && (
              <label className="receipt-venue-label">
                באיזו חנות קניתם? (כדי שההשוואה תכלול גם סניפים/רשתות אחרות)
                <select
                  className="map-edit-input"
                  value={venueId}
                  onChange={(e) => setVenueId(e.target.value)}
                >
                  <option value="">— לא צוין (נשאר מקומי-בלבד) —</option>
                  {venues.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.chainName} · {v.branchName}
                    </option>
                  ))}
                </select>
              </label>
            )}

            <button className="btn btn--primary receipt-save-btn" onClick={handleSave} disabled={rows.length === 0}>
              <Icon name="check" /> שמור קבלה
            </button>
          </div>
        )}

        {stage === STAGE.SAVED && (
          <div className="receipt-saved">
            <p>
              <Icon name="check" /> הקבלה נשמרה ({rows.filter((r) => r.name.trim() && r.price > 0).length} פריטים).
            </p>
            <p className="settings-hint">
              {syncedToServer
                ? 'שותפה גם עם בני-המשפחה, לצורך השוואה בין החנות הזו לחנויות אחרות.'
                : 'נשמרה במכשיר הזה בלבד (לא צוינה חנות, או שהמשתמש לא מחובר).'}
            </p>
            <button className="btn btn--primary" onClick={onClose}>
              סגור
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
