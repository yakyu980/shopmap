import { useEffect, useState } from 'react';
import { useAuth } from '../lib/useAuth';
import { joinGroup } from '../lib/groups';
import UserPanel from './UserPanel';

// תמיד רץ בתוך App.jsx *אחרי* AuthGate.jsx — כלומר user תמיד מוגדר
// כאן, ההתחברות כבר קרתה לפני שהגענו לממשק.
export default function UserButton({ onSelectGroup, activeGroupId }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);

  // הצטרפות-אוטומטית כשנכנסים לאפליקציה עם קישור-הזמנה (?join=TOKEN,
  // ר' UserPanel.jsx GroupCard.handleInvite).
  useEffect(() => {
    const url = new URL(window.location.href);
    const token = url.searchParams.get('join');
    if (!token) return;
    setOpen(true);
    joinGroup(token).catch(() => {});
    url.searchParams.delete('join');
    window.history.replaceState({}, '', url.toString());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <button
        className="user-btn"
        onClick={() => setOpen(true)}
        aria-label="משתמש וקבוצות-קניות"
      >
        {user.photo ? (
          <img className="user-btn-photo" src={user.photo} alt="" />
        ) : (
          <span className="user-btn-emoji">{user.emoji}</span>
        )}
      </button>
      {open && <UserPanel onClose={() => setOpen(false)} onSelectGroup={(groupId) => { onSelectGroup?.(groupId); setOpen(false); }} activeGroupId={activeGroupId} />}
    </>
  );
}
