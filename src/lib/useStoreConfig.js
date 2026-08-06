import { useSyncExternalStore } from 'react';
import { getStoreConfig, subscribeStoreConfig } from './storeConfig';

/** מרנדר-מחדש קומפוננטה כש-storeConfig (מחלקות/גודל-רשת) משתנה. */
export function useStoreConfig() {
  return useSyncExternalStore(subscribeStoreConfig, getStoreConfig);
}
