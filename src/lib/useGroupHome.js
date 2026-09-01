import { useCallback, useEffect, useState } from 'react';
import { fetchGroupHome, addGroupHomeItem, updateGroupHomeItem, removeGroupHomeItem, clearGroupHomeItems, reorderGroupHomeItems, importGroupHomeItems, addGroupFavorite, removeGroupFavorite } from './groupHome';

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
    const interval = setInterval(refresh, POLL_MS);
    return () => clearInterval(interval);
  }, [groupId, refresh]);

  const addItem = useCallback(async (product) => {
    try { setGroup(await addGroupHomeItem(groupId, product)); setError(''); }
    catch (err) { setError(err.message || 'לא ניתן להוסיף לקבוצה'); }
  }, [groupId]);
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

  return { group, items: group?.shoppingItems || [], favorites: group?.favorites || [], error, addItem, updateItem, removeItem, clearItems, reorderItems, importItems, addFavorite, removeFavorite, refresh };
}
