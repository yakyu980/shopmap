import { useSyncExternalStore } from 'react';
import Icon from './Icon';
import CloseButton from './CloseButton';
import {
  DEFAULT_CHAINS,
  chainOfVenueName,
  getChainFilter,
  getHiddenComparisonVenues,
  setChainSelected,
  setComparisonVenueVisible,
  setShowAllChains,
  subscribeComparisonVenues,
} from '../lib/comparisonVenues';

// venueNames: כל שמות-הרשת (chainName · branchName) שראינו בפועל
// בנתוני המחירים שנטענו עד כה — לא כל venue שהמשפחה אי-פעם הוסיפה.
export default function VenueFilterPanel({ venueNames, onClose }) {
  const chainFilter = useSyncExternalStore(subscribeComparisonVenues, getChainFilter);
  const hiddenVenues = useSyncExternalStore(subscribeComparisonVenues, getHiddenComparisonVenues);

  const chainsSeen = [...new Set(venueNames.map(chainOfVenueName))];
  const allChains = [...new Set([...DEFAULT_CHAINS, ...chainsSeen])];
  const branchesByChain = new Map();
  for (const name of venueNames) {
    const chain = chainOfVenueName(name);
    if (!branchesByChain.has(chain)) branchesByChain.set(chain, []);
    branchesByChain.get(chain).push(name);
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal venue-filter-modal" onClick={(e) => e.stopPropagation()}>
        <CloseButton onClick={onClose} />
        <h2>
          <Icon name="tag" /> אילו רשתות וסניפים להשוות
        </h2>

        <label className="venue-filter-toggle">
          <input
            type="checkbox"
            checked={chainFilter.showAllChains}
            onChange={(e) => setShowAllChains(e.target.checked)}
          />
          <span>השוואה כללית — כל הרשתות שיש להן מחיר</span>
        </label>

        {!chainFilter.showAllChains && (
          <>
            <p className="settings-hint">או בחרו רשתות ספציפיות להשוואה:</p>
            <ul className="venue-filter-chain-list">
              {allChains.map((chain) => (
                <li key={chain}>
                  <label className="venue-filter-chain-row">
                    <input
                      type="checkbox"
                      checked={chainFilter.selectedChains.includes(chain)}
                      onChange={(e) => setChainSelected(chain, e.target.checked)}
                    />
                    <span>{chain}</span>
                  </label>
                  {branchesByChain.has(chain) && (
                    <ul className="venue-filter-branch-list">
                      {branchesByChain.get(chain).map((venueName) => (
                        <li key={venueName}>
                          <label className="venue-filter-branch-row">
                            <input
                              type="checkbox"
                              checked={!hiddenVenues.includes(venueName)}
                              onChange={(e) => setComparisonVenueVisible(venueName, e.target.checked)}
                            />
                            <span>{venueName.split(' · ')[1] || venueName}</span>
                          </label>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          </>
        )}

        {chainFilter.showAllChains && venueNames.length > 0 && (
          <>
            <p className="settings-hint">אפשר גם להסתיר סניף ספציפי מההשוואה הכללית:</p>
            <ul className="venue-filter-branch-list venue-filter-branch-list--flat">
              {venueNames.map((venueName) => (
                <li key={venueName}>
                  <label className="venue-filter-branch-row">
                    <input
                      type="checkbox"
                      checked={!hiddenVenues.includes(venueName)}
                      onChange={(e) => setComparisonVenueVisible(venueName, e.target.checked)}
                    />
                    <span>{venueName}</span>
                  </label>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}
