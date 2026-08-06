import { useState } from 'react';
import { useFamilyMembers } from '../lib/useFamilyMembers';
import { addMember, removeMember, setActiveMember } from '../lib/familyMembers';
import { useAuth } from '../lib/useAuth';

export default function FamilyManager() {
  const family = useFamilyMembers();
  const { user, household } = useAuth();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('');

  function handleAdd() {
    if (!name.trim()) return;
    addMember(name, emoji);
    setName('');
    setEmoji('');
  }

  return (
    <div className="family-manager">
      <button className="btn btn--ghost btn--small family-toggle" onClick={() => setOpen((v) => !v)}>
        👨‍👩‍👧 משפחה {family.members.length > 0 ? `(${family.members.length})` : ''}
      </button>

      {open && (
        <div className="family-panel">
          {user ? (
            <p className="family-disclaimer">
              מסונכרן מהשרת — משפחת "{household?.name}". הוסיפו בן-משפחה חדש שיירשם עם קוד{' '}
              <code>{household?.joinCode}</code> (⚙️ הגדרות).
            </p>
          ) : (
            <p className="family-disclaimer">
              מקומי בלבד — לא מסונכרן בין מכשירים. 💡 התחברו (⚙️ הגדרות) כדי לשתף בין מכשירים.
            </p>
          )}

          {family.members.length > 0 && (
            <ul className="family-member-list">
              {family.members.map((m) => (
                <li
                  key={m.id}
                  className={
                    'family-member-row' + (family.activeMemberId === m.id ? ' family-member-row--active' : '')
                  }
                >
                  <button
                    className="family-member-select"
                    onClick={() => setActiveMember(family.activeMemberId === m.id ? null : m.id)}
                    title="קבע כ'מי אני'"
                  >
                    {family.activeMemberId === m.id ? '✓ ' : ''}
                    {m.emoji} {m.name}
                  </button>
                  {!user && (
                    <button
                      className="btn btn--icon btn--danger"
                      onClick={() => removeMember(m.id)}
                      aria-label="הסר"
                    >
                      🗑️
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}

          {!user && (
            <div className="family-add-row">
              <input
                className="map-edit-input"
                type="text"
                placeholder="שם (למשל: אבא)"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              />
              <input
                className="map-edit-input map-edit-input--icon"
                type="text"
                placeholder="🙂"
                value={emoji}
                onChange={(e) => setEmoji(e.target.value)}
                maxLength={4}
              />
              <button className="btn btn--primary btn--small" onClick={handleAdd}>
                ➕ הוסף
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
