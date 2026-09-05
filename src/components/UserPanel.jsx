import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../lib/useAuth';
import { logout, updateProfilePhoto } from '../lib/auth';
import { useGroups } from '../lib/useGroups';
import {
  fetchGroups,
  createGroup,
  createInvite,
  joinGroup,
  updateMember,
  removeMember,
  leaveGroup,
  blockGroup,
  updateGroupPhoto,
} from '../lib/groups';
import { PRODUCTS } from '../data/storeData';
import Icon from './Icon';
import CloseButton from './CloseButton';

const CATEGORIES = [...new Set(PRODUCTS.map((p) => p.category))];

const ROLE_LABEL = { admin: 'מנהל/ת', member: 'חבר/ה', restricted: 'מוגבל/ת' };

function MemberRow({ group, member, isMe, canManage }) {
  const [editing, setEditing] = useState(false);
  const [role, setRole] = useState(member.role);
  const [restrictionType, setRestrictionType] = useState(member.restriction?.type || 'none');
  const [categories, setCategories] = useState(member.restriction?.categories || []);
  const [productId, setProductId] = useState(member.restriction?.productId || '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);

  async function save() {
    setBusy(true);
    setError('');
    try {
      let restriction = null;
      if (role === 'restricted') {
        if (restrictionType === 'category') restriction = { type: 'category', categories };
        else if (restrictionType === 'product') restriction = { type: 'product', productId };
      }
      await updateMember(group.id, member.userId, { role, restriction });
      setEditing(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <li className="member-row">
      <div className="member-row-main">
        {member.photo ? (
          <img className="favorite-photo" src={member.photo} alt="" />
        ) : (
          <span className="favorite-photo favorite-photo--empty">{member.emoji}</span>
        )}
        <span className="member-row-info">
          <span className="member-row-name">
            {member.username} {isMe && '(את/ה)'}
          </span>
          <span className="member-row-role">
            {ROLE_LABEL[member.role]}
            {member.role === 'restricted' && member.restriction?.type === 'product' && (
              <> · מוצר יחיד: {PRODUCTS.find((p) => p.id === member.restriction.productId)?.name || '—'}</>
            )}
            {member.role === 'restricted' && member.restriction?.type === 'category' && (
              <> · קטגוריות: {member.restriction.categories.join(', ') || '—'}</>
            )}
          </span>
        </span>
        {canManage && !isMe && <div className="member-actions-menu">
          <button className="btn btn--icon" onClick={() => setMenuOpen((v) => !v)} aria-label={`אפשרויות עבור ${member.username}`} aria-expanded={menuOpen}>⋮</button>
          {menuOpen && <div className="member-actions-popover">
            <button className="btn btn--text btn--small" onClick={() => { setEditing((v) => !v); setMenuOpen(false); }}><Icon name="edit" /> שנה הרשאות</button>
            <button className="btn btn--text btn--small btn--danger" onClick={() => removeMember(group.id, member.userId)}><Icon name="trash" /> הסר מהקבוצה</button>
          </div>}
        </div>}
      </div>

      {editing && (
        <div className="member-edit-form">
          <div className="member-role-choice">
            {['admin', 'member', 'restricted'].map((r) => (
              <label key={r}>
                <input type="radio" checked={role === r} onChange={() => setRole(r)} /> {ROLE_LABEL[r]}
              </label>
            ))}
          </div>

          {role === 'restricted' && (
            <div className="member-restriction-form">
              <div className="member-role-choice">
                <label>
                  <input
                    type="radio"
                    checked={restrictionType === 'category'}
                    onChange={() => setRestrictionType('category')}
                  />{' '}
                  הגבלה לקטגוריות
                </label>
                <label>
                  <input
                    type="radio"
                    checked={restrictionType === 'product'}
                    onChange={() => setRestrictionType('product')}
                  />{' '}
                  הגבלה למוצר יחיד (מצב-ילד)
                </label>
              </div>

              {restrictionType === 'category' && (
                <select
                  multiple
                  className="map-edit-input member-category-select"
                  value={categories}
                  onChange={(e) => setCategories([...e.target.selectedOptions].map((o) => o.value))}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              )}

              {restrictionType === 'product' && (
                <select
                  className="map-edit-input"
                  value={productId}
                  onChange={(e) => setProductId(e.target.value)}
                >
                  <option value="">בחר מוצר…</option>
                  {PRODUCTS.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          {error && (
            <p className="login-error">
              <Icon name="warning" /> {error}
            </p>
          )}

          <div className="map-edit-actions">
            <button className="btn btn--primary btn--small" onClick={save} disabled={busy}>
              <Icon name="check" /> שמור
            </button>
            <button className="btn btn--text btn--small" onClick={() => setEditing(false)}>
              ביטול
            </button>
          </div>
        </div>
      )}
    </li>
  );
}

function GroupCard({ group, myUserId, onSelectGroup, activeGroupId, compact = false, onOpenSettings }) {
  const [inviteLink, setInviteLink] = useState(null);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const groupFileRef = useRef(null);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoError, setPhotoError] = useState('');
  const [inviteRole, setInviteRole] = useState('member');
  const [inviteRestrictionType, setInviteRestrictionType] = useState('category');
  const isAdmin = group.myRole === 'admin';

  if (compact) {
    const isActive = activeGroupId === group.id;
    return (
      <div className={'group-list-row' + (isActive ? ' group-list-row--active' : '')}>
        <button className="group-avatar-button" onClick={() => onOpenSettings?.(group.id)} aria-label={`הגדרות ${group.name}`}>
          {group.photo ? <img className="group-avatar" src={group.photo} alt="" /> : <span className="group-avatar group-avatar--empty"><Icon name="family" /></span>}
        </button>
        <button className="group-list-row__main" onClick={() => onSelectGroup?.(group.id)}>
          <span className="group-list-row__text"><strong>{group.name} {isActive && <em className="group-active-badge">פעילה</em>}</strong><small>{group.members.length} חברים</small></span>
        </button>
        <button className="btn btn--icon" onClick={() => onOpenSettings?.(group.id)} aria-label={`הגדרות ${group.name}`} title="הגדרות קבוצה"><Icon name="gear" /></button>
      </div>
    );
  }

  async function handleInvite() {
    setBusy(true);
    try {
      const restriction = inviteRole === 'restricted' ? { type: inviteRestrictionType, ...(inviteRestrictionType === 'category' ? { categories: CATEGORIES } : { productId: PRODUCTS[0]?.id || '' }) } : null;
      const token = await createInvite(group.id, { role: inviteRole, restriction });
      const url = new URL(window.location.origin + window.location.pathname);
      url.searchParams.set('join', token);
      setInviteLink(url.toString());
      setCopied(false);
    } finally {
      setBusy(false);
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
    } catch {
      /* clipboard חסום — המשתמש יעתיק ידנית מהשדה */
    }
  }

  async function handleGroupPhoto(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setPhotoBusy(true);
    setPhotoError('');
    try {
      const photo = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('לא ניתן לקרוא את התמונה. נסו שוב.'));
        reader.onabort = () => reject(new Error('בחירת התמונה בוטלה.'));
        reader.readAsDataURL(file);
      });
      await updateGroupPhoto(group.id, photo);
    } catch (err) {
      setPhotoError(err.message || 'העלאת תמונת הקבוצה נכשלה. נסו שוב.');
    } finally {
      setPhotoBusy(false);
    }
  }

  return (
    <div className="group-card">
      <div className="group-card-head">
        {group.photo ? <img className="group-avatar" src={group.photo} alt="" /> : <span className="group-avatar group-avatar--empty"><Icon name="family" /></span>}
        <strong>{group.name}</strong>
        <span className="group-card-count">{group.members.length} חברים</span>
      </div>
      <button className="btn btn--ghost btn--small group-photo-button" onClick={() => groupFileRef.current?.click()} disabled={photoBusy}>
        <Icon name="camera" /> {photoBusy ? 'מעלה תמונה…' : group.photo ? 'החלפת תמונת קבוצה' : 'הוספת תמונת קבוצה'}
      </button>
      <input ref={groupFileRef} type="file" accept="image/*" hidden onChange={handleGroupPhoto} />
      {photoError && <p className="login-error" role="alert">{photoError}</p>}
      <button className="btn btn--primary btn--small" onClick={() => onSelectGroup?.(group.id)}>
        {activeGroupId === group.id ? 'הקבוצה הפעילה' : 'פתח דף בית של הקבוצה'}
      </button>

      <ul className="member-list">
        {group.members.map((m) => (
          <MemberRow key={m.userId} group={group} member={m} isMe={m.userId === myUserId} canManage={isAdmin} />
        ))}
      </ul>

      {isAdmin && (
        <div className="group-invite-row">
          <select className="map-edit-input" value={inviteRole} onChange={(e) => setInviteRole(e.target.value)} aria-label="הרשאת חבר חדש">
            <option value="member">חבר רגיל</option><option value="admin">מנהל</option><option value="restricted">מוגבל</option>
          </select>
          {inviteRole === 'restricted' && <select className="map-edit-input" value={inviteRestrictionType} onChange={(e) => setInviteRestrictionType(e.target.value)} aria-label="סוג הגבלה"><option value="category">קטגוריות</option><option value="product">מוצר יחיד</option></select>}
          <button className="btn btn--ghost btn--small" onClick={handleInvite} disabled={busy}>
            <Icon name="family" /> צור קישור-הזמנה
          </button>
          {inviteLink && (
            <div className="group-invite-link-row">
              <input className="map-edit-input" readOnly value={inviteLink} onFocus={(e) => e.target.select()} />
              <button className="btn btn--ghost btn--small" onClick={copyLink}>
                {copied ? 'הועתק!' : 'העתק'}
              </button>
            </div>
          )}
        </div>
      )}

      <div className="group-card-actions">
        <button className="btn btn--text btn--small" onClick={() => leaveGroup(group.id)}>
          עזוב קבוצה
        </button>
        <button className="btn btn--text btn--small btn--danger" onClick={() => blockGroup(group.id)}>
          חסום קבוצה
        </button>
      </div>
    </div>
  );
}

export default function UserPanel({ onClose, onSelectGroup, activeGroupId }) {
  const { user } = useAuth();
  const groups = useGroups();
  const fileInputRef = useRef(null);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoError, setPhotoError] = useState('');
  const [newGroupName, setNewGroupName] = useState('');
  const [creating, setCreating] = useState(false);
  const [joinToken, setJoinToken] = useState('');
  const [joinBusy, setJoinBusy] = useState(false);
  const [joinError, setJoinError] = useState('');
  const [settingsGroupId, setSettingsGroupId] = useState(null);
  const [groupsLoading, setGroupsLoading] = useState(false);
  const [groupsError, setGroupsError] = useState('');
  const settingsGroup = groups.find((group) => group.id === settingsGroupId) || null;

  useEffect(() => {
    if (!user) return;
    setGroupsLoading(true);
    setGroupsError('');
    fetchGroups().catch((err) => setGroupsError(err?.message || 'לא ניתן לטעון את הקבוצות כרגע')).finally(() => setGroupsLoading(false));
  }, [user]);

  async function handlePhotoChange(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || photoBusy) return;
    setPhotoBusy(true);
    setPhotoError('');
    try {
      const photo = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('לא ניתן לקרוא את התמונה. נסו שוב.'));
        reader.onabort = () => reject(new Error('קריאת התמונה בוטלה. נסו שוב.'));
        reader.readAsDataURL(file);
      });
      await updateProfilePhoto(photo);
    } catch (err) {
      setPhotoError(err.message || 'העלאת התמונה נכשלה. נסו שוב.');
    } finally {
      setPhotoBusy(false);
    }
  }

  async function handleCreateGroup() {
    if (!newGroupName.trim()) return;
    setCreating(true);
    try {
      await createGroup(newGroupName.trim());
      setNewGroupName('');
    } finally {
      setCreating(false);
    }
  }

  async function handleJoin() {
    if (!joinToken.trim()) return;
    setJoinBusy(true);
    setJoinError('');
    try {
      await joinGroup(joinToken.trim());
      setJoinToken('');
    } catch (err) {
      setJoinError(err.message);
    } finally {
      setJoinBusy(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal user-panel-modal" onClick={(e) => e.stopPropagation()}>
        <CloseButton onClick={onClose} />

        <h2>
          <Icon name="family" /> משתמש וקבוצות-קניות
        </h2>
        <div className="user-profile-row">
              {user.photo ? (
                <img className="favorite-photo" src={user.photo} alt="" />
              ) : (
                <span className="favorite-photo favorite-photo--empty">{user.emoji}</span>
              )}
              <span className="user-profile-info">
                <strong>{user.username}</strong>
              </span>
              <button className="btn btn--ghost btn--small" onClick={() => fileInputRef.current?.click()} disabled={photoBusy}>
                <Icon name="camera" /> {photoBusy ? 'מעלה תמונה…' : 'תמונת פרופיל'}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                style={{ display: 'none' }}
                onChange={handlePhotoChange}
                disabled={photoBusy}
              />
              <button className="btn btn--text btn--small" onClick={logout}>
                <Icon name="door" /> התנתק
              </button>
            </div>

            {photoError && <p className="login-error" role="alert">{photoError}</p>}

            {settingsGroup ? (
              <section className="settings-section group-settings-view">
                <button className="btn btn--text btn--small" onClick={() => setSettingsGroupId(null)}>חזרה לקבוצות</button>
                <h3>הגדרות: {settingsGroup.name}</h3>
                <p className="settings-hint">{settingsGroup.members.length} חברים · ההרשאה שלך: {ROLE_LABEL[settingsGroup.myRole] || 'חבר/ה'}</p>
                <GroupCard group={settingsGroup} myUserId={user.id} onSelectGroup={onSelectGroup} activeGroupId={activeGroupId} />
              </section>
            ) : <>
            <section className="settings-section">
              <h3>הצטרפות לקבוצה עם קישור/קוד</h3>
              <div className="group-invite-link-row">
                <input
                  className="map-edit-input"
                  placeholder="הדבק כאן קוד-הזמנה"
                  value={joinToken}
                  onChange={(e) => setJoinToken(e.target.value)}
                />
                <button className="btn btn--ghost btn--small" onClick={handleJoin} disabled={joinBusy}>
                  הצטרף
                </button>
              </div>
              {joinError && (
                <p className="login-error">
                  <Icon name="warning" /> {joinError}
                </p>
              )}
            </section>

            <section className="settings-section">
              <h3>הקבוצות שלי ({groups.length})</h3>
              <button className="btn btn--ghost" onClick={() => onSelectGroup?.(null)}>
                <Icon name="home" /> הרשימה שלי
              </button>
              {groupsLoading && <p className="settings-hint">טוען קבוצות…</p>}
              {groupsError && <p className="login-error" role="alert"><Icon name="warning" /> {groupsError} <button className="btn btn--text btn--small" onClick={() => fetchGroups().catch((err) => setGroupsError(err?.message || 'טעינת הקבוצות נכשלה'))}>נסה שוב</button></p>}
              {!groupsLoading && !groupsError && groups.length === 0 && <p className="empty-hint">אין לך עדיין קבוצות-קניות.</p>}
              {groups.map((g) => (
                <GroupCard key={g.id} group={g} myUserId={user.id} onSelectGroup={onSelectGroup} activeGroupId={activeGroupId} compact onOpenSettings={setSettingsGroupId} />
              ))}

              <div className="group-invite-link-row">
                <input
                  className="map-edit-input"
                  placeholder="שם קבוצה חדשה (למשל: קניות המשפחה)"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                />
                <button className="btn btn--primary btn--small" onClick={handleCreateGroup} disabled={creating}>
                  <Icon name="plus" /> צור קבוצה
                </button>
              </div>
            </section>
            </>}
      </div>
    </div>
  );
}
