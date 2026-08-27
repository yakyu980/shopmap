import { useState } from 'react';
import './App.css';
import Home from './components/Home';
import StoreMap from './components/StoreMap';
import ShoppingList from './components/ShoppingList';
import PriceComparison from './components/PriceComparison';
import Navigation from './components/Navigation';
import Settings from './components/Settings';
import Icon from './components/Icon';
import IconSprite from './components/IconSprite';
import { useShoppingList } from './lib/useShoppingList';
import { useHouseholdSync } from './lib/useHouseholdSync';

const TABS = [
  { id: 'home', icon: 'home', label: 'דף בית' },
  { id: 'map', icon: 'map', label: 'מפת חנות' },
  { id: 'list', icon: 'list', label: 'רשימת קניות' },
  { id: 'compare', icon: 'tag', label: 'השוואת מחירים' },
  { id: 'nav', icon: 'compass', label: 'ניווט' },
];

export default function App() {
  const [tab, setTab] = useState('home');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const list = useShoppingList();
  useHouseholdSync();

  return (
    <div className="app">
      <IconSprite />
      <header className="app-header">
        <button
          className="settings-gear-btn"
          onClick={() => setSettingsOpen(true)}
          aria-label="הגדרות"
        >
          <Icon name="gear" />
        </button>
        <h1>SuperNav AI</h1>
        <p className="app-tagline">ה-Waze של הסופר — MVP הדגמה</p>
      </header>

      {settingsOpen && <Settings onClose={() => setSettingsOpen(false)} />}

      <nav className="tabs">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={'tab' + (tab === t.id ? ' tab--active' : '')}
            onClick={() => setTab(t.id)}
          >
            <Icon name={t.icon} />
            {t.label}
            {t.id === 'list' && list.items.length > 0 && (
              <span className="tab-badge">{list.items.length}</span>
            )}
          </button>
        ))}
      </nav>

      <main className="app-main">
        {tab === 'home' && <Home list={list} onNavigate={setTab} />}
        {tab === 'map' && <StoreMap />}
        {tab === 'list' && <ShoppingList list={list} onGoNavigate={() => setTab('nav')} />}
        {tab === 'compare' && <PriceComparison list={list} />}
        {tab === 'nav' && <Navigation list={list} onBack={() => setTab('list')} />}
      </main>
    </div>
  );
}
