import { useState } from 'react';
import { PRODUCTS } from '../data/storeData';
import { useStoreConfig } from '../lib/useStoreConfig';
import Icon from './Icon';
import DeptIcon from './DeptIcon';
import CheckpointQrModal from './CheckpointQrModal';
import {
  addCheckpoint,
  addDepartment,
  addFloor,
  clearDepartmentGps,
  getStoreConfig,
  moveDepartment,
  removeCheckpoint,
  removeDepartment,
  renameDepartment,
  resetStoreConfig,
  resizeGrid,
  setDepartmentGps,
  updateStoreConfig,
  MAX_GRID_SIZE,
  MAX_FLOORS,
} from '../lib/storeConfig';

export default function StoreMap({ activeDeptId, currentCheckpointId }) {
  const config = useStoreConfig();
  const [activeFloor, setActiveFloor] = useState(config.floors[0].id);
  const [editMode, setEditMode] = useState(false);
  const [editingCell, setEditingCell] = useState(null); // {x,y,dept|null}
  const [moveSourceId, setMoveSourceId] = useState(null);
  const [formName, setFormName] = useState('');
  const [formIcon, setFormIcon] = useState('');
  const [hint, setHint] = useState('');
  const [gpsBusy, setGpsBusy] = useState(false);
  const [checkpointMode, setCheckpointMode] = useState(false);
  const [qrCheckpoint, setQrCheckpoint] = useState(null);
  const [newFloorName, setNewFloorName] = useState('');

  // אם הקומה-הפעילה נמחקה-בטעות בגרסה ישנה יותר (לא אמור לקרות —
  // אין כרגע מחיקת-קומה, רק הגנה עתידית) — נופלים לקומה הראשונה.
  const floorValid = config.floors.some((f) => f.id === activeFloor);
  const effectiveFloor = floorValid ? activeFloor : config.floors[0].id;

  function showHint(text) {
    setHint(text);
    setTimeout(() => setHint(''), 3500);
  }

  function openCell(x, y, dept) {
    if (!editMode) return;
    if (checkpointMode) {
      const res = addCheckpoint(getStoreConfig(), { floor: effectiveFloor, x, y });
      if (res.ok) {
        updateStoreConfig(() => res.config);
        const added = res.config.checkpoints[res.config.checkpoints.length - 1];
        setQrCheckpoint(added);
      }
      return;
    }
    if (moveSourceId) {
      if (dept) return;
      const res = moveDepartment(getStoreConfig(), moveSourceId, x, y, effectiveFloor);
      if (res.ok) updateStoreConfig(() => res.config);
      else showHint(res.reason);
      setMoveSourceId(null);
      return;
    }
    setEditingCell({ x, y, dept: dept || null });
    setFormName(dept ? dept.name : '');
    setFormIcon(dept ? dept.icon : '');
  }

  function handleSave() {
    const cfg = getStoreConfig();
    const res = editingCell.dept
      ? renameDepartment(cfg, editingCell.dept.id, { name: formName, icon: formIcon })
      : addDepartment(cfg, { name: formName, icon: formIcon, x: editingCell.x, y: editingCell.y, floor: effectiveFloor });
    if (res.ok) {
      updateStoreConfig(() => res.config);
      setEditingCell(null);
    } else {
      showHint(res.reason);
    }
  }

  function handleAddFloor() {
    const res = addFloor(getStoreConfig(), newFloorName);
    if (res.ok) {
      updateStoreConfig(() => res.config);
      setActiveFloor(res.config.floors[res.config.floors.length - 1].id);
      setNewFloorName('');
    } else {
      showHint(res.reason);
    }
  }

  function handleRemoveCheckpoint(id) {
    updateStoreConfig(() => removeCheckpoint(getStoreConfig(), id).config);
  }

  function handleDelete() {
    const res = removeDepartment(getStoreConfig(), editingCell.dept.id, PRODUCTS);
    if (res.ok) {
      updateStoreConfig(() => res.config);
      setEditingCell(null);
    } else {
      showHint(res.reason);
    }
  }

  function handleResize(dim, delta) {
    const cols = dim === 'cols' ? config.gridCols + delta : config.gridCols;
    const rows = dim === 'rows' ? config.gridRows + delta : config.gridRows;
    const res = resizeGrid(getStoreConfig(), { cols, rows });
    if (res.ok) updateStoreConfig(() => res.config);
    else showHint(res.reason);
  }

  function handleSetGps(deptId) {
    if (!navigator.geolocation) {
      showHint('GPS לא נתמך בדפדפן הזה');
      return;
    }
    setGpsBusy(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGpsBusy(false);
        const res = setDepartmentGps(getStoreConfig(), deptId, {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
        if (res.ok) {
          updateStoreConfig(() => res.config);
          showHint(`📍 GPS נקבע (דיוק ~${Math.round(pos.coords.accuracy)} מ')`);
        } else {
          showHint(res.reason);
        }
      },
      (err) => {
        setGpsBusy(false);
        showHint('לא ניתן לקבל מיקום-GPS: ' + (err.message || 'שגיאה'));
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  function handleClearGps(deptId) {
    const res = clearDepartmentGps(getStoreConfig(), deptId);
    if (res.ok) updateStoreConfig(() => res.config);
  }

  function handleReset() {
    if (window.confirm('לאפס את מפת החנות למצב ברירת-המחדל? כל העריכות שלך יימחקו.')) {
      resetStoreConfig();
      setEditingCell(null);
      setMoveSourceId(null);
    }
  }

  const cells = [];
  for (let y = 0; y < config.gridRows; y++) {
    for (let x = 0; x < config.gridCols; x++) {
      const dept = config.departments.find((d) => d.x === x && d.y === y && d.floor === effectiveFloor);
      const checkpoint = config.checkpoints.find((c) => c.x === x && c.y === y && c.floor === effectiveFloor);
      cells.push({ x, y, dept, checkpoint });
    }
  }

  return (
    <div className="store-map store-map--satellite">
      {config.floors.length > 1 && (
        <div className="floor-switcher" role="tablist" aria-label="קומות">
          {config.floors.map((f) => (
            <button
              key={f.id}
              role="tab"
              aria-selected={f.id === effectiveFloor}
              className={'floor-tab' + (f.id === effectiveFloor ? ' floor-tab--active' : '')}
              onClick={() => setActiveFloor(f.id)}
            >
              {f.name}
            </button>
          ))}
        </div>
      )}

      <div className="store-map-toolbar">
        <button
          className={'btn btn--small' + (editMode ? ' btn--primary' : ' btn--ghost')}
          onClick={() => {
            setEditMode((v) => !v);
            setEditingCell(null);
            setMoveSourceId(null);
            setCheckpointMode(false);
          }}
        >
          <Icon name="edit" /> ערוך מפה
        </button>
        {editMode && (
          <div className="store-map-grid-controls">
            <span>עמודות</span>
            <button className="btn btn--icon btn--small" onClick={() => handleResize('cols', -1)}>
              <Icon name="minus" />
            </button>
            <button
              className="btn btn--icon btn--small"
              onClick={() => handleResize('cols', 1)}
              disabled={config.gridCols >= MAX_GRID_SIZE}
            >
              <Icon name="plus" />
            </button>
            <span>שורות</span>
            <button className="btn btn--icon btn--small" onClick={() => handleResize('rows', -1)}>
              <Icon name="minus" />
            </button>
            <button
              className="btn btn--icon btn--small"
              onClick={() => handleResize('rows', 1)}
              disabled={config.gridRows >= MAX_GRID_SIZE}
            >
              <Icon name="plus" />
            </button>
            <button
              className={'btn btn--small' + (checkpointMode ? ' btn--primary' : ' btn--ghost')}
              onClick={() => {
                setCheckpointMode((v) => !v);
                setEditingCell(null);
                setMoveSourceId(null);
              }}
            >
              <Icon name="pin" /> {checkpointMode ? 'לוחצים על תא להוספת צ׳ק-פוינט' : 'הוסף צ׳ק-פוינט'}
            </button>
            <button className="btn btn--text btn--small" onClick={handleReset}>
              <Icon name="reset" /> אפס למצב ברירת-מחדל
            </button>
          </div>
        )}
        {editMode && config.floors.length < MAX_FLOORS && (
          <div className="store-map-grid-controls">
            <input
              className="floor-name-input"
              placeholder="שם קומה חדשה (למשל קומה 1)"
              value={newFloorName}
              onChange={(e) => setNewFloorName(e.target.value)}
            />
            <button className="btn btn--ghost btn--small" onClick={handleAddFloor}>
              <Icon name="plus" /> הוסף קומה
            </button>
          </div>
        )}
      </div>

      {moveSourceId && (
        <p className="map-move-hint">
          <Icon name="pin" /> בחר תא ריק להעברת "
          {config.departments.find((d) => d.id === moveSourceId)?.name}"
          אליו
          <button className="btn btn--text btn--small" onClick={() => setMoveSourceId(null)}>
            ביטול
          </button>
        </p>
      )}
      {hint && <p className="map-edit-hint">{hint}</p>}

      <div
        className="store-map-grid"
        style={{
          gridTemplateColumns: `repeat(${config.gridCols}, 1fr)`,
          gridTemplateRows: `repeat(${config.gridRows}, 1fr)`,
        }}
      >
        {cells.map(({ x, y, dept, checkpoint }) => {
          if (!dept && !checkpoint && !editMode) return null;
          const isHere = checkpoint && checkpoint.id === currentCheckpointId;
          return (
            <div
              key={`${x}-${y}`}
              className={
                'store-map-cell' +
                (dept?.fixed ? ' store-map-cell--fixed' : '') +
                (dept?.id === activeDeptId ? ' store-map-cell--active' : '') +
                (!dept ? ' store-map-cell--empty' : '') +
                (editMode ? ' store-map-cell--editable' : '') +
                (isHere ? ' store-map-cell--here' : '')
              }
              style={{ gridColumn: x + 1, gridRow: y + 1 }}
              onClick={() => openCell(x, y, dept)}
              role={editMode ? 'button' : undefined}
              tabIndex={editMode ? 0 : undefined}
            >
              {dept ? (
                <>
                  <span className="store-map-icon">
                    <DeptIcon dept={dept} />
                  </span>
                  <span className="store-map-name">{dept.name}</span>
                </>
              ) : (
                editMode &&
                !checkpoint && (
                  <span className="store-map-add">
                    <Icon name="plus" />
                  </span>
                )
              )}
              {checkpoint && (
                <span className="store-map-checkpoint" title={`צ'ק-פוינט ${checkpoint.code}`}>
                  <Icon name="pin" />
                  {editMode && (
                    <span className="checkpoint-cell-actions">
                      <button
                        className="btn btn--icon btn--small"
                        onClick={(e) => {
                          e.stopPropagation();
                          setQrCheckpoint(checkpoint);
                        }}
                        aria-label="הצג QR"
                      >
                        <Icon name="receipt" />
                      </button>
                      <button
                        className="btn btn--icon btn--small btn--danger"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveCheckpoint(checkpoint.id);
                        }}
                        aria-label="מחק צ'ק-פוינט"
                      >
                        <Icon name="trash" />
                      </button>
                    </span>
                  )}
                  {isHere && <span className="store-map-here-label">אתה כאן</span>}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {editingCell &&
        (() => {
          const liveDept = editingCell.dept
            ? config.departments.find((d) => d.id === editingCell.dept.id)
            : null;
          return (
        <div className="map-edit-form">
          <input
            className="map-edit-input"
            type="text"
            placeholder="שם מחלקה"
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
          />
          <input
            className="map-edit-input map-edit-input--icon"
            type="text"
            placeholder="🏷️"
            value={formIcon}
            onChange={(e) => setFormIcon(e.target.value)}
            maxLength={4}
          />
          <div className="map-edit-actions">
            <button className="btn btn--primary btn--small" onClick={handleSave}>
              <Icon name="check" /> שמור
            </button>
            {editingCell.dept && !editingCell.dept.fixed && (
              <>
                <button
                  className="btn btn--ghost btn--small"
                  onClick={() => {
                    setMoveSourceId(editingCell.dept.id);
                    setEditingCell(null);
                  }}
                >
                  <Icon name="swap" /> הזז
                </button>
                <button className="btn btn--ghost btn--small btn--danger" onClick={handleDelete}>
                  <Icon name="trash" /> מחק
                </button>
              </>
            )}
            <button className="btn btn--text btn--small" onClick={() => setEditingCell(null)}>
              <Icon name="close" /> ביטול
            </button>
          </div>

          {liveDept && (
            <div className="map-edit-gps">
              <p className="map-edit-gps-hint">
                GPS אמיתי — עובד רק כשיש קליטה בפועל (בד"כ ליד כניסה/חלונות/חוץ, לא באמצע
                המבנה). אופציונלי לכל מחלקה.
              </p>
              <div className="map-edit-actions">
                <button
                  className="btn btn--ghost btn--small"
                  onClick={() => handleSetGps(liveDept.id)}
                  disabled={gpsBusy}
                >
                  <Icon name="pin" /> {gpsBusy ? 'מאתר…' : 'קבע GPS למיקום הנוכחי'}
                </button>
                {typeof liveDept.lat === 'number' && (
                  <button
                    className="btn btn--text btn--small"
                    onClick={() => handleClearGps(liveDept.id)}
                  >
                    <Icon name="trash" /> נקה GPS
                  </button>
                )}
              </div>
              {typeof liveDept.lat === 'number' && (
                <p className="map-edit-gps-status">
                  <Icon name="check" /> GPS מכויל: {liveDept.lat.toFixed(5)}, {liveDept.lng.toFixed(5)}
                </p>
              )}
            </div>
          )}
        </div>
          );
        })()}

      {qrCheckpoint && (
        <CheckpointQrModal checkpoint={qrCheckpoint} onClose={() => setQrCheckpoint(null)} />
      )}
    </div>
  );
}
