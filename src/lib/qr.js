import { qrcode } from 'qrcode-generator';

/** מחזיר תג-SVG (מחרוזת) אמיתי לקוד-QR של הטקסט הנתון (לא תמונה-מדומה). */
export function makeQrSvg(text, cellSize = 5) {
  const qr = qrcode(0, 'M');
  qr.addData(text);
  qr.make();
  return qr.createSvgTag(cellSize, 0);
}
