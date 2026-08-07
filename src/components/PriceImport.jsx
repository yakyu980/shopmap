import { useRef, useState } from 'react';
import { useVenues } from '../lib/useVenues';
import { parseOfficialPriceCsv } from '../lib/csvImport';
import { api } from '../lib/apiClient';
import Icon from './Icon';
import CloseButton from './CloseButton';

// ייבוא מחירים-רשמיים מקובץ-CSV שהמשתמש הכין *בעצמו*, מחוץ לאפליקציה,
// באמצעות כלי-קוד-פתוח קיים (israeli-supermarket-scraper/parsers —
// ר' CLAUDE.md) שכבר יודע להוריד ולנרמל את קבצי-ה-XML-הרשמיים של
// הרשתות. לא מנסים לגשת לשום אתר-רשת מכאן — רק קוראים קובץ מקומי.
export default function PriceImport({ onClose }) {
  const { venues } = useVenues();
  const fileInputRef = useRef(null);
  const [venueId, setVenueId] = useState('');
  const [parsed, setParsed] = useState(null); // {rows, errors}
  const [fileName, setFileName] = useState('');
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const text = await file.text();
    setParsed(parseOfficialPriceCsv(text));
    setImportResult(null);
  }

  async function handleImport() {
    if (!venueId || !parsed?.rows?.length) return;
    setImporting(true);
    try {
      const data = await api.post('/price-import', { venueId, rows: parsed.rows });
      setImportResult({ ok: true, imported: data.imported, total: data.total });
    } catch (err) {
      setImportResult({ ok: false, message: err.message });
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal venue-picker-modal" onClick={(e) => e.stopPropagation()}>
        <CloseButton onClick={onClose} />
        <h2>ייבוא מחירים-רשמיים (CSV)</h2>
        <p className="settings-hint">
          לא מושך נתונים מהאינטרנט מכאן — מייבא קובץ-CSV שהכנתם בעצמכם (למשל בעזרת כלי-קוד-פתוח
          כמו israeli-supermarket-scraper) עם עמודות ברקוד/שם/מחיר.
        </p>

        <label className="receipt-venue-label">
          לאיזו חנות שייך הקובץ?
          <select className="map-edit-input" value={venueId} onChange={(e) => setVenueId(e.target.value)}>
            <option value="">— בחרו חנות —</option>
            {venues.map((v) => (
              <option key={v.id} value={v.id}>
                {v.chainName} · {v.branchName}
              </option>
            ))}
          </select>
        </label>

        <div className="receipt-upload-row">
          <button className="btn btn--ghost" onClick={() => fileInputRef.current?.click()}>
            <Icon name="receipt" /> בחרו קובץ CSV
          </button>
          <input ref={fileInputRef} type="file" accept=".csv,text/csv" style={{ display: 'none' }} onChange={handleFile} />
        </div>
        {fileName && <p className="settings-hint">{fileName}</p>}

        {parsed && (
          <>
            <p className="settings-hint">
              {parsed.rows.length} שורות-תקינות זוהו
              {parsed.errors.length > 0 ? ` · ${parsed.errors.length} שורות דולגו (לא-תקינות)` : ''}
            </p>
            {parsed.rows.length > 0 && (
              <ul className="real-price-history-list">
                {parsed.rows.slice(0, 5).map((r, i) => (
                  <li key={i}>
                    {r.name} · ₪{r.price.toFixed(2)} · {r.barcode}
                  </li>
                ))}
                {parsed.rows.length > 5 && <li>… ועוד {parsed.rows.length - 5}</li>}
              </ul>
            )}
            <button
              className="btn btn--primary"
              onClick={handleImport}
              disabled={!venueId || parsed.rows.length === 0 || importing}
            >
              <Icon name="check" /> {importing ? 'מייבא…' : `ייבא ${parsed.rows.length} שורות`}
            </button>
          </>
        )}

        {importResult && (
          <p className={importResult.ok ? 'settings-confirm-msg' : 'settings-error'}>
            {importResult.ok ? (
              <>
                <Icon name="check" /> יובאו {importResult.imported} מתוך {importResult.total} שורות
              </>
            ) : (
              <>
                <Icon name="warning" /> הייבוא נכשל: {importResult.message}
              </>
            )}
          </p>
        )}
      </div>
    </div>
  );
}
