import { useSyncExternalStore } from 'react';
import { getFavorites, subscribeFavorites } from './favorites';

export function useFavorites() {
  return useSyncExternalStore(subscribeFavorites, getFavorites);
}
