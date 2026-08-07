import { useCallback, useEffect, useState } from 'react';
import { useAuth } from './useAuth';
import { api } from './apiClient';

const POLL_MS = 8000;

// טיול-קניות-משותף לכל בני-המשפחה: פולינג תקופתי (אותו דפוס בדיוק
// כמו useHouseholdSync) של הטיול-הפעיל של ה-household, כך שהוספה/
// סימון/הסרה של פריט ע"י בן-משפחה אחד מופיעים אצל כולם תוך כמה
// שניות. בלי חיבור/בלי טיול-פעיל — trip=null, ShoppingList נופל
// לרשימה המקומית הרגילה (useShoppingList) בלי שינוי.
export function useTripSync() {
  const { token } = useAuth();
  const [trip, setTrip] = useState(null);

  const refresh = useCallback(() => {
    if (!token) return;
    api
      .get('/trips/active')
      .then((data) => setTrip(data.trip))
      .catch(() => {
        /* השרת לא זמין — נשארים עם מה שיש */
      });
  }, [token]);

  useEffect(() => {
    if (!token) {
      setTrip(null);
      return undefined;
    }
    refresh();
    const interval = setInterval(refresh, POLL_MS);
    return () => clearInterval(interval);
  }, [token, refresh]);

  const startTrip = useCallback(
    async (venueId) => {
      const data = await api.post('/trips', { venueId });
      setTrip(data.trip);
      return data.trip;
    },
    []
  );

  const addTripItem = useCallback(
    async (product) => {
      if (!trip) return;
      const data = await api.post(`/trips/${trip.id}/items`, {
        productId: product.id,
        name: product.name,
        price: product.price,
        department: product.department,
        shelf: product.shelf,
        zone: product.zone,
        barcode: product.barcode,
      });
      setTrip(data.trip);
    },
    [trip]
  );

  const toggleTripItem = useCallback(
    async (itemId) => {
      if (!trip) return;
      const data = await api.post(`/trips/${trip.id}/items/${itemId}/toggle`);
      setTrip(data.trip);
    },
    [trip]
  );

  const removeTripItem = useCallback(
    async (itemId) => {
      if (!trip) return;
      const data = await api.post(`/trips/${trip.id}/items/${itemId}/remove`);
      setTrip(data.trip);
    },
    [trip]
  );

  const finishTrip = useCallback(async () => {
    if (!trip) return;
    await api.post(`/trips/${trip.id}/finish`);
    setTrip(null);
  }, [trip]);

  return { trip, startTrip, addTripItem, toggleTripItem, removeTripItem, finishTrip };
}
