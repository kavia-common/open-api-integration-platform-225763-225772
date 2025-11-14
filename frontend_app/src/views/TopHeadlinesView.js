import React, { useEffect, useMemo, useState } from 'react';
import NewsList from '../components/NewsList';
import { getTopHeadlines } from '../services/newsApi';

const categories = ['', 'business', 'entertainment', 'general', 'health', 'science', 'sports', 'technology'];
const countries = ['us', 'gb', 'ca', 'au', 'de', 'fr', 'in', 'it', 'jp', 'za'];

// PUBLIC_INTERFACE
export default function TopHeadlinesView() {
  /** Top headlines with country and category filters. */
  const [country, setCountry] = useState('us');
  const [category, setCategory] = useState('');
  const [page] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [articles, setArticles] = useState([]);

  const fetchParams = useMemo(() => ({ country, category: category || undefined, pageSize: 12, page }), [country, category, page]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    getTopHeadlines(fetchParams, controller.signal)
      .then((res) => {
        setArticles(res.articles);
      })
      .catch((e) => {
        setError(e?.message || 'Failed to load top headlines.');
        setArticles([]);
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [fetchParams]);

  return (
    <section>
      <div className="toolbar news-card" style={{ marginBottom: 16 }}>
        <div className="row" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <label className="label">
            Country
            <select
              className="select"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              aria-label="Country"
            >
              {countries.map((c) => (
                <option key={c} value={c}>{c.toUpperCase()}</option>
              ))}
            </select>
          </label>
          <label className="label">
            Category
            <select
              className="select"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              aria-label="Category"
            >
              {categories.map((c) => (
                <option key={c || 'all'} value={c}>{c ? c[0].toUpperCase() + c.slice(1) : 'All'}</option>
              ))}
            </select>
          </label>
        </div>
      </div>
      <NewsList articles={articles} loading={loading} error={error} />
    </section>
  );
}
