import { useState } from 'react';
import { login, register } from '../lib/auth';
import Icon from './Icon';

export default function Login({ onDone }) {
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [householdMode, setHouseholdMode] = useState('create'); // 'create' | 'join'
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [householdName, setHouseholdName] = useState('');
  const [householdCode, setHouseholdCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      if (mode === 'login') {
        await login({ username, password });
      } else {
        await register({
          username,
          password,
          mode: householdMode,
          householdName,
          householdCode,
        });
      }
      onDone?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-hero">
        <div className="login-brand">
          <span className="login-brand-icon">
            <Icon name="compass" />
          </span>
          <span className="login-brand-title">SuperNav</span>
        </div>
        <div className="login-hero-route">
          <span className="login-pin">
            <Icon name="basket" solid />
          </span>
          <span className="login-pin">
            <Icon name="milk" solid />
          </span>
          <span className="login-pin">
            <Icon name="bread" solid />
          </span>
          <span className="login-pin login-pin--accent">
            <Icon name="store" />
          </span>
        </div>
      </div>

      <p className="login-explain">
        ההתחברות אופציונלית — האפליקציה ממשיכה לעבוד בלי זה בדיוק כמו היום.
        מתחברים רק כדי לשתף בין מכשירים: בני-משפחה, מיקומי-מוצרים ומחירים
        שכולם רואים.
      </p>

      <div className="login-tabs">
        <button
          className={'login-tab' + (mode === 'login' ? ' login-tab--active' : '')}
          onClick={() => setMode('login')}
          type="button"
        >
          התחברות
        </button>
        <button
          className={'login-tab' + (mode === 'register' ? ' login-tab--active' : '')}
          onClick={() => setMode('register')}
          type="button"
        >
          הרשמה
        </button>
      </div>

      <form className="login-form" onSubmit={submit}>
        <div className="login-input-wrap">
          <Icon name="user" className="login-input-icon" />
          <input
            className="login-input"
            placeholder="שם-משתמש"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
          />
        </div>

        <div className="login-input-wrap">
          <Icon name="lock" className="login-input-icon" />
          <input
            className="login-input"
            type={showPassword ? 'text' : 'password'}
            placeholder="סיסמה"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          />
          <button
            className="login-input-toggle"
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? 'הסתר סיסמה' : 'הצג סיסמה'}
          >
            <Icon name={showPassword ? 'eye-off' : 'eye'} />
          </button>
        </div>

        {mode === 'register' && (
          <>
            <div className="login-household-mode">
              <label>
                <input
                  type="radio"
                  checked={householdMode === 'create'}
                  onChange={() => setHouseholdMode('create')}
                />
                צור משפחה חדשה
              </label>
              <label>
                <input
                  type="radio"
                  checked={householdMode === 'join'}
                  onChange={() => setHouseholdMode('join')}
                />
                הצטרף למשפחה קיימת (עם קוד)
              </label>
            </div>

            {householdMode === 'create' ? (
              <input
                className="map-edit-input"
                placeholder="שם המשפחה (למשל: משפחת כהן)"
                value={householdName}
                onChange={(e) => setHouseholdName(e.target.value)}
              />
            ) : (
              <input
                className="map-edit-input"
                placeholder="קוד-משפחה (קיבלת מבן-משפחה אחר)"
                value={householdCode}
                onChange={(e) => setHouseholdCode(e.target.value.toUpperCase())}
              />
            )}
          </>
        )}

        {error && (
          <p className="login-error">
            <Icon name="warning" /> {error}
          </p>
        )}

        <button className="btn btn--primary login-submit" type="submit" disabled={busy}>
          {busy ? 'רק רגע…' : mode === 'login' ? 'התחבר' : 'הרשמה'}
        </button>
      </form>
    </div>
  );
}
