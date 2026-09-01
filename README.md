# SuperNav AI

אפליקציית ניווט וקניות לסופר — "ה־Waze של הסופר". המערכת משלבת מפת חנות, רשימת קניות, מסלול בין מחלקות, השוואת מחירים, סריקה ושיתוף נתונים דרך שרת.

זהו MVP פעיל: חלק מהיכולות מחוברות לנתונים ולשירותים אמיתיים, וחלקן עדיין הדגמה. ההבחנה המדויקת מתועדת ב־[docs/PRODUCT.md](docs/PRODUCT.md).

## התחלה מהירה

דרישות: Node.js 22 ומעלה ו־npm.

```bash
npm ci
npm run dev
```

האפליקציה עולה דרך Vite. בקשות אל `/api` מועברות בפיתוח אל שרת מקומי בפורט `8787`.

כדי להפעיל גם את השרת, בטרמינל נוסף:

```bash
cd server
npm ci
npm start
```

השרת דורש Supabase עבור היכולות המקוונות. משתני הסביבה הנתמכים:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` או `SUPABASE_SECRET_KEY`
- `GEMINI_API_KEY` לזיהוי מוצר בתמונה
- `PORT` — ברירת מחדל `8787`

בפריסה, צד הלקוח קורא את `VITE_API_URL`. ללא כתובת API זמינה, יכולות שרת לא יעבדו; אין להציג אותן כזמינות אופליין.

## פקודות

```bash
npm run dev      # שרת פיתוח של Vite
npm run lint     # בדיקות oxlint
npm run build    # build לפרודקשן + PWA
npm run preview  # תצוגה מקומית של ה-build
```

בדיקת יחידה קיימת:

```bash
node --test src/lib/chainPriceBlocks.test.js
```

## מפת תיעוד

- [הגדרת המוצר והיקף ה־MVP](docs/PRODUCT.md)
- [דף הבית — מקור האמת של הזרימה המרכזית](docs/HOME.md)
- [ארכיטקטורה ומפת קוד](docs/ARCHITECTURE.md)
- [פיתוח, בדיקות ופריסה](docs/DEVELOPMENT.md)
- [כללי העבודה של סוכני קוד](AGENTS.md)

## מבנה ראשי

```text
src/                 אפליקציית React/Vite
  components/        מסכים ורכיבי UI
  lib/               לוגיקת תחום, hooks וגישת API
  data/              קטלוג ברירת המחדל
server/              API של Express וחיבור Supabase
scripts/price_import ייבוא קובצי שקיפות מחירים
public/               נכסי PWA, OCR ומודל תמונה
.github/workflows/    פריסה וייבוא מחירים מתוזמן
docs/                 תיעוד פרויקטלי מתוחזק
.agents/skills/       skills מקומיים לפרויקט
```

## פריסה

דחיפה ל־`main` מפעילה את `.github/workflows/deploy-pages.yml` ומפרסמת את צד הלקוח ב־GitHub Pages. השרת מוגדר בנפרד דרך `render.yaml`. לפני דיווח שהאתר עלה יש לוודא שה־workflow הסתיים בהצלחה.
