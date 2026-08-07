// סט-סמלים מצויר-במיוחד (לא ספריית-אייקונים חיצונית, לא אמוג'ים) —
// מותקן פעם אחת ב-App.jsx. משפחת-קו אחידה (stroke-based) לכפתורי-UI,
// וסמלי-מוצר שטוחים (class="icon--solid") לתצוגת-מחלקה/קטגוריה.
export default function IconSprite() {
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
      <defs>
        <symbol id="ic-receipt" viewBox="0 0 24 24">
          <path d="M6 2.5h12v18.3l-1.5-1-1.5 1-1.5-1-1.5 1-1.5-1-1.5 1-1.5-1-1.5 1z" />
          <path d="M9 7.5h6M9 11h6M9 14.5h4" />
        </symbol>
        <symbol id="ic-clock" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3.5 2" />
        </symbol>
        <symbol id="ic-home" viewBox="0 0 24 24">
          <path d="M4 11l8-7 8 7" />
          <path d="M6 10v9a1 1 0 0 0 1 1h3v-6h4v6h3a1 1 0 0 0 1-1v-9" />
        </symbol>
        <symbol id="ic-search" viewBox="0 0 24 24">
          <circle cx="11" cy="11" r="6.5" />
          <path d="M20 20l-4.3-4.3" />
        </symbol>
        <symbol id="ic-mic" viewBox="0 0 24 24">
          <rect x="9" y="3" width="6" height="11" rx="3" />
          <path d="M5 11a7 7 0 0 0 14 0" />
          <path d="M12 18v3" />
          <path d="M9 21h6" />
        </symbol>
        <symbol id="ic-plus" viewBox="0 0 24 24">
          <path d="M12 5v14M5 12h14" />
        </symbol>
        <symbol id="ic-check" viewBox="0 0 24 24">
          <path d="M4 12.5l5.2 5.5L20 6.5" />
        </symbol>
        <symbol id="ic-close" viewBox="0 0 24 24">
          <path d="M6 6l12 12M18 6L6 18" />
        </symbol>
        <symbol id="ic-arrow-left" viewBox="0 0 24 24">
          <path d="M19 12H5" />
          <path d="M10.5 5.5L4 12l6.5 6.5" />
        </symbol>
        <symbol id="ic-tag" viewBox="0 0 24 24">
          <path d="M3 11.5V5a2 2 0 0 1 2-2h6.5L21 11.5a2 2 0 0 1 0 2.8l-6.7 6.7a2 2 0 0 1-2.8 0L3 12.8z" />
          <circle cx="8" cy="8" r="1.4" fill="currentColor" stroke="none" />
        </symbol>
        <symbol id="ic-map" viewBox="0 0 24 24">
          <path d="M3 6.5l6-2 6 2 6-2v13l-6 2-6-2-6 2z" />
          <path d="M9 4.5v13M15 6.5v13" />
        </symbol>
        <symbol id="ic-list" viewBox="0 0 24 24">
          <path d="M9 6h11M9 12h11M9 18h11" />
          <circle cx="4.2" cy="6" r="1.3" fill="currentColor" stroke="none" />
          <circle cx="4.2" cy="12" r="1.3" fill="currentColor" stroke="none" />
          <circle cx="4.2" cy="18" r="1.3" fill="currentColor" stroke="none" />
        </symbol>
        <symbol id="ic-compass" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="9" />
          <path d="M14.8 9.2l-2 5.6-5.6 2 2-5.6z" />
        </symbol>
        <symbol id="ic-cart" viewBox="0 0 24 24">
          <path d="M3 4h2l2.4 12.2A2 2 0 0 0 9.4 18H18a2 2 0 0 0 2-1.6L21.5 8H6" />
          <circle cx="9.5" cy="21" r="1.3" fill="currentColor" stroke="none" />
          <circle cx="17.5" cy="21" r="1.3" fill="currentColor" stroke="none" />
        </symbol>
        <symbol id="ic-edit" viewBox="0 0 24 24">
          <path d="M4 20l1-4.4L14.6 6l3.4 3.4L8.4 20z" />
          <path d="M13 7l4 4" />
        </symbol>
        <symbol id="ic-minus" viewBox="0 0 24 24">
          <path d="M5 12h14" />
        </symbol>
        <symbol id="ic-trash" viewBox="0 0 24 24">
          <path d="M4 7h16" />
          <path d="M9 7V4.5A1.5 1.5 0 0 1 10.5 3h3A1.5 1.5 0 0 1 15 4.5V7" />
          <path d="M6 7l1 13a1.5 1.5 0 0 0 1.5 1.4h7a1.5 1.5 0 0 0 1.5-1.4L18 7" />
          <path d="M10 11v6M14 11v6" />
        </symbol>
        <symbol id="ic-gear" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="3.2" />
          <path d="M12 3v2.4M12 18.6V21M3 12h2.4M18.6 12H21M5.6 5.6l1.7 1.7M16.7 16.7l1.7 1.7M5.6 18.4l1.7-1.7M16.7 7.3l1.7-1.7" />
        </symbol>
        <symbol id="ic-reset" viewBox="0 0 24 24">
          <path d="M20 12a8 8 0 1 1-2.3-5.6" />
          <path d="M20 4v5h-5" />
        </symbol>
        <symbol id="ic-warning" viewBox="0 0 24 24">
          <path d="M12 4L2.5 20h19z" />
          <path d="M12 10v4" />
          <circle cx="12" cy="17" r="1" fill="currentColor" stroke="none" />
        </symbol>
        <symbol id="ic-bell" viewBox="0 0 24 24">
          <path d="M6 10.5a6 6 0 0 1 12 0v3.7l2 3.3H4l2-3.3z" />
          <path d="M10 20.5a2 2 0 0 0 4 0" />
        </symbol>
        <symbol id="ic-camera" viewBox="0 0 24 24">
          <rect x="3" y="7" width="18" height="13" rx="2.2" />
          <path d="M8.2 7l1.3-2.3h5l1.3 2.3" />
          <circle cx="12" cy="13.3" r="3.4" />
        </symbol>
        <symbol id="ph-barcode" viewBox="0 0 24 24" className="icon--solid">
          <rect x="3.5" y="5" width="1.4" height="14" />
          <rect x="6.3" y="5" width="2.4" height="14" />
          <rect x="9.7" y="5" width="1.2" height="14" />
          <rect x="12" y="5" width="2.6" height="14" />
          <rect x="15.6" y="5" width="1.2" height="14" />
          <rect x="18" y="5" width="2.5" height="14" />
        </symbol>
        <symbol id="ic-swap" viewBox="0 0 24 24">
          <path d="M7 8h13M7 8l3.5-3.5M7 8l3.5 3.5" />
          <path d="M17 16H4M17 16l-3.5-3.5M17 16l-3.5 3.5" />
        </symbol>
        <symbol id="ic-pin" viewBox="0 0 24 24">
          <path d="M12 21s7-6.5 7-11.5A7 7 0 0 0 5 9.5C5 14.5 12 21 12 21z" />
          <circle cx="12" cy="9.5" r="2" fill="currentColor" stroke="none" />
        </symbol>
        <symbol id="ph-footsteps" viewBox="0 0 24 24" className="icon--solid">
          <ellipse cx="8" cy="8" rx="2.6" ry="4" transform="rotate(-15 8 8)" />
          <ellipse cx="16" cy="16" rx="2.6" ry="4" transform="rotate(15 16 16)" />
        </symbol>
        <symbol id="ic-family" viewBox="0 0 24 24">
          <circle cx="8" cy="7" r="2.6" />
          <path d="M3 20c0-3.3 2.5-5.5 5-5.5S13 16.7 13 20" />
          <circle cx="17" cy="8.5" r="2.2" />
          <path d="M14.3 20c.2-2.7 1.9-4.5 4-4.5s3.6 1.6 4 4" />
        </symbol>
        <symbol id="ic-wifi" viewBox="0 0 24 24">
          <path d="M4 9a13 13 0 0 1 16 0" />
          <path d="M7 12.5a8 8 0 0 1 10 0" />
          <path d="M10 16a3 3 0 0 1 4 0" />
          <circle cx="12" cy="19.5" r="1" fill="currentColor" stroke="none" />
        </symbol>
        <symbol id="ic-door" viewBox="0 0 24 24">
          <rect x="5" y="3" width="11" height="18" rx="1" />
          <path d="M16 12h4M18 10l2 2-2 2" />
        </symbol>
        <symbol id="ic-snowflake" viewBox="0 0 24 24">
          <path d="M12 2.5v19M3.8 7.2l16.4 9.6M20.2 7.2L3.8 16.8" />
          <path d="M12 2.5l-2 2.3M12 2.5l2 2.3M12 21.5l-2-2.3M12 21.5l2-2.3M3.8 7.2l2.9.2M3.8 7.2l1.1 2.7M20.2 7.2l-2.9.2M20.2 7.2l-1.1 2.7M3.8 16.8l2.9-.2M3.8 16.8l1.1-2.7M20.2 16.8l-2.9-.2M20.2 16.8l-1.1-2.7" />
        </symbol>
        <symbol id="ic-star" viewBox="0 0 24 24">
          <path d="M12 3.5l2.7 5.6 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z" />
        </symbol>
        <symbol id="ic-sun" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="4.5" />
          <path d="M12 2.5v3M12 18.5v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2.5 12h3M18.5 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1" />
        </symbol>

        {/* איורי-מוצר/מחלקה שטוחים — ל-DeptIcon.jsx ולתצוגת "תצלום"-מוצר */}
        <symbol id="ph-cottage" viewBox="0 0 24 24" className="icon--solid">
          <path d="M6 8h12l1.4 12.2a1.5 1.5 0 0 1-1.5 1.8H6.1a1.5 1.5 0 0 1-1.5-1.8z" />
          <path d="M5 8l1-3.2A1.5 1.5 0 0 1 7.4 4h9.2a1.5 1.5 0 0 1 1.4 1.1L19 8z" fillOpacity=".55" />
        </symbol>
        <symbol id="ph-milk" viewBox="0 0 24 24" className="icon--solid">
          <path d="M9 2h6v3.4l2.2 2.6c.5.6.8 1.4.8 2.2V20a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V10.2c0-.8.3-1.6.8-2.2L9 5.4z" />
          <rect x="7.2" y="12.5" width="9.6" height="2.3" fill="var(--surface)" stroke="none" />
        </symbol>
        <symbol id="ph-tomato" viewBox="0 0 24 24" className="icon--solid">
          <circle cx="12" cy="13.5" r="8" />
          <path d="M12 5.2v2.3" stroke="currentColor" strokeWidth="1.6" fill="none" />
        </symbol>
        <symbol id="ph-bread" viewBox="0 0 24 24" className="icon--solid">
          <path d="M4 12.5c0-4.7 3.6-8.5 8-8.5s8 3.8 8 8.5V19a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 19z" />
          <path d="M8 12c1-1.2 2-1.8 4-1.8s3 .6 4 1.8" fill="none" stroke="var(--surface)" strokeWidth="1.5" />
        </symbol>
        <symbol id="ph-choc" viewBox="0 0 24 24" className="icon--solid">
          <rect x="3.5" y="6" width="17" height="12" rx="1.6" />
          <path d="M12 6v12M3.5 12h17M7.5 6v12M16.5 6v12" fill="none" stroke="var(--surface)" strokeWidth="1.3" />
        </symbol>
        <symbol id="ph-cheese" viewBox="0 0 24 24" className="icon--solid">
          <path d="M3 17.5L12 4l9 13.5a1 1 0 0 1-.9 1.5H3.9a1 1 0 0 1-.9-1.5z" />
          <circle cx="12.5" cy="14.5" r="1.1" fill="var(--surface)" stroke="none" />
          <circle cx="16" cy="12" r="0.8" fill="var(--surface)" stroke="none" />
        </symbol>
        <symbol id="ph-leaf" viewBox="0 0 24 24" className="icon--solid">
          <path d="M4 20c0-9.2 7-16.5 16.5-16.5C19.5 12.5 12.7 20 4 20z" />
          <path d="M6.3 17.7C10 13.8 13.7 9.9 17.4 6" fill="none" stroke="var(--surface)" strokeWidth="1.3" />
        </symbol>
        <symbol id="ph-drumstick" viewBox="0 0 24 24" className="icon--solid">
          <path d="M14.2 4a4.3 4.3 0 0 1 4.3 4.3c0 2-1.5 3.3-3.1 4.6l-5.9 5.4c-1.6 1.5-4.1 1.5-5.3 0-1.2-1.5-1-3.7.5-5.1l6-5.5C12 6.2 12.6 4 14.2 4z" />
          <circle cx="6.5" cy="17.5" r="1.6" fill="var(--surface)" stroke="none" />
        </symbol>
        <symbol id="ph-cup" viewBox="0 0 24 24" className="icon--solid">
          <path d="M6 3.5h12l-1.3 15.3A2 2 0 0 1 14.7 20.6H9.3a2 2 0 0 1-2-1.8z" />
          <path d="M8.2 8.5h7.6" stroke="var(--surface)" strokeWidth="1.3" fill="none" />
        </symbol>
        <symbol id="ph-bottle" viewBox="0 0 24 24" className="icon--solid">
          <path d="M10 2h4v3l2 2.2V19a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2V7.2L10 5z" />
          <rect x="9.3" y="10.5" width="5.4" height="6.5" rx="1.2" fill="var(--surface)" stroke="none" />
        </symbol>
        <symbol id="ph-door" viewBox="0 0 24 24" className="icon--solid">
          <rect x="5.5" y="2.5" width="13" height="19" rx="1.2" />
          <circle cx="15" cy="12" r="1.1" fill="var(--surface)" stroke="none" />
        </symbol>
        <symbol id="ph-basket" viewBox="0 0 24 24" className="icon--solid">
          <path d="M4.5 8h15l-1.7 10a2 2 0 0 1-2 1.7H8.2a2 2 0 0 1-2-1.7z" />
          <path d="M7.5 8l2-4.5h5l2 4.5" fill="none" stroke="var(--surface)" strokeWidth="1.4" />
        </symbol>
      </defs>
    </svg>
  );
}
