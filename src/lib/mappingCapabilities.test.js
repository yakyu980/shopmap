import test from 'node:test';
import assert from 'node:assert/strict';
import { browserProfile, checkCamera, checkLocation, checkMotion, validVector } from './mappingCapabilities.js';

function motionEnv() {
  const events = new EventTarget();
  return { isSecureContext: true, DeviceMotionEvent: {},
    addEventListener: events.addEventListener.bind(events), removeEventListener: events.removeEventListener.bind(events),
    emit(data) { const event = new Event('devicemotion'); Object.assign(event, data); events.dispatchEvent(event); } };
}

test('desktop-like iPad UA is a display hint, not a sensor capability claim', () => {
  assert.equal(browserProfile({ navigator: { userAgent: 'Macintosh', maxTouchPoints: 5 } }).platform, 'iOS / iPadOS');
  assert.equal(browserProfile({ navigator: { userAgent: 'Windows', maxTouchPoints: 10 } }).platform, 'Windows');
});
test('zero is valid data; null, missing axes and NaN are not', () => {
  assert.equal(validVector({ x: 0, y: 0, z: 0 }, ['x', 'y', 'z']), true);
  for (const vector of [null, { x: null, y: null, z: null }, { x: 1 }, { x: NaN, y: 0, z: 0 }])
    assert.equal(validVector(vector, ['x', 'y', 'z']), false);
});
test('API presence and empty motion events do not prove a sensor is working', async () => {
  const env = motionEnv();
  const result = checkMotion(env, { timeoutMs: 15 });
  env.emit({ acceleration: { x: null, y: null, z: null }, rotationRate: null });
  assert.equal((await result).status, 'no-data');
});
test('permission requested synchronously; zero-valued measurements prove both channels', async () => {
  const env = motionEnv();
  let called = false;
  env.DeviceMotionEvent.requestPermission = () => { called = true; return Promise.resolve('granted'); };
  const result = checkMotion(env);
  assert.equal(called, true);
  await Promise.resolve();
  env.emit({ acceleration: { x: 0, y: 0, z: 0 }, rotationRate: { alpha: 0, beta: 0, gamma: 0 } });
  assert.deepEqual(await result, { status: 'ready', acceleration: true, rotation: true });
});
test('permission denial remains distinct from unavailable data', async () => {
  const env = motionEnv();
  env.DeviceMotionEvent.requestPermission = () => Promise.resolve('denied');
  assert.equal((await checkMotion(env)).status, 'blocked');
});
test('aborting while permission is pending never attaches a listener', async () => {
  const env = motionEnv();
  let grant;
  let listeners = 0;
  env.addEventListener = () => listeners++;
  env.DeviceMotionEvent.requestPermission = () => new Promise((resolve) => { grant = resolve; });
  const controller = new AbortController();
  const result = checkMotion(env, { signal: controller.signal });
  controller.abort();
  grant('granted');
  assert.equal((await result).status, 'cancelled');
  await Promise.resolve();
  assert.equal(listeners, 0);
});
test('late camera stream after timeout is stopped', async () => {
  let deliver;
  let stopped = 0;
  const env = { isSecureContext: true, navigator: { mediaDevices: {
    getUserMedia: () => new Promise((resolve) => { deliver = resolve; }),
  } } };
  assert.equal((await checkCamera(env, { timeoutMs: 10 })).status, 'no-data');
  deliver({ getVideoTracks: () => [{ readyState: 'live' }], getTracks: () => [{ stop: () => stopped++ }] });
  await Promise.resolve();
  assert.equal(stopped, 1);
});
test('location reports accuracy without retaining coordinates or asserting GPS', async () => {
  const env = { isSecureContext: true, navigator: { geolocation: {
    getCurrentPosition: (success) => success({ coords: { latitude: 32, longitude: 35, accuracy: 350 } }),
  } } };
  assert.deepEqual(await checkLocation(env), { status: 'ready', accuracyMeters: 350 });
});
test('insecure context does not request permissions', async () => {
  const env = { isSecureContext: false };
  for (const check of [checkCamera, checkLocation, checkMotion])
    assert.equal((await check(env)).status, 'insecure');
});
