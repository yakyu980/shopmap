import { useState } from 'react';
import './App.css';
import Home from './components/Home';
import StoreMap from './components/StoreMap';
import PriceComparison from './components/PriceComparison';
import DealsTab from './components/DealsTab';
import DeepCompare from './components/DeepCompare';
import Navigation from './components/Navigation';
import Icon from './components/Icon';
import IconSprite from './components/IconSprite';
import { useShoppingList } from './lib/useShoppingList';
import { useHouseholdSync } from './lib/useHouseholdSync';

// "רשימת קניות" אוחדה לתוך "דף בית" (הוסרה כטאב נפרד) — ר' Home.jsx.
const TABS = [
  { id: 'home', icon: 'home', label: 'דף בית' },
  { id: 'map', icon: 'map', label: 'מפת חנות' },
  { id: 'compare', icon: 'tag', label: 'השוואת מחירים' },
  { id: 'deals', icon: 'star', label: 'דילים' },
  { id: 'deep', icon: 'chart', label: 'השוואה מעמיקה' },
  { id: 'nav', icon: 'compass', label: 'ניווט' },
];

export default function App() {
  const [tab, setTab] = useState('home');
  const list = useShoppingList();
  useHouseholdSync();

  return (
    <div className="app">
      <IconSprite />
      <header className="app-header">
        <h1>SuperNav AI</h1>
        <p className="app-tagline">ה-Waze של הסופר — MVP הדגמה</p>
      </header>

      <nav className="tabs">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={'tab' + (tab === t.id ? ' tab--active' : '')}
            onClick={() => setTab(t.id)}
          >
            <Icon name={t.icon} />
            {t.label}
            {t.id === 'home' && list.items.length > 0 && (
              <span className="tab-badge">{list.items.length}</span>
            )}
          </button>
        ))}
      </nav>

      <main className="app-main">
        {tab === 'home' && <Home list={list} onNavigate={setTab} />}
        {tab === 'map' && <StoreMap />}
        {tab === 'compare' && <PriceComparison />}
        {tab === 'deals' && <DealsTab />}
        {tab === 'deep' && <DeepCompare />}
        {tab === 'nav' && <Navigation list={list} onBack={() => setTab('home')} />}
      </main>
    </div>
  );
}
