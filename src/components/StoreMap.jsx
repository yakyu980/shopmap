import { useState } from 'react';
import { PRODUCTS } from '../data/storeData';
import { useStoreConfig } from '../lib/useStoreConfig';
import {
  addDepartment,
  getStoreConfig,
  moveDepartment,
  removeDepartment,
  renameDepartment,
  resetStoreConfig,
  resizeGrid,
  updateStoreConfig,
  MAX_GRID_SIZE,
} from '../lib/storeConfig';

export default function StoreMap({ activeDeptId }) {
  const config = useStoreConfig();
  const [editMode, setEditMode] = useState(false);
  const [editingCell, setEditingCell] = useState(null); // {x,y,dept|null}
  const [moveSourceId, setMoveSourceId] = useState(null);
  const [formName, setFormName] = useState('');
  const [formIcon, setFormIcon] = useState('');
  const [hint, setHint] = useState('');

  function showHint(text) {
    setHint(text);
    setTimeout(() => setHint(''), 3500);
  }

  function openCell(x, y, dept) {
    if (!editMode) return;
    if (moveSourceId) {
      if (dept) return;
      const res = moveDepartment(getStoreConfig(), moveSourceId, x, y);
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
      : addDepartment(cfg, { name: formName, icon: formIcon, x: editingCell.x, y: editingCell.y });
    if (res.ok) {
      updateStoreConfig(() => res.config);
      setEditingCell(null);
    } else {
      showHint(res.reason);
    }
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
      const dept = config.departments.find((d) => d.x === x && d.y === y);
      cells.push({ x, y, dept });
    }
  }

  return (
    <div className="store-map">
      <div className="store-map-toolbar">
        <button
          className={'btn btn--small' + (editMode ? ' btn--primary' : ' btn--ghost')}
          onClick={() => {
            setEditMode((v) => !v);
            setEditingCell(null);
            setMoveSourceId(null);
          }}
        >
          ✏️ ערוך מפה
        </button>
        {editMode && (
          <div className="store-map-grid-controls">
            <span>עמודות</span>
            <button className="btn btn--icon btn--small" onClick={() => handleResize('cols', -1)}>
              ➖
            </button>
            <button
              className="btn btn--icon btn--small"
              onClick={() => handleResize('cols', 1)}
              disabled={config.gridCols >= MAX_GRID_SIZE}
            >
              ➕
            </button>
            <span>שורות</span>
            <button className="btn btn--icon btn--small" onClick={() => handleResize('rows', -1)}>
              ➖
            </button>
            <button
              className="btn btn--icon btn--small"
              onClick={() => handleResize('rows', 1)}
              disabled={config.gridRows >= MAX_GRID_SIZE}
            >
              ➕
            </button>
            <button className="btn btn--text btn--small" onClick={handleReset}>
              ↺ אפס למצב ברירת-מחדל
            </button>
          </div>
        )}
      </div>

      {moveSourceId && (
        <p className="map-move-hint">
          📍 בחר תא ריק להעברת "{config.departments.find((d) => d.id === moveSourceId)?.name}"
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
        {cells.map(({ x, y, dept }) => {
          if (!dept && !editMode) return null;
          return (
            <div
              key={`${x}-${y}`}
              className={
                'store-map-cell' +
                (dept?.fixed ? ' store-map-cell--fixed' : '') +
                (dept?.id === activeDeptId ? ' store-map-cell--active' : '') +
                (!dept ? ' store-map-cell--empty' : '') +
                (editMode ? ' store-map-cell--editable' : '')
              }
              style={{ gridColumn: x + 1, gridRow: y + 1 }}
              onClick={() => openCell(x, y, dept)}
              role={editMode ? 'button' : undefined}
              tabIndex={editMode ? 0 : undefined}
            >
              {dept ? (
                <>
                  <span className="store-map-icon">{dept.icon}</span>
                  <span className="store-map-name">{dept.name}</span>
                </>
              ) : (
                editMode && <span className="store-map-add">➕</span>
              )}
            </div>
          );
        })}
      </div>

      {editingCell && (
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
              ✔ שמור
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
                  ➡️ הזז
                </button>
                <button className="btn btn--ghost btn--small btn--danger" onClick={handleDelete}>
                  🗑️ מחק
                </button>
              </>
            )}
            <button className="btn btn--text btn--small" onClick={() => setEditingCell(null)}>
              ✖ ביטול
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
