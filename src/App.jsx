import { lazy, Suspense, useEffect, useState } from 'react';
import './App.css';
import Home from './components/Home';
const Navigation = lazy(() => import('./components/Navigation'));
const StoreMap = lazy(() => import('./components/StoreMap'));
const PriceComparison = lazy(() => import('./components/PriceComparison'));
import Icon from './components/Icon';
import IconSprite from './components/IconSprite';
import UserButton from './components/UserButton';
import AuthGate from './components/AuthGate';
import { useShoppingList } from './lib/useShoppingList';
import { useHouseholdSync } from './lib/useHouseholdSync';
import { useAuth } from './lib/useAuth';
import { useGroupHome } from './lib/useGroupHome';

// דף הבית והניווט הם הליבה; כלים משניים נשארים זמינים בטאבים שלהם.
const TABS = [
  { id: 'home', icon: 'home', label: 'דף בית' },
  { id: 'map', icon: 'map', label: 'מפת חנות' },
  { id: 'compare', icon: 'tag', label: 'השוואת מחירים' },
  { id: 'nav', icon: 'compass', label: 'ניווט' },
];

export default function App() {
  const [tab, setTab] = useState('home');
  const [activeGroupId, setActiveGroupId] = useState(null);
  const { user } = useAuth();
  const list = useShoppingList(user?.id);
  const groupHome = useGroupHome(activeGroupId);
  useHouseholdSync();

  useEffect(() => {
    setActiveGroupId(null);
  }, [user?.id]);

  const navigationList = activeGroupId
    ? {
        items: groupHome.items,
        togglePicked: (id) => groupHome.updateItem(id, { picked: !groupHome.items.find((item) => item.id === id)?.picked }),
        addItem: groupHome.addItem,
        removeItem: groupHome.removeItem,
        clear: groupHome.clearItems,
      }
    : list;

  if (!user) return <AuthGate />;

  return (
    <div className="app">
      <IconSprite />
      <header className="app-header">
        <UserButton onSelectGroup={setActiveGroupId} onGroupJoined={setActiveGroupId} activeGroupId={activeGroupId} />
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
            {t.id === 'home' && (activeGroupId ? groupHome.items : list.items).reduce((sum, item) => sum + (item.qty || 1), 0) > 0 && (
              <span className="tab-badge">{(activeGroupId ? groupHome.items : list.items).reduce((sum, item) => sum + (item.qty || 1), 0)}</span>
            )}
          </button>
        ))}
      </nav>

      <main className="app-main">
        <Suspense fallback={<p className="loading-hint">טוען מסך…</p>}>
          {tab === 'home' && <Home list={list} onNavigate={setTab} groupId={activeGroupId} onExitGroup={() => setActiveGroupId(null)} />}
          {tab === 'map' && <StoreMap />}
          {tab === 'compare' && <PriceComparison />}
          {tab === 'nav' && <Navigation list={navigationList} onBack={() => setTab('home')} />}
        </Suspense>
      </main>
    </div>
  );
}
