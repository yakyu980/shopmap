import { useCallback, useEffect, useState } from 'react';

const KEY_PREFIX = 'supernav_shopping_list_v2_';

function load(userId) {
  if (!userId) return [];
  try {
    return JSON.parse(localStorage.getItem(KEY_PREFIX + userId)) || [];
  } catch {
    return [];
  }
}

export function useShoppingList(userId) {
  const [items, setItems] = useState(() => load(userId));
  const [loadedForUser, setLoadedForUser] = useState(userId);

  useEffect(() => {
    if (loadedForUser !== userId) {
      setItems(load(userId));
      setLoadedForUser(userId);
    }
  }, [userId, loadedForUser]);

  useEffect(() => {
    try {
      if (userId && loadedForUser === userId) localStorage.setItem(KEY_PREFIX + userId, JSON.stringify(items));
    } catch {
      /* אחסון מלא/חסום — מתעלמים */
    }
  }, [items, userId, loadedForUser]);

  const addItem = useCallback((product) => {
    setItems((prev) =>
      prev.some((i) => i.id === product.id)
        ? prev
        : [...prev, { ...product, qty: 1, picked: false, assignee: null }]
    );
  }, []);

  const removeItem = useCallback((productId) => {
    setItems((prev) => prev.filter((i) => i.id !== productId));
  }, []);

  const incrementItem = useCallback((product) => {
    setItems((prev) =>
      prev.some((i) => i.id === product.id)
        ? prev.map((i) => (i.id === product.id ? { ...i, qty: (i.qty || 1) + 1 } : i))
        : [...prev, { ...product, qty: 1, picked: false, assignee: null }]
    );
  }, []);

  const decrementItem = useCallback((productId) => {
    setItems((prev) =>
      prev
        .map((i) => (i.id === productId ? { ...i, qty: (i.qty || 1) - 1 } : i))
        .filter((i) => (i.qty || 1) > 0)
    );
  }, []);

  const updateItem = useCallback((productId, changes) => {
    setItems((prev) => prev.map((item) => (item.id === productId ? { ...item, ...changes } : item)));
  }, []);

  const reorderItems = useCallback((fromId, toId) => {
    setItems((prev) => {
      const fromIdx = prev.findIndex((i) => i.id === fromId);
      const toIdx = prev.findIndex((i) => i.id === toId);
      if (fromIdx === -1 || toIdx === -1 || fromIdx === toIdx) return prev;
      const next = [...prev];
      const [moved] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, moved);
      return next;
    });
  }, []);

  const togglePicked = useCallback((productId) => {
    setItems((prev) =>
      prev.map((i) => (i.id === productId ? { ...i, picked: !i.picked } : i))
    );
  }, []);

  const assignItem = useCallback((productId, memberId) => {
    setItems((prev) =>
      prev.map((i) => (i.id === productId ? { ...i, assignee: memberId } : i))
    );
  }, []);

  const clear = useCallback(() => setItems([]), []);

  return {
    items,
    addItem,
    removeItem,
    incrementItem,
    decrementItem,
    updateItem,
    reorderItems,
    togglePicked,
    assignItem,
    clear,
  };
}
