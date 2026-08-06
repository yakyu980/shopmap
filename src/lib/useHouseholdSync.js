import { useEffect } from 'react';
import { useAuth } from './useAuth';
import { api } from './apiClient';
import { setMembersFromServer } from './familyMembers';

const POLL_MS = 8000;

// כשמחוברים, מסנכרן את רשימת-בני-המשפחה מהשרת ל-store המקומי הקיים
// (familyMembers.js) — כל רכיב שכבר קורא משם (ShoppingList/Navigation/
// CameraNav) מקבל את הרשימה המסונכרנת בלי שינוי. פולינג תקופתי (לא
// push בזמן-אמת) כדי שגם בן-משפחה שהצטרף *אחרי* שמישהו אחר כבר
// התחבר יופיע אצלו תוך כמה שניות, לא רק בהתחברות-הראשונית.
export function useHouseholdSync() {
  const { token } = useAuth();
  useEffect(() => {
    if (!token) return undefined;
    let cancelled = false;
    function fetchMembers() {
      api
        .get('/household/members')
        .then((data) => {
          if (!cancelled) setMembersFromServer(data.members);
        })
        .catch(() => {
          /* השרת לא זמין — נשארים עם מה שיש מקומית */
        });
    }
    fetchMembers();
    const interval = setInterval(fetchMembers, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [token]);
}
