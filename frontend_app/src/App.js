import React, { useState, useEffect } from 'react';
import './App.css';
import TopHeadlinesView from './views/TopHeadlinesView';
import SearchView from './views/SearchView';

// PUBLIC_INTERFACE
function App() {
  /** Root application component with theme toggle and news tabs. */
  const [theme, setTheme] = useState('light');
  const [tab, setTab] = useState('headlines'); // 'headlines' | 'search'

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // PUBLIC_INTERFACE
  const toggleTheme = () => {
    setTheme(prevTheme => prevTheme === 'light' ? 'dark' : 'light');
  };

  return (
    <div className="App">
      <nav className="navbar">
        <div style={{ fontWeight: 800, color: 'var(--text-secondary)', marginRight: 12 }}>
          Ocean News
        </div>
        <button
          className={`tab ${tab === 'headlines' ? 'active' : ''}`}
          onClick={() => setTab('headlines')}
        >
          Top Headlines
        </button>
        <button
          className={`tab ${tab === 'search' ? 'active' : ''}`}
          onClick={() => setTab('search')}
        >
          Search
        </button>
        <div style={{ marginLeft: 'auto' }}>
          <button
            className="btn"
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
          >
            {theme === 'light' ? '🌙 Dark' : '☀️ Light'}
          </button>
        </div>
      </nav>

      <main className="container">
        {tab === 'headlines' ? <TopHeadlinesView /> : <SearchView />}
        <footer style={{ marginTop: 24, fontSize: 12, color: '#6b7280' }}>
          Powered by NewsAPI.org
        </footer>
      </main>
    </div>
  );
}

export default App;
