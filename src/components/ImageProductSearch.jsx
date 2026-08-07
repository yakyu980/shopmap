import { useRef, useState } from 'react';
import { getDepartment } from '../lib/storeConfig';
import { locationLabel, PRODUCTS } from '../data/storeData';
import { useCameraStream, CAMERA_STATUS } from '../lib/useCameraStream';
import { pickCandidates } from '../lib/imageRecognitionMock';
import { classifyImage } from '../lib/imageClassify';
import { matchPredictionsToCatalog } from '../lib/imageClassifyMatch';
import { useAuth } from '../lib/useAuth';
import { api } from '../lib/apiClient';
import PriceTag from './PriceTag';
import Icon from './Icon';
import DeptIcon from './DeptIcon';
import CloseButton from './CloseButton';

const SAMPLE_SIZE = 24;

export default function ImageProductSearch({ onAdd, onClose, onFallbackToSearch }) {
  const { user } = useAuth();
  const { videoRef, status } = useCameraStream();
  const canvasRef = useRef(null);
  const [candidates, setCandidates] = useState(null);
  const [added, setAdded] = useState(null);
  const [realMatch, setRealMatch] = useState(null); // {predictedLabel} | null — כשהזיהוי אמיתי (לא mock)
  const [noMatchLabel, setNoMatchLabel] = useState(null); // הזיהוי-האמיתי *כן* רץ בהצלחה, פשוט בלי התאמה בקטלוג
  const [classifying, setClassifying] = useState(false);

  async function handleCapture() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    // ניסיון-ראשון: זיהוי אמיתי (MobileNet, רץ בדפדפן) על תמונה מלאה
    // (לא ה-24×24 המקטין-לצורך-seed). שני מצבי-כישלון שונים לגמרי,
    // וחשוב להבחין ביניהם בממשק כדי לא להטעות: (1) המודל לא נטען
    // בכלל (אופליין/רשת) — noMatchLabel נשאר null; (2) המודל רץ
    // בהצלחה אבל לא זיהה משהו שיש לו התאמה בקטלוג המצומצם שלנו
    // (noMatchLabel נשמר עם התווית-האמיתית-שזוהתה). שניהם נופלים
    // לזיהוי-הדמה למטה, אבל ההודעה למשתמש שונה ונכונה לכל מצב.
    setClassifying(true);
    setNoMatchLabel(null);
    try {
      const fullCanvas = document.createElement('canvas');
      fullCanvas.width = video.videoWidth || 320;
      fullCanvas.height = video.videoHeight || 240;
      fullCanvas.getContext('2d').drawImage(video, 0, 0, fullCanvas.width, fullCanvas.height);
      const predictions = await classifyImage(fullCanvas, 5);
      const result = matchPredictionsToCatalog(predictions, PRODUCTS);
      if (result) {
        setCandidates(result.matched);
        setRealMatch({ predictedLabel: result.predictedLabel });
        setAdded(null);
        setClassifying(false);
        return;
      }
      if (predictions.length > 0) setNoMatchLabel(predictions[0].className);
    } catch {
      /* המודל לא נטען (אופליין/רשת) — noMatchLabel נשאר null */
    }
    setClassifying(false);

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

  function handlePick(product) {
    onAdd(product);
    setAdded(product.name);
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal image-search-modal" onClick={(e) => e.stopPropagation()}>
        <CloseButton onClick={onClose} />
        <h2>
          <Icon name="camera" /> חפש לפי תמונה
        </h2>

        {!candidates && (
          <>
            {status === CAMERA_STATUS.READY && (
              <div className="barcode-video-wrap">
                <video ref={videoRef} className="barcode-video" autoPlay playsInline muted />
                <p className="barcode-hint">צלמו את המוצר שאתם מחפשים</p>
              </div>
            )}
            {status === CAMERA_STATUS.LOADING && (
              <p className="barcode-hint">
                <Icon name="camera" /> מבקש הרשאת מצלמה…
              </p>
            )}
            {status === CAMERA_STATUS.DENIED && (
              <p className="barcode-hint">
                <Icon name="warning" /> לא ניתנה הרשאת מצלמה — נסו את החיפוש הרגיל.
              </p>
            )}
            {status === CAMERA_STATUS.UNSUPPORTED && (
              <p className="barcode-hint">מצלמה לא זמינה כאן — נסו את החיפוש הרגיל.</p>
            )}
            <canvas ref={canvasRef} style={{ display: 'none' }} />
            {status === CAMERA_STATUS.READY && (
              <button className="btn btn--primary" onClick={handleCapture} disabled={classifying}>
                <Icon name="camera" /> {classifying ? 'מזהה…' : 'צלם'}
              </button>
            )}
          </>
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
                🔮 הזיהוי-האמיתי לא רץ (מודל לא נטען/אופליין) — הצעות-הדמה במקום. בחרו את המוצר הנכון:
              </p>
            )}
            <ul className="candidate-list">
              {candidates.map((p) => {
                const dept = getDepartment(p.department);
                return (
                  <li key={p.id} className="candidate-row">
                    <button className="candidate-btn" onClick={() => handlePick(p)}>
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
              <button
                className="btn btn--text btn--small"
                onClick={() => {
                  setCandidates(null);
                  setAdded(null);
                  setRealMatch(null);
                  setNoMatchLabel(null);
                }}
              >
                <Icon name="reset" /> צלם שוב
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
