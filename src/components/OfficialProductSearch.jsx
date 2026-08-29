import { useEffect, useState } from 'react';
import { api } from '../lib/apiClient';
import Icon from './Icon';

export default function OfficialProductSearch({ onSelect, placeholder = 'חפשו מוצר אמיתי לפי שם…' }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [status, setStatus] = useState('idle');
  const [sortBy, setSortBy] = useState('coverage');

  useEffect(() => {
    const clean = query.trim();
    if (clean.length < 2) {
      setResults([]);
      setStatus('idle');
      return undefined;
    }
    let cancelled = false;
    setStatus('loading');
    const timer = setTimeout(() => {
      api.get(`/price-import/catalog/search?q=${encodeURIComponent(clean)}`)
        .then((data) => {
          if (cancelled) return;
          setResults(data.products || []);
          setStatus(data.cityCode === null ? 'needs-city' : 'ready');
        })
        .catch(() => { if (!cancelled) setStatus('error'); });
    }, 250);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [query]);

  function choose(product) {
    onSelect({
      id: `official-${product.barcode}`,
      barcode: product.barcode,
      name: product.name,
      price: product.minPrice,
      official: true,
    });
    setQuery('');
    setResults([]);
  }

  const sortedResults = [...results].sort((a, b) => {
    if (sortBy === 'price') return a.minPrice - b.minPrice;
    if (sortBy === 'name') return a.name.localeCompare(b.name, 'he');
    return b.venueCount - a.venueCount || a.minPrice - b.minPrice;
  });

  return (
    <div className="official-product-search">
      <label className="official-product-search__field">
        <Icon name="search" />
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={placeholder} />
        {status === 'loading' && <span aria-live="polite">טוען…</span>}
      </label>
      {query.trim().length >= 2 && (
        <div className="official-product-search__results">
          {results.length > 1 && <div className="official-product-search__sort"><span>סידור מוצרים</span><select value={sortBy} onChange={(event) => setSortBy(event.target.value)} aria-label="סידור תוצאות מוצרים"><option value="coverage">הכי הרבה סופרים</option><option value="price">המחיר הנמוך ביותר</option><option value="name">שם המוצר</option></select></div>}
          {status === 'error' && <p className="login-error"><Icon name="warning" /> לא הצלחנו לטעון את מאגר המחירים.</p>}
          {status === 'needs-city' && <p className="cmp-empty"><Icon name="location" /> בחרו עיר בהגדרות כדי לראות מחירים אמיתיים.</p>}
          {status === 'ready' && results.length === 0 && <p className="cmp-empty">לא נמצא מוצר במאגר הרשמי.</p>}
          {sortedResults.map((product) => (
            <button type="button" key={product.barcode} onClick={() => choose(product)}>
              <span><strong>{product.name}</strong><small>{product.venueCount} סניפים עם מחיר</small></span>
              <b>החל מ־₪{product.minPrice.toFixed(2)}</b>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
