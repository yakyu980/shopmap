# ארכיטקטורה ומפת קוד

## תמונת מצב

המערכת בנויה משלושה חלקים:

```text
React/Vite PWA  ->  Express API  ->  Supabase ושירותים חיצוניים
      |                  |
      + localStorage     + Gemini / קובצי שקיפות מחירים
```

צד הלקוח נפרס ל־GitHub Pages. השרת הוא שירות Node נפרד שמוגדר ב־`render.yaml`. בפיתוח Vite מעביר `/api` ל־`http://localhost:8787`.

## צד לקוח

- `src/main.jsx` — נקודת הכניסה.
- `src/App.jsx` — auth gate, ארבעת הטאבים וה־state של הניווט הראשי.
- `src/components/` — מסכים ורכיבים. לפני יצירת רכיב חדש יש לחפש רכיב משותף קיים.
- `src/lib/` — לוגיקת תחום, מאגרי state, hooks, parsers ועטיפת API.
- `src/data/storeData.js` — קטלוג ברירת מחדל ופונקציות מוצר בסיסיות.
- `src/index.css` — tokens וסגנונות גלובליים.
- `src/App.css` — פריסת האפליקציה, רכיבים ו־modal primitives.

אין React Router. מעבר מסך ראשי מתבצע באמצעות `setTab` מתוך `App.jsx`.

## State ונתונים

יש שני דפוסים עיקריים:

1. state מקומי של React לזרימות מסך זמניות.
2. stores מודולריים ב־`src/lib/` עם `subscribe/get` ו־`useSyncExternalStore` לנתונים משותפים.

נתונים שנשמרים ב־localStorage כוללים בין היתר רשימת קניות, תצורת חנות, משתמש cached, משפחה, מועדפים, קבלות והיסטוריית רכישות. שינוי מפתח אחסון או מבנה נתונים דורש migration או fallback לאחור; אין למחוק נתוני משתמש כפתרון שגרתי.

מקורות אמת מרכזיים:

- חנות ומחלקות: `storeConfig.js` + `useStoreConfig.js`
- קטלוג: `catalog.js` + `useCatalog.js`
- רשימת קניות: `useShoppingList.js`
- חשבון: `auth.js` + `useAuth.js`
- סניפים: `venues.js` + `useVenues.js`
- דף בית קבוצתי: `groupHome.js` + `useGroupHome.js` ועמודות `groups.shopping_items`/`groups.favorites`
- מסלול: `route.js`
- תקשורת שרת: `apiClient.js`

## שרת

`server/index.js` מתקין routes תחת `/api`:

- auth ו־household
- groups
- products וזיהוי מוצר
- venues ו־trips
- חיפוש סופרים סמוכים דרך Geoapify, לפי קואורדינטות GPS מהלקוח
- price observations, import, deals ו־price data
- health check ב־`/api/health`

`server/supabaseClient.js` מאתחל את החיבור. הסכמה הנוכחית מתועדת ב־`server/supabase-schema.sql`. אין לחשוף service-role key לצד הלקוח.

## PWA ונכסים כבדים

`vite.config.js` מגדיר service worker. נכסי Tesseract, MobileNet וחבילת TensorFlow אינם נכנסים ל־precache הראשוני; הם נשמרים ב־runtime cache לאחר שימוש ראשון. שינוי מסלולי הנכסים מחייב עדכון מקביל של כללי ה־Workbox.

## כללי שינוי חשובים

- שמור על RTL ועל HTML סמנטי.
- השתמש ב־`Icon` וב־modal primitives הקיימים.
- אל תבצע fetch ישירות מרכיבי UI אם הפעולה שייכת ל־`apiClient` או ל־store קיים.
- פונקציות חישוב ו־parsing צריכות להישאר טהורות כאשר אפשר, כדי שיהיה קל לבדוק אותן ב־Node.
- שינוי API חייב להתבצע יחד בצד הלקוח וב־route המתאים, כולל טיפול בכשל.
- שינוי סכמת נתונים דורש בדיקת תאימות ל־localStorage ול־Supabase.
