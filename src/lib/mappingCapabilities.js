// Browser observations are capability evidence, never proof of indoor positioning.
export function browserProfile(env = window) {
  const nav = env.navigator || {};
  const ua = nav.userAgent || '';
  const platform = /Android/i.test(ua) ? 'Android' : /iPhone|iPad|iPod/i.test(ua) ||
    (/Macintosh/i.test(ua) && nav.maxTouchPoints > 1) ? 'iOS / iPadOS' :
    /Windows/i.test(ua) ? 'Windows' : /Macintosh/i.test(ua) ? 'macOS' : 'מערכת לא מזוהה';
  return { platform, secure: env.isSecureContext === true, runtime: 'דפדפן' };
}

export function validVector(value, axes) {
  return !!value && axes.every((axis) => Number.isFinite(value[axis]));
}

// Installs timeout/cancellation before starting a permission request. A late camera
// stream is always stopped, even after timeout or navigating away from the screen.
function probe(start, { signal, timeoutMs = 8000 } = {}) {
  return new Promise((resolve) => {
    let finished = false;
    let cleanup = () => {};
    const done = (result) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      signal?.removeEventListener('abort', cancel);
      cleanup();
      resolve(result);
    };
    const cancel = () => done({ status: 'cancelled' });
    const timer = setTimeout(() => done({ status: 'no-data' }), timeoutMs);
    signal?.addEventListener('abort', cancel, { once: true });
    if (signal?.aborted) { cancel(); return; }
    try {
      cleanup = start(done, () => finished) || cleanup;
      if (finished) cleanup();
    } catch (error) {
      done({ status: error.name === 'NotAllowedError' ? 'blocked' : 'error' });
    }
  });
}

export function checkCamera(env = window, options) {
  if (!env.isSecureContext) return Promise.resolve({ status: 'insecure' });
  if (!env.navigator?.mediaDevices?.getUserMedia) return Promise.resolve({ status: 'unavailable' });
  return probe((done) => {
    env.navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false })
      .then((stream) => {
        const live = stream.getVideoTracks().some((track) => track.readyState === 'live');
        stream.getTracks().forEach((track) => track.stop());
        done({ status: live ? 'ready' : 'no-data' });
      }, (error) => done({ status: error.name === 'NotAllowedError' ? 'blocked' :
        error.name === 'NotFoundError' ? 'unavailable' : 'error' }));
  }, options);
}

export function checkLocation(env = window, options) {
  if (!env.isSecureContext) return Promise.resolve({ status: 'insecure' });
  if (!env.navigator?.geolocation) return Promise.resolve({ status: 'unavailable' });
  return probe((done) => {
    env.navigator.geolocation.getCurrentPosition((position) => {
      const { latitude, longitude, accuracy } = position.coords;
      done(Number.isFinite(latitude) && Number.isFinite(longitude) && Number.isFinite(accuracy) && accuracy >= 0
        ? { status: 'ready', accuracyMeters: accuracy } : { status: 'no-data' });
    }, (error) => done({ status: error.code === 1 ? 'blocked' : 'no-data' }),
    { enableHighAccuracy: true, timeout: 7000, maximumAge: 0 });
  }, options);
}

export function checkMotion(env = window, options) {
  if (!env.isSecureContext) return Promise.resolve({ status: 'insecure' });
  if (!env.DeviceMotionEvent) return Promise.resolve({ status: 'unavailable' });
  return probe((done, finished) => {
    let acceleration = false;
    let rotation = false;
    let listening = false;
    const onMotion = (event) => {
      acceleration ||= validVector(event.acceleration, ['x', 'y', 'z']) ||
        validVector(event.accelerationIncludingGravity, ['x', 'y', 'z']);
      rotation ||= validVector(event.rotationRate, ['alpha', 'beta', 'gamma']);
      if (acceleration && rotation) done({ status: 'ready', acceleration, rotation });
    };
    let sampleTimer;
    const listen = () => {
      if (finished()) return;
      env.addEventListener('devicemotion', onMotion);
      listening = true;
      sampleTimer = setTimeout(() => done({ status: acceleration || rotation ? 'partial' : 'no-data',
        acceleration, rotation }), 4000);
    };
    // Must be invoked in the original click call stack, before any await.
    if (typeof env.DeviceMotionEvent.requestPermission === 'function') {
      const permission = env.DeviceMotionEvent.requestPermission();
      Promise.resolve(permission).then((value) => value === 'granted' ? listen() : done({ status: 'blocked' }),
        () => done({ status: 'blocked' }));
    } else listen();
    return () => {
      clearTimeout(sampleTimer);
      if (listening) env.removeEventListener('devicemotion', onMotion);
    };
  }, options);
}
