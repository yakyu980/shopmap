import { useCallback, useEffect, useRef, useState } from 'react';

export const CAMERA_STATUS = {
  LOADING: 'loading',
  READY: 'ready',
  PAUSED: 'paused',
  DENIED: 'denied',
  UNSUPPORTED: 'unsupported',
};

/**
 * מנהל זרם-מצלמה חי (getUserMedia) + ניקוי אוטומטי ב-unmount.
 * `retry` מאפשר לנסות שוב לאחר דחייה — נחוץ כי getUserMedia לא פותח
 * את דיאלוג-ההרשאה של הדפדפן בשנית באופן אוטומטי; retry רק מפעיל
 * מחדש את הבקשה, וזה מספיק כשהמשתמש שינה את ההרשאה בהגדרות הדפדפן
 * ורוצה שהאפליקציה תבדוק את זה בלי לרענן את הדף.
 */
export function useCameraStream() {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [status, setStatus] = useState(CAMERA_STATUS.LOADING);
  const [attempt, setAttempt] = useState(0);

  const retry = useCallback(() => {
    setStatus(CAMERA_STATUS.LOADING);
    setAttempt((n) => n + 1);
  }, []);

  const pause = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setStatus(CAMERA_STATUS.PAUSED);
  }, []);

  useEffect(() => {
    let cancelled = false;

    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      setStatus(CAMERA_STATUS.UNSUPPORTED);
      return;
    }

    const useStream = (stream) => {
      if (cancelled) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setStatus(CAMERA_STATUS.READY);
    };

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'environment' }, audio: false })
      .then(useStream)
      .catch((err) => {
        if (cancelled) return;
        // אין מצלמה אחורית (למשל מחשב-נייד) — לא באמת "הרשאה נדחתה",
        // מנסים שוב עם כל מצלמה זמינה (בד"כ הקדמית) לפני שמוותרים.
        if (err?.name === 'OverconstrainedError' || err?.name === 'NotFoundError') {
          navigator.mediaDevices
            .getUserMedia({ video: true, audio: false })
            .then(useStream)
            .catch(() => {
              if (!cancelled) setStatus(CAMERA_STATUS.DENIED);
            });
          return;
        }
        setStatus(CAMERA_STATUS.DENIED);
      });

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [attempt]);

  // ה-<video> ברוב המסכים מצויר רק כש-status==='ready' (כדי לא להציג
  // אלמנט-וידאו ריק בזמן הטעינה) — כלומר ברגע שה-stream מגיע, ה-ref
  // עוד לא מחובר לשום אלמנט. האפקט הזה רץ אחרי שה-DOM כבר עודכן
  // ומחבר את ה-stream לאלמנט האמיתי; בלעדיו הווידאו נשאר שחור.
  useEffect(() => {
    if (status === CAMERA_STATUS.READY && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [status]);

  return { videoRef, status, retry, pause };
}
