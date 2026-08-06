import { useSyncExternalStore } from 'react';
import { getFamilyState, subscribeFamily } from './familyMembers';

export function useFamilyMembers() {
  return useSyncExternalStore(subscribeFamily, getFamilyState);
}
