# הרצת דפדפן לבדיקת פרסונה — quickstart

הסביבה כוללת Chromium מותקן מראש ל-Playwright. אין צורך (ואסור) להריץ
`playwright install`.

- `PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers` (כבר מוגדר ב-env)
- אם `npx playwright` לא זמין/מתקין מחדש, הרץ כרומיום ישירות עם
  `executablePath: '/opt/pw-browsers/chromium'`.

## סקריפט בסיסי (Node, ES modules)

צור קובץ זמני (למשל `/tmp/persona-probe.mjs`) בערך כך, והתאם את הצעדים
(קליקים, טקסט) לזרימה הספציפית שנבדקת:

```js
import { chromium } from 'playwright';

const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium',
  headless: true,
});
const page = await browser.newPage({ viewport: { width: 390, height: 844 } }); // מובייל, כי זו אפליקציית קניות
await page.goto('http://localhost:5173'); // ודא שזה הפורט שבו רץ vite dev

await page.screenshot({ path: '/tmp/persona-01-initial.png', fullPage: true });

// דוגמה: לחיצה על טאב לפי הטקסט הנראה למשתמש (לא selector טכני)
await page.getByText('רשימת קניות').click();
await page.screenshot({ path: '/tmp/persona-02-after-click.png', fullPage: true });

// דוגמה: הקלדה בשדה חיפוש
// await page.getByPlaceholder('חפש מוצר').fill('חלב');

await browser.close();
```

הרץ עם `node /tmp/persona-probe.mjs`.

## אחרי הצילום

תמיד **תקרא (Read) את קובצי ה-PNG שנוצרו** — אל תסתפק בהרצת הסקריפט. הקריאה
הוויזואלית של הצילום היא מה שנותן לך את "מה שהעיניים של הפרסונה רואות".
תעבור צעד-צעד: צלם, הסתכל, לחץ על הצעד הבא לפי מה שהפרסונה הזו הייתה
עושה (לא לפי "הדרך הנכונה" — למשל ילד עלול ללחוץ על משהו שלא נועד ללחיצה),
צלם שוב, הסתכל שוב.

## טיפים

- אם אלמנט לא נמצא לפי טקסט — נסה `page.locator('button', { hasText: '...' })`
  או תעבור למבנה DOM כדי לראות מה קיים בפועל (`page.content()`), אבל זה
  שלב טכני-לצורך-הפעלה בלבד — לא חלק מהמשוב עצמו, שנשאר אנושי ולא-טכני.
- לפרסונה "רפרוף עין" — קח screenshot יחיד בלבד ותן רושם ראשוני, אל תמשיך
  ללחוץ עוד ועוד (זה סותר את האופי שלה).
- לפרסונה "ילד" — אפשר בהחלט ללחוץ במקומות "לא הגיוניים" אם זה מה שילד
  אמיתי היה עושה; זה בדיוק סוג הדבר שהבדיקה הזו אמורה לתפוס.
