import { useState } from 'react';
import { login, register, fetchSecurityQuestion, resetPassword } from '../lib/auth';
import Icon from './Icon';

const SECURITY_QUESTIONS = [
  'מה שם חיית המחמד הראשונה שלך?',
  'מה שם בית הספר היסודי שלמדת בו?',
  'מה המאכל האהוב עליך?',
  'מה שם העיר שבה נולדת?',
];

function ForgotPassword({ onDone, onCancel }) {
  const [step, setStep] = useState('username'); // 'username' | 'answer'
  const [username, setUsername] = useState('');
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleFindUser(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const q = await fetchSecurityQuestion(username);
      setQuestion(q);
      setStep('answer');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleReset(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await resetPassword({ username, securityAnswer: answer, newPassword });
      onDone?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="login-form" onSubmit={step === 'username' ? handleFindUser : handleReset}>
      <p className="login-explain">שחזור סיסמה לפי שאלת-האבטחה שקבעת בהרשמה.</p>

      <input
        className="map-edit-input"
        placeholder="שם-משתמש"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        autoComplete="username"
        disabled={step === 'answer'}
      />

      {step === 'answer' && (
        <>
          <p className="login-security-question">
            <Icon name="warning" /> {question}
          </p>
          <input
            className="map-edit-input"
            placeholder="תשובה"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
          />
          <input
            className="map-edit-input"
            type="password"
            placeholder="סיסמה חדשה"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            autoComplete="new-password"
          />
        </>
      )}

      {error && (
        <p className="login-error">
          <Icon name="warning" /> {error}
        </p>
      )}

      <button className="btn btn--primary" type="submit" disabled={busy}>
        {busy ? 'רק רגע…' : step === 'username' ? 'המשך' : 'אפס סיסמה והתחבר'}
      </button>
      <button className="btn btn--text" type="button" onClick={onCancel}>
        <Icon name="arrow-left" /> חזרה להתחברות
      </button>
    </form>
  );
}

export default function Login({ onDone }) {
  const [mode, setMode] = useState('login'); // 'login' | 'register' | 'forgot'
  const [householdMode, setHouseholdMode] = useState('create'); // 'create' | 'join'
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [householdName, setHouseholdName] = useState('');
  const [householdCode, setHouseholdCode] = useState('');
  const [securityQuestion, setSecurityQuestion] = useState(SECURITY_QUESTIONS[0]);
  const [securityAnswer, setSecurityAnswer] = useState('');
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
          securityQuestion,
          securityAnswer,
        });
      }
      onDone?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (mode === 'forgot') {
    return (
      <div className="login-page">
        <ForgotPassword onDone={() => onDone?.()} onCancel={() => setMode('login')} />
      </div>
    );
  }

  return (
    <div className="login-page">
      <p className="login-explain">
        התחברות/הרשמה נדרשת כדי להשתמש באפליקציה — כדי לשתף בין מכשירים:
        קבוצות-קניות, מיקומי-מוצרים ומחירים שכולם רואים.
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
        <input
          className="map-edit-input"
          placeholder="שם-משתמש"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoComplete="username"
        />
        <input
          className="map-edit-input"
          type="password"
          placeholder="סיסמה"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
        />

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

            <select
              className="map-edit-input"
              value={securityQuestion}
              onChange={(e) => setSecurityQuestion(e.target.value)}
            >
              {SECURITY_QUESTIONS.map((q) => (
                <option key={q} value={q}>
                  {q}
                </option>
              ))}
            </select>
            <input
              className="map-edit-input"
              placeholder="תשובה (לשחזור סיסמה בעתיד)"
              value={securityAnswer}
              onChange={(e) => setSecurityAnswer(e.target.value)}
            />
          </>
        )}

        {error && (
          <p className="login-error">
            <Icon name="warning" /> {error}
          </p>
        )}

        <button className="btn btn--primary" type="submit" disabled={busy}>
          {busy ? 'רק רגע…' : mode === 'login' ? 'התחבר' : 'הרשמה'}
        </button>
        {mode === 'login' && (
          <button className="btn btn--text" type="button" onClick={() => setMode('forgot')}>
            שכחתי סיסמה
          </button>
        )}
      </form>
    </div>
  );
}
