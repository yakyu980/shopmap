import { useEffect, useRef, useState } from 'react';

export const CAMERA_STATUS = {
  LOADING: 'loading',
  READY: 'ready',
  DENIED: 'denied',
  UNSUPPORTED: 'unsupported',
};

/** מנהל זרם-מצלמה חי (getUserMedia) + ניקוי אוטומטי ב-unmount. */
export function useCameraStream() {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [status, setStatus] = useState(CAMERA_STATUS.LOADING);

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
  }, []);

  return { videoRef, status };
}
