import Login from './Login';
import Icon from './Icon';
import IconSprite from './IconSprite';

// שער-כניסה: מציגים לפני כל שאר הממשק, לא כמודל-נשלף מכפתור-פרופיל
// — לפי בקשת המשתמש המפורשת, ההתחברות חייבת לקרות *לפני* שמגיעים
// לאפליקציה בכלל, לא אופציונלית-בדיעבד.
export default function AuthGate() {
  return (
    <div className="app auth-gate">
      <IconSprite />
      <header className="app-header">
        <h1>SuperNav AI</h1>
        <p className="app-tagline">ה-Waze של הסופר — MVP הדגמה</p>
      </header>
      <main className="app-main auth-gate-main">
        <div className="auth-gate-hero" aria-hidden="true" />
        <p className="auth-gate-intro">
          <Icon name="family" /> כדי להשתמש באפליקציה יש להתחבר או להירשם.
        </p>
        <Login onDone={() => {}} />
      </main>
    </div>
  );
}
