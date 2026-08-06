// עוטף symbol מ-IconSprite.jsx. `solid` בוחר בין קו (ברירת-מחדל,
// לכפתורי-UI) לשטוח-מלא (לאיורי-מוצר/מחלקה). גודל יחסי (em) כדי
// שייכנס לכל הקשר-טקסט/כפתור קיים בלי override פר-אתר.
export default function Icon({ name, solid = false, className = '', style }) {
  const cls = 'icon' + (solid ? ' icon--solid' : '') + (className ? ' ' + className : '');
  return (
    <svg className={cls} style={style} aria-hidden="true">
      <use href={`#${solid ? 'ph' : 'ic'}-${name}`} />
    </svg>
  );
}
