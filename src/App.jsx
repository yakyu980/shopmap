import { useState } from 'react';
import './App.css';
import StoreMap from './components/StoreMap';
import ShoppingList from './components/ShoppingList';
import Navigation from './components/Navigation';
import PointsBadge from './components/PointsBadge';
import { useShoppingList } from './lib/useShoppingList';

const TABS = [
  { id: 'map', label: '🗺️ מפת חנות' },
  { id: 'list', label: '📝 רשימת קניות' },
  { id: 'nav', label: '🧭 ניווט' },
];

export default function App() {
  const [tab, setTab] = useState('list');
  const list = useShoppingList();

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-header-row">
          <h1>SuperNav AI</h1>
          <PointsBadge />
        </div>
        <p className="app-tagline">ה-Waze של הסופר — MVP הדגמה</p>
      </header>

      <nav className="tabs">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={'tab' + (tab === t.id ? ' tab--active' : '')}
            onClick={() => setTab(t.id)}
          >
            {t.label}
            {t.id === 'list' && list.items.length > 0 && (
              <span className="tab-badge">{list.items.length}</span>
            )}
          </button>
        ))}
      </nav>

      <main className="app-main">
        {tab === 'map' && <StoreMap />}
        {tab === 'list' && <ShoppingList list={list} onGoNavigate={() => setTab('nav')} />}
        {tab === 'nav' && <Navigation list={list} onBack={() => setTab('list')} />}
      </main>
    </div>
  );
}
