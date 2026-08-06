import { useSyncExternalStore } from 'react';
import { getReceipts, subscribeReceipts } from './receiptHistory';

export function useReceiptHistory() {
  return useSyncExternalStore(subscribeReceipts, getReceipts);
}
