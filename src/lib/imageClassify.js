// זיהוי-תמונה אמיתי (לא הדמיה) — MobileNet דרך TensorFlow.js, רץ
// כולו בדפדפן (בדיוק כמו Tesseract.js ל-OCR). המודל המאומן-מראש
// מזהה 1000 קטגוריות מ-ImageNet (כלליות — "lemon"/"banana" וכו',
// לא מותג-מדויק) ונטען פעם אחת מה-CDN הרשמי של TensorFlow.js
// (storage.googleapis.com/tfjs-models — לא נכתב-על-ידינו).

// ⚠️ `mobilenet.load()` ללא-פרמטרים מושך כברירת-מחדל מ-tfhub.dev —
// חסום ברשת-הסביבה-הזו (allowlist טכני), וגם storage.googleapis.com
// (מקור-חלופי רשמי לאותו מודל) התגלה לא-אמין-מ-Chromium בסביבה הזו
// (ERR_CONNECTION_RESET דרך fetch, אף ש-curl הצליח — כנראה נבדל-
// TLS/HTTP2 ספציפי לפרוקסי). הפתרון: מארחים בעצמנו את קבצי-המודל
// (model.json + 4 shards, ~13.9MB — MobileNetV2 הרשמי מ-TF.js
// Models, לא מומצא) תחת public/mobilenet/, בדיוק כמו heb.traineddata
// ל-OCR — נטען-בעצלנות (lazy) רק בשימוש-ראשון-בפועל, ר' vite.config.js.
const MODEL_URL = '/mobilenet/model.json';

let modelPromise = null;

function getModel() {
  if (!modelPromise) {
    modelPromise = Promise.all([import('@tensorflow/tfjs'), import('@tensorflow-models/mobilenet')]).then(
      ([, mobilenet]) => mobilenet.load({ version: 2, alpha: 1.0, modelUrl: MODEL_URL })
    );
  }
  return modelPromise;
}

/** imgSource: HTMLVideoElement/HTMLCanvasElement/HTMLImageElement */
export async function classifyImage(imgSource, topK = 5) {
  const model = await getModel();
  return model.classify(imgSource, topK); // [{className, probability}]
}
