import { useEffect, useState } from 'react';
import { useAuth } from '../lib/useAuth';
import { joinGroup } from '../lib/groups';
import UserPanel from './UserPanel';
import Icon from './Icon';

export default function UserButton() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);

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
      {open && <UserPanel onClose={() => setOpen(false)} />}
    </>
  );
}
