import { useEffect, useMemo, useState } from 'react';
import { PRODUCTS, locationLabel, searchProducts } from '../data/storeData';
import { getDepartment } from '../lib/storeConfig';
import { useSpeechRecognition } from '../lib/useSpeechRecognition';
import ProductDetail from './ProductDetail';
import PriceTag from './PriceTag';

export default function ProductSearch({ onAdd, listedIds }) {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(null);
  const speech = useSpeechRecognition();

  useEffect(() => {
    if (speech.transcript) setQuery(speech.transcript);
  }, [speech.transcript]);

  const results = useMemo(() => {
    if (!query.trim()) return PRODUCTS.slice(0, 8);
    return searchProducts(query);
  }, [query]);

  return (
    <div className="product-search">
      <div className="search-input-row">
        <input
          className="search-input"
          type="text"
          placeholder="🔍 חפש מוצר… (למשל: חלב, קטשופ)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {speech.supported && (
          <button
            className={'btn btn--icon voice-search-btn' + (speech.listening ? ' voice-search-btn--live' : '')}
            onClick={() => (speech.listening ? speech.stop() : speech.start())}
            aria-label="חיפוש קולי"
            title="חיפוש קולי"
          >
            🎤
          </button>
        )}
      </div>
      <ul className="product-list">
        {results.map((p) => {
          const dept = getDepartment(p.department);
          const inList = listedIds.has(p.id);
          return (
            <li className="product-row" key={p.id}>
              <button className="product-row-main" onClick={() => setSelected(p)}>
                <span className="product-row-icon">{dept.icon}</span>
                <span className="product-row-info">
                  <span className="product-row-name">{p.name}</span>
                  <span className="product-row-loc">
                    {dept.name} · {locationLabel(p)}
                  </span>
                </span>
                <span className="product-row-price">
                  <PriceTag product={p} size="small" />
                </span>
              </button>
              <button
                className={'btn btn--icon' + (inList ? ' btn--added' : '')}
                onClick={() => onAdd(p)}
                aria-label="הוסף לרשימה"
                title={inList ? 'ברשימה' : 'הוסף לרשימה'}
              >
                {inList ? '✓' : '➕'}
              </button>
            </li>
          );
        })}
        {query.trim() && results.length === 0 && (
          <li className="product-empty">לא נמצאו מוצרים תואמים</li>
        )}
      </ul>

      {selected && (
        <ProductDetail
          product={selected}
          onClose={() => setSelected(null)}
          onAdd={(p) => {
            onAdd(p);
            setSelected(null);
          }}
        />
      )}
    </div>
  );
}
