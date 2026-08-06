import { useSyncExternalStore } from 'react';
import { getAuthState, subscribeAuth } from './auth';

export function useAuth() {
  return useSyncExternalStore(subscribeAuth, getAuthState);
}
