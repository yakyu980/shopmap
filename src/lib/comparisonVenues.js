const STORAGE_KEY = 'supernav_comparison_hidden_venues_v1';

let hiddenVenueNames = readHidden();
const listeners = new Set();

function readHidden() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(parsed) ? [...new Set(parsed.filter((name) => typeof name === 'string' && name.trim()))] : [];
  } catch {
    return [];
  }
}

function commit(next) {
  hiddenVenueNames = [...new Set(next)];
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(hiddenVenueNames)); } catch { /* storage unavailable */ }
  listeners.forEach((listener) => listener());
}

export function subscribeComparisonVenues(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getHiddenComparisonVenues() { return hiddenVenueNames; }

export function setComparisonVenueVisible(venueName, visible) {
  if (!venueName) return;
  commit(visible ? hiddenVenueNames.filter((name) => name !== venueName) : [...hiddenVenueNames, venueName]);
}

export function includeComparisonVenue(venueName) { setComparisonVenueVisible(venueName, true); }
