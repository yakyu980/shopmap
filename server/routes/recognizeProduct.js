// זיהוי-מוצר אמיתי מתמונה בודדת מול Gemini Vision (gemini-flash-latest).
// שונה מ-imageSearch.js (שנשאר mock מוצהר) — כאן באמת שולחים את
// התמונה ל-Gemini ומבקשים JSON מובנה. אם אין מפתח/הבקשה נכשלת,
// מחזירים recognized:false כדי שהלקוח ייפול לזיהוי-הדמה המקומי
// במקום לקרוס.

import { Router } from 'express';
import { requireAuth } from '../auth.js';

const router = Router();
const MODEL = 'gemini-flash-latest';

// אבחון-זמני: בדיקה מהירה (בלי תמונה, בלי generateContent) שהמפתח
// בכלל תקף ושה-API של גוגל נגיש-ומגיב מהר מ-Render — כדי להבדיל בין
// "מפתח לא-תקין/לא-מורשה" (אמור לחזור מהר עם 400/403) לבין "generateContent
// עם תמונה נתקע" (בעיה אחרת לגמרי). לא חושף את המפתח המלא בתשובה.
router.get('/health', async (req, res) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.json({ hasKey: false });
  const masked = apiKey.slice(0, 6) + '…' + apiKey.slice(-4);
  try {
    const start = Date.now();
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`, {
      signal: AbortSignal.timeout(10000),
    });
    const ms = Date.now() - start;
    const body = await r.text();
    console.log('SuperNav AI: Gemini health check —', masked, r.status, ms + 'ms');
    res.json({ hasKey: true, masked, status: r.status, ms, bodyPreview: body.slice(0, 300) });
  } catch (err) {
    console.log('SuperNav AI: Gemini health check failed —', masked, err?.name, err?.message);
    res.json({ hasKey: true, masked, error: err?.name, message: err?.message });
  }
});
const PROMPT =
  'זהה את מוצר-המזון/הצריכה במרכז התמונה הזו (מוצר-מדף בסופרמרקט). ' +
  'החזר אך ורק JSON תקני בפורמט {"name": "שם המוצר בעברית, קצר וברור", ' +
  '"brand": "שם המותג אם ניכר, אחרת null", "category": "קטגוריה כללית אחת מילה"} ' +
  'בלי טקסט נוסף לפניו/אחריו. אם אין מוצר-מזהה בתמונה, החזר {"name": null}.';

router.post(
  '/',
  requireAuth,
  async (req, res) => {
    const apiKey = process.env.GEMINI_API_KEY;
    const { imageBase64, mimeType } = req.body || {};
    if (!imageBase64) return res.status(400).json({ error: 'imageBase64 נדרש' });
    if (!apiKey) return res.json({ recognized: false, reason: 'no-api-key' });

    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`;
      const geminiRes = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: PROMPT },
                { inline_data: { mime_type: mimeType || 'image/jpeg', data: imageBase64 } },
              ],
            },
          ],
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.1,
          },
        }),
        signal: AbortSignal.timeout(25000),
      });
      if (!geminiRes.ok) {
        const errBody = await geminiRes.text().catch(() => '');
        console.error('SuperNav AI: Gemini HTTP', geminiRes.status, errBody.slice(0, 500));
        return res.json({ recognized: false, reason: 'gemini-http-' + geminiRes.status });
      }
      const data = await geminiRes.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.error('SuperNav AI: Gemini response had no JSON —', JSON.stringify(data).slice(0, 500));
        return res.json({ recognized: false, reason: 'no-json-in-response' });
      }
      const parsed = JSON.parse(jsonMatch[0]);
      if (!parsed?.name) return res.json({ recognized: false, reason: 'no-product-in-image' });
      res.json({
        recognized: true,
        name: String(parsed.name).slice(0, 120),
        brand: parsed.brand ? String(parsed.brand).slice(0, 80) : null,
        category: parsed.category ? String(parsed.category).slice(0, 40) : null,
      });
    } catch (err) {
      console.error('SuperNav AI: Gemini call failed —', err?.name, err?.message);
      res.json({ recognized: false, reason: err?.name === 'TimeoutError' ? 'timeout' : 'error' });
    }
  }
);

export default router;
