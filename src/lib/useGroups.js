import { useSyncExternalStore } from 'react';
import { getGroupsState, subscribeGroups } from './groups';

export function useGroups() {
  return useSyncExternalStore(subscribeGroups, getGroupsState);
}
