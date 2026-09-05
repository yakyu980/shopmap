import { useCallback, useEffect, useState } from 'react';
import { fetchGroupHome, addGroupHomeItem, updateGroupHomeItem, removeGroupHomeItem, clearGroupHomeItems, reorderGroupHomeItems, importGroupHomeItems, addGroupFavorite, removeGroupFavorite, setGroupVenue } from './groupHome';
import { getToken } from './apiClient';

// Fallback מהיר עד הפעלת Supabase Realtime. כשהחלון ברקע עוצרים את
// הבקשות כדי לא להעמיס על השרת; בחזרה למסך מתבצע רענון מידי.
// Realtime הוא המסלול הראשי. polling איטי משמש רק כשחיבור האירועים לא זמין,
// כדי למנוע 429 ועומס מיותר על Render.
const POLL_MS = 5000;

export function useGroupHome(groupId) {
  const [group, setGroup] = useState(null);
  const [error, setError] = useState('');

  const refresh = useCallback(() => {
    if (!groupId) return;
    fetchGroupHome(groupId).then(setGroup).catch((err) => setError(err.message || 'טעינת הקבוצה נכשלה'));
  }, [groupId]);

  useEffect(() => {
    setGroup(null);
    setError('');
    if (!groupId) return undefined;
    refresh();
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible' && !realtimeConnected) refresh();
    }, POLL_MS);
    const token = getToken();
    const eventsUrl = `${import.meta.env.VITE_API_URL || '/api'}/groups/${groupId}/home/events`;
    const controller = new AbortController();
    let eventReader;
    let realtimeConnected = false;
    if (token && typeof fetch === 'function') {
      fetch(eventsUrl, { headers: { Authorization: `Bearer ${token}` }, signal: controller.signal })
        .then(async (response) => {
          if (!response.ok || !response.body) return;
          realtimeConnected = true;
          eventReader = response.body.getReader();
          const decoder = new TextDecoder();
          let buffer = '';
          while (!controller.signal.aborted) {
            const { value, done } = await eventReader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const events = buffer.split('\n\n'); buffer = events.pop() || '';
            if (events.some((event) => event.includes('event: shopping_item'))) refresh();
          }
        })
        .catch(() => { /* polling remains the safe fallback */ });
    }
    const onVisible = () => { if (document.visibilityState === 'visible') refresh(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => { clearInterval(interval); controller.abort(); eventReader?.cancel?.(); document.removeEventListener('visibilitychange', onVisible); };
  }, [groupId, refresh]);

  const addItem = useCallback(async (product) => {
    const optimisticId = `pending-${Date.now()}`;
    setGroup((current) => {
      if (!current) return current;
      const existing = product.id && current.shoppingItems.find((item) => item.productId === product.id);
      const shoppingItems = existing
        ? current.shoppingItems.map((item) => item.id === existing.id ? { ...item, qty: (item.qty || 1) + 1 } : item)
        : [...current.shoppingItems, { ...product, id: optimisticId, productId: product.id, qty: 1, picked: false, addedBy: 'את/ה' }];
      return { ...current, shoppingItems };
    });
    try { setGroup(await addGroupHomeItem(groupId, product)); setError(''); }
    catch (err) { setError(err.message || 'לא ניתן להוסיף לקבוצה'); refresh(); }
  }, [groupId, refresh]);
  const updateItem = useCallback(async (itemId, changes) => {
    try { setGroup(await updateGroupHomeItem(groupId, itemId, changes)); setError(''); }
    catch (err) { setError(err.message || 'לא ניתן לעדכן את הקבוצה'); }
  }, [groupId]);
  const removeItem = useCallback(async (itemId) => {
    try { setGroup(await removeGroupHomeItem(groupId, itemId)); setError(''); }
    catch (err) { setError(err.message || 'לא ניתן להסיר מהקבוצה'); }
  }, [groupId]);
  const clearItems = useCallback(async () => {
    try { setGroup(await clearGroupHomeItems(groupId)); setError(''); }
    catch (err) { setError(err.message || 'לא ניתן לנקות את רשימת הקבוצה'); }
  }, [groupId]);
  const reorderItems = useCallback(async (fromId, toId) => {
    try { setGroup(await reorderGroupHomeItems(groupId, fromId, toId)); setError(''); }
    catch (err) { setError(err.message || 'לא ניתן לשנות את סדר הקבוצה'); }
  }, [groupId]);
  const importItems = useCallback(async (items) => {
    try { const data = await importGroupHomeItems(groupId, items); setGroup(data.group); setError(data.rejected?.length ? `לא הועברו: ${data.rejected.join(', ')}` : ''); }
    catch (err) { setError(err.message || 'לא ניתן להעביר את המוצרים לקבוצה'); }
  }, [groupId]);
  const addFavorite = useCallback(async (favorite) => {
    try { setGroup(await addGroupFavorite(groupId, favorite)); setError(''); }
    catch (err) { setError(err.message || 'לא ניתן להוסיף מועדף לקבוצה'); }
  }, [groupId]);
  const removeFavorite = useCallback(async (favoriteId) => {
    try { setGroup(await removeGroupFavorite(groupId, favoriteId)); setError(''); }
    catch (err) { setError(err.message || 'לא ניתן להסיר מועדף מהקבוצה'); }
  }, [groupId]);
  const updateVenue = useCallback(async (venueId) => {
    try { setGroup(await setGroupVenue(groupId, venueId)); setError(''); }
    catch (err) { setError(err.message || 'לא ניתן לשמור את הסניף'); }
  }, [groupId]);

  return { group, items: group?.shoppingItems || [], favorites: group?.favorites || [], error, addItem, updateItem, removeItem, clearItems, reorderItems, importItems, addFavorite, removeFavorite, updateVenue, refresh };
}
