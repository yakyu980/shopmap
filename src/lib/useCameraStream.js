import { useCallback, useEffect, useRef, useState } from 'react';

export const CAMERA_STATUS = {
  LOADING: 'loading',
  READY: 'ready',
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

  useEffect(() => {
    let cancelled = false;

    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      setStatus(CAMERA_STATUS.UNSUPPORTED);
      return;
    }

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'environment' }, audio: false })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
        setStatus(CAMERA_STATUS.READY);
      })
      .catch(() => {
        if (!cancelled) setStatus(CAMERA_STATUS.DENIED);
      });

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [attempt]);

  return { videoRef, status, retry };
}
