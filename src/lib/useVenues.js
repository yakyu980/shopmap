import { useEffect } from 'react';
import { useSyncExternalStore } from 'react';
import { useAuth } from './useAuth';
import { getVenuesState, subscribeVenues, refreshVenues, createVenue } from './venues';

export function useVenues() {
  const { token } = useAuth();
  const state = useSyncExternalStore(subscribeVenues, getVenuesState);

  useEffect(() => {
    if (token) refreshVenues();
  }, [token]);

  return { venues: state.venues, createVenue };
}
