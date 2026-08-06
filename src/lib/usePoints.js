import { useSyncExternalStore } from 'react';
import { getPointsState, subscribePoints } from './points';

export function usePoints() {
  return useSyncExternalStore(subscribePoints, getPointsState);
}
