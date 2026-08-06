import { useCallback, useEffect, useRef, useState } from 'react';

const WATCH_OPTIONS = { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 };

/** GPS אמיתי (navigator.geolocation.watchPosition) — לא ניחוש, אבל תלוי
 * בקליטה אמיתית של המכשיר (בד"כ קיימת רק ליד חלונות/כניסה/חוץ). */
export function useGeolocationWatch() {
  const [position, setPosition] = useState(null); // {lat,lng,accuracy}
  const [active, setActive] = useState(false);
  const [error, setError] = useState(null);
  const watchIdRef = useRef(null);

  const supported = typeof navigator !== 'undefined' && !!navigator.geolocation;

  const start = useCallback(() => {
    if (!supported || watchIdRef.current != null) return;
    setError(null);
    setActive(true); // "צופה" רץ — לא אומר שכבר יש קליטה/fix
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        setPosition({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        });
      },
      (err) => {
        setError(err.message || 'geolocation error');
      },
      WATCH_OPTIONS
    );
  }, [supported]);

  const stop = useCallback(() => {
    if (watchIdRef.current != null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setActive(false);
    setPosition(null);
  }, []);

  useEffect(() => () => stop(), [stop]);

  return { position, active, supported, error, start, stop };
}
