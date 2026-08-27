import { useEffect, useState } from 'react';
import { useAuth } from '../lib/useAuth';
import { joinGroup } from '../lib/groups';
import UserPanel from './UserPanel';
import Icon from './Icon';

const PROMPT_SEEN_KEY = 'supernav_login_prompt_seen';

export default function UserButton() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);

  // מציגים את מסך ההתחברות מיד עם כניסה לאפליקציה, לפני שממשיכים
  // הלאה — לא רק כשלוחצים על כפתור המשתמש. פעם אחת בלבד לדפדפן: אחרי
  // שנסגר (בין אם התחברו ובין אם דילגו) לא נדחוף את זה שוב בכל טעינה,
  // ההתחברות עדיין נשארת אופציונלית.
  useEffect(() => {
    if (user) return;
    let seen = true;
    try {
      seen = localStorage.getItem(PROMPT_SEEN_KEY) === '1';
    } catch {
      /* אחסון חסום — פשוט לא נציג פעם נוספת בסשן הזה */
    }
    if (!seen) setOpen(true);
  }, [user]);

  function handleClose() {
    setOpen(false);
    try {
      localStorage.setItem(PROMPT_SEEN_KEY, '1');
    } catch {
      /* אחסון חסום — מתעלמים */
    }
  }

  // הצטרפות-אוטומטית כשנכנסים לאפליקציה עם קישור-הזמנה (?join=TOKEN,
  // ר' UserPanel.jsx GroupCard.handleInvite) — פותח את הפאנל כדי
  // שהתהליך (כולל התחברות/הרשמה אם צריך) יהיה גלוי למשתמש.
  useEffect(() => {
    const url = new URL(window.location.href);
    const token = url.searchParams.get('join');
    if (!token) return;
    setOpen(true);
    if (user) {
      joinGroup(token).catch(() => {});
      url.searchParams.delete('join');
      window.history.replaceState({}, '', url.toString());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  return (
    <>
      <button
        className="user-btn"
        onClick={() => setOpen(true)}
        aria-label="משתמש וקבוצות-קניות"
      >
        {user?.photo ? (
          <img className="user-btn-photo" src={user.photo} alt="" />
        ) : user ? (
          <span className="user-btn-emoji">{user.emoji}</span>
        ) : (
          <Icon name="family" />
        )}
      </button>
      {open && <UserPanel onClose={handleClose} />}
    </>
  );
}
