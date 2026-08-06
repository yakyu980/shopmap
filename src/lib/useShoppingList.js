import { useCallback, useEffect, useState } from 'react';

const KEY = 'supernav_shopping_list_v1';

function load() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || [];
  } catch {
    return [];
  }
}

export function useShoppingList() {
  const [items, setItems] = useState(load);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(items));
    } catch {
      /* אחסון מלא/חסום — מתעלמים */
    }
  }, [items]);

  const addItem = useCallback((product) => {
    setItems((prev) =>
      prev.some((i) => i.id === product.id) ? prev : [...prev, { ...product, picked: false }]
    );
  }, []);

  const removeItem = useCallback((productId) => {
    setItems((prev) => prev.filter((i) => i.id !== productId));
  }, []);

  const togglePicked = useCallback((productId) => {
    setItems((prev) =>
      prev.map((i) => (i.id === productId ? { ...i, picked: !i.picked } : i))
    );
  }, []);

  const clear = useCallback(() => setItems([]), []);

  return { items, addItem, removeItem, togglePicked, clear };
}
