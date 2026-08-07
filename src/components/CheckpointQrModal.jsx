import { makeQrSvg } from '../lib/qr';
import CloseButton from './CloseButton';
import Icon from './Icon';

// SVG אמיתי של QR (לא תמונה-מדומה) לתווית-צ'ק-פוינט, ניתן להדפסה
// ולהצבה פיזית בחנות ליד המדף/מעבר המתאים.
export default function CheckpointQrModal({ checkpoint, onClose }) {
  const svgMarkup = makeQrSvg(checkpoint.code, 6);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal checkpoint-qr-modal" onClick={(e) => e.stopPropagation()}>
        <CloseButton onClick={onClose} />
        <h2>תווית צ'ק-פוינט</h2>
        <p className="settings-hint">הדפיסו והציבו בחנות במיקום הזה — סריקתה מעדכנת מיקום מדויק בניווט.</p>
        <div className="checkpoint-qr-svg-wrap" dangerouslySetInnerHTML={{ __html: svgMarkup }} />
        <p className="checkpoint-qr-code">{checkpoint.code}</p>
        <button className="btn btn--primary" onClick={() => window.print()}>
          <Icon name="receipt" /> הדפס
        </button>
      </div>
    </div>
  );
}
