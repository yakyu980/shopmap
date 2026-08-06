// OCR אמיתי בדפדפן (Tesseract.js + WASM) — לא הדמיה. כל הנכסים
// (worker/core/traineddata עברית) ארוזים מקומית תחת public/tesseract
// כדי שהזיהוי יעבוד גם אופליין, בלי מפתח-API ובלי לפנות לענן.

import { createWorker } from 'tesseract.js';

export async function recognizeReceiptText(imageSource, onProgress) {
  const worker = await createWorker('heb', 1, {
    workerPath: '/tesseract/worker.min.js',
    corePath: '/tesseract/tesseract-core-simd-lstm.wasm.js',
    langPath: '/tesseract',
    gzip: false,
    logger: onProgress || (() => {}),
  });
  try {
    const { data } = await worker.recognize(imageSource);
    return data.text;
  } finally {
    await worker.terminate();
  }
}
