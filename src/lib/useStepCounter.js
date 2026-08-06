import { useCallback, useEffect, useRef, useState } from 'react';

// פדומטר-דפדפן ניסיוני: peak-detection על magnitude של תאוצה, בלי כיול
// אמיתי — נותן הערכה גסה בלבד (לא GPS/מצפן), לפי בקשת המשתמש המפורשת.
const STEP_LENGTH_M = 0.7;
const STEP_THRESHOLD = 1.2; // m/s² מעל הבסיס-המוחלק
const MIN_STEP_INTERVAL_MS = 300;

export function useStepCounter() {
  const [steps, setSteps] = useState(0);
  const [supported, setSupported] = useState(true);
  const [permission, setPermission] = useState('idle'); // idle|granted|denied|unnecessary
  const [active, setActive] = useState(false);

  const lastStepTimeRef = useRef(0);
  const smoothedRef = useRef(9.8);
  const activeRef = useRef(false);

  const handleMotion = useCallback((e) => {
    const acc = e.accelerationIncludingGravity || e.acceleration;
    if (!acc || acc.x == null) return;
    const mag = Math.sqrt((acc.x || 0) ** 2 + (acc.y || 0) ** 2 + (acc.z || 0) ** 2);
    smoothedRef.current = smoothedRef.current * 0.9 + mag * 0.1;
    const delta = mag - smoothedRef.current;
    const now = Date.now();
    if (delta > STEP_THRESHOLD && now - lastStepTimeRef.current > MIN_STEP_INTERVAL_MS) {
      lastStepTimeRef.current = now;
      setSteps((s) => s + 1);
    }
  }, []);

  const start = useCallback(async () => {
    if (typeof DeviceMotionEvent === 'undefined') {
      setSupported(false);
      return;
    }
    if (typeof DeviceMotionEvent.requestPermission === 'function') {
      try {
        const res = await DeviceMotionEvent.requestPermission();
        setPermission(res);
        if (res !== 'granted') return;
      } catch {
        setPermission('denied');
        return;
      }
    } else {
      setPermission('unnecessary');
    }
    window.addEventListener('devicemotion', handleMotion);
    activeRef.current = true;
    setActive(true);
  }, [handleMotion]);

  useEffect(
    () => () => {
      if (activeRef.current) window.removeEventListener('devicemotion', handleMotion);
    },
    [handleMotion]
  );

  const reset = useCallback(() => setSteps(0), []);

  return {
    steps,
    distanceMeters: Math.round(steps * STEP_LENGTH_M),
    active,
    supported,
    permission,
    start,
    reset,
  };
}
