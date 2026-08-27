const STORAGE_KEY = 'supernav_comparison_hidden_venues_v1';
const CHAIN_FILTER_KEY = 'supernav_comparison_chain_filter_v1';

// ברירת-מחדל: משווים רק בין שלוש הרשתות הכי נפוצות (רמי לוי, שופרסל,
// יוחננוף) — לא כל הרשתות שהמשפחה אי-פעם ייבאה מחיר עבורן. משתמש
// יכול לעבור למצב "כל הרשתות", או לבחור-רשתות משלו.
export const DEFAULT_CHAINS = ['רמי לוי', 'שופרסל', 'יוחננוף'];

let hiddenVenueNames = readHidden();
let chainFilter = readChainFilter();
const listeners = new Set();

function readHidden() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(parsed) ? [...new Set(parsed.filter((name) => typeof name === 'string' && name.trim()))] : [];
  } catch {
    return [];
  }
}

function readChainFilter() {
  try {
    const parsed = JSON.parse(localStorage.getItem(CHAIN_FILTER_KEY));
    if (parsed && typeof parsed === 'object' && Array.isArray(parsed.selectedChains)) {
      return { showAllChains: !!parsed.showAllChains, selectedChains: [...new Set(parsed.selectedChains)] };
    }
  } catch {
    /* ignore */
  }
  return { showAllChains: false, selectedChains: [...DEFAULT_CHAINS] };
}

function commit(next) {
  hiddenVenueNames = [...new Set(next)];
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(hiddenVenueNames)); } catch { /* storage unavailable */ }
  listeners.forEach((listener) => listener());
}

function commitChainFilter(next) {
  chainFilter = next;
  try { localStorage.setItem(CHAIN_FILTER_KEY, JSON.stringify(chainFilter)); } catch { /* storage unavailable */ }
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

// venueName הוא תמיד "{chainName} · {branchName}" (ר' server/routes/priceImport.js).
export function chainOfVenueName(venueName) {
  return (venueName || '').split(' · ')[0];
}

export function getChainFilter() { return chainFilter; }

export function setShowAllChains(showAllChains) {
  commitChainFilter({ ...chainFilter, showAllChains });
}

export function setChainSelected(chainName, selected) {
  const without = chainFilter.selectedChains.filter((name) => name !== chainName);
  commitChainFilter({ ...chainFilter, selectedChains: selected ? [...without, chainName] : without });
}

export function isVenueVisible(venueName) {
  if (hiddenVenueNames.includes(venueName)) return false;
  if (chainFilter.showAllChains) return true;
  return chainFilter.selectedChains.includes(chainOfVenueName(venueName));
}
