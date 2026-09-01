# פיתוח, בדיקות ופריסה

## לפני שינוי

1. קרא את `docs/PRODUCT.md` אם השינוי משפיע על התנהגות או טענות מוצריות.
2. קרא את `docs/ARCHITECTURE.md` ואת הקבצים הרלוונטיים לזרימה.
3. בדוק `git status --short`; אל תיגע בקבצים לא קשורים או לא־מנוהלים.
4. אמת מהו מקור האמת בקוד. התיעוד מתאר כוונה, אך קוד פעיל גובר במקרה של סתירה ויש לעדכן את המסמך.

## פיתוח מקומי

צד לקוח:

```bash
npm ci
npm run dev
```

שרת:

```bash
cd server
npm ci
npm start
```

`npm run dev` מעביר `/api` לשרת המקומי. כדי לבדוק כתובת שרת חיצונית, הגדר `VITE_API_URL` בסביבת Vite.

## רמת אימות לפי סוג שינוי

- שינוי תיעוד בלבד: בדוק קישורים, נתיבים, פקודות ו־`git diff --check`.
- שינוי לוגיקה טהורה: הוסף או הרץ `node --test` לקובץ test מתאים.
- שינוי React/CSS: הרץ lint ו־build ובדוק ידנית את הזרימה הרלוונטית ברוחב mobile ו־desktop.
- שינוי שרת: בדוק את route ואת `/api/health`; אם יש שינוי חוזה, בדוק גם את הלקוח.
- שינוי PWA או deployment: בדוק production build ו־preview, לא רק dev server.

בדיקות הבסיס לפני פרסום שינוי קוד:

```bash
npm run lint
node --test src/lib/chainPriceBlocks.test.js
npm run build
```

אם השינוי אינו קשור לבדיקה הקיימת, יש להריץ אותה עדיין כ־regression קטן ולהוסיף בדיקה ממוקדת כאשר הלוגיקה מצדיקה זאת.

## Git ופריסה

- הענף הפעיל לפרסום הוא `main`.
- commit כולל רק את קבצי המשימה.
- אין לבצע force-push ואין לדרוס שינוי remote לא קשור.
- push ל־`main` מפעיל את `.github/workflows/deploy-pages.yml`.
- לאחר push יש לוודא שה־workflow של GitHub Pages הסתיים בהצלחה ולבדוק את כתובת האתר.
- פריסת השרת נפרדת ומוגדרת ב־`render.yaml`; שינוי client בלבד אינו מוכיח שהשרת עודכן.

## מידע רגיש

אין להוסיף ל־Git:

- `.env` או `server/.env`
- מפתחות Supabase או Gemini
- certificates ומפתחות פרטיים
- dumps של נתוני משתמש

## תיקיות מקומיות שאינן חלק מהפרויקט הראשי

נכון למיפוי האחרון קיימות בתיקיית העבודה גם תיקיות untracked כגון `mobile/`, `certs/`, `.codex-compare-tabs/`, `.codex-publish-site/` ו־`.claude/`. הן אינן חלק מה־repository הראשי ואין למחוק, להזיז או לצרף אותן ל־commit ללא החלטה מפורשת.
