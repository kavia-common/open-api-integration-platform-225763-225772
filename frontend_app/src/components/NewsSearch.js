import React, { useState } from 'react';

// PUBLIC_INTERFACE
export default function NewsSearch({ onSearch }) {
  /** Search form with query, sort, and language options. */
  const [q, setQ] = useState('');
  const [sortBy, setSortBy] = useState('publishedAt');
  const [language, setLanguage] = useState('en');

  const handleSubmit = (e) => {
    e.preventDefault();
    onSearch?.({ q, sortBy, language, page: 1 });
  };

  return (
    <form onSubmit={handleSubmit} className="news-card" style={{ marginBottom: 16 }}>
      <div className="row" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <input
          className="input"
          type="text"
          placeholder="Search articles..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="Search query"
          style={{ flex: 2, minWidth: 200 }}
        />
        <select
          className="select"
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          aria-label="Sort by"
          style={{ flex: 1, minWidth: 160 }}
        >
          <option value="publishedAt">Latest</option>
          <option value="relevancy">Relevancy</option>
          <option value="popularity">Popularity</option>
        </select>
        <select
          className="select"
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          aria-label="Language"
          style={{ flex: 1, minWidth: 140 }}
        >
          <option value="ar">Arabic</option>
          <option value="de">German</option>
          <option value="en">English</option>
          <option value="es">Spanish</option>
          <option value="fr">French</option>
          <option value="he">Hebrew</option>
          <option value="it">Italian</option>
          <option value="nl">Dutch</option>
          <option value="no">Norwegian</option>
          <option value="pt">Portuguese</option>
          <option value="ru">Russian</option>
          <option value="sv">Swedish</option>
          <option value="ud">Urdu</option>
          <option value="zh">Chinese</option>
        </select>
        <button className="btn" type="submit" style={{ minWidth: 120 }}>
          Search
        </button>
      </div>
    </form>
  );
}
