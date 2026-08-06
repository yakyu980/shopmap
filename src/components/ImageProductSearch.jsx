import { useRef, useState } from 'react';
import { getDepartment } from '../lib/storeConfig';
import { locationLabel } from '../data/storeData';
import { useCameraStream, CAMERA_STATUS } from '../lib/useCameraStream';
import { pickCandidates } from '../lib/imageRecognitionMock';

const SAMPLE_SIZE = 24;

export default function ImageProductSearch({ onAdd, onClose, onFallbackToSearch }) {
  const { videoRef, status } = useCameraStream();
  const canvasRef = useRef(null);
  const [candidates, setCandidates] = useState(null);
  const [added, setAdded] = useState(null);

  function handleCapture() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    canvas.width = SAMPLE_SIZE;
    canvas.height = SAMPLE_SIZE;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, SAMPLE_SIZE, SAMPLE_SIZE);
    let seed = '';
    try {
      const data = ctx.getImageData(0, 0, SAMPLE_SIZE, SAMPLE_SIZE).data;
      for (let i = 0; i < data.length; i += 37) seed += data[i];
    } catch {
      seed = String(Date.now());
    }
    setCandidates(pickCandidates(seed, 3));
    setAdded(null);
  }

  function handlePick(product) {
    onAdd(product);
    setAdded(product.name);
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal image-search-modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="סגור">
          ✕
        </button>
        <h2>📸 חפש לפי תמונה</h2>

        {!candidates && (
          <>
            {status === CAMERA_STATUS.READY && (
              <div className="barcode-video-wrap">
                <video ref={videoRef} className="barcode-video" autoPlay playsInline muted />
                <p className="barcode-hint">צלמו את המוצר שאתם מחפשים</p>
              </div>
            )}
            {status === CAMERA_STATUS.LOADING && <p className="barcode-hint">📷 מבקש הרשאת מצלמה…</p>}
            {status === CAMERA_STATUS.DENIED && (
              <p className="barcode-hint">🚫 לא ניתנה הרשאת מצלמה — נסו את החיפוש הרגיל.</p>
            )}
            {status === CAMERA_STATUS.UNSUPPORTED && (
              <p className="barcode-hint">ℹ️ מצלמה לא זמינה כאן — נסו את החיפוש הרגיל.</p>
            )}
            <canvas ref={canvasRef} style={{ display: 'none' }} />
            {status === CAMERA_STATUS.READY && (
              <button className="btn btn--primary" onClick={handleCapture}>
                📸 צלם
              </button>
            )}
          </>
        )}

        {candidates && (
          <div className="image-search-result">
            <p className="mock-disclaimer">
              🔮 זיהוי-מוצר לפי תמונה (דמה — לא AI אמיתי). בחרו את המוצר הנכון מבין המועמדים:
            </p>
            <ul className="candidate-list">
              {candidates.map((p) => {
                const dept = getDepartment(p.department);
                return (
                  <li key={p.id} className="candidate-row">
                    <button className="candidate-btn" onClick={() => handlePick(p)}>
                      <span className="candidate-icon">{dept.icon}</span>
                      <span className="candidate-info">
                        <span className="candidate-name">{p.name}</span>
                        <span className="candidate-loc">
                          {dept.name} · {locationLabel(p)}
                        </span>
                      </span>
                      <span className="candidate-price">₪{p.price.toFixed(2)}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
            {added && <p className="voice-matched">✅ נוסף: {added}</p>}
            <div className="image-search-actions">
              <button
                className="btn btn--text btn--small"
                onClick={() => {
                  setCandidates(null);
                  setAdded(null);
                }}
              >
                🔁 צלם שוב
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
    </div>
  );
}
