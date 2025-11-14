import React, { useState } from 'react';
import NewsSearch from '../components/NewsSearch';
import NewsList from '../components/NewsList';
import { searchEverything } from '../services/newsApi';

// PUBLIC_INTERFACE
export default function SearchView() {
  /** Search view for querying articles with sort/language controls. */
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [articles, setArticles] = useState([]);

  const handleSearch = async (params) => {
    setLoading(true);
    setError('');
    const controller = new AbortController();
    try {
      const res = await searchEverything(params, controller.signal);
      setArticles(res.articles);
      if (!res.articles?.length) {
        setError('No results found for your query.');
      }
    } catch (e) {
      setArticles([]);
      const msg = e?.message || 'Failed to search news.';
      const enriched =
        e?.code === 'NETWORK'
          ? `${msg} If you're using a proxy, ensure REACT_APP_NEWS_API_BASE points to it and that the proxy is running. Otherwise verify CORS/network access and try again.`
          : e?.code === 'CONFIG'
          ? `${msg} For direct NewsAPI usage, set REACT_APP_NEWS_API_KEY. To avoid CORS, set REACT_APP_NEWS_API_BASE to your proxy (e.g., http://localhost:3010/api/news).`
          : msg;
      setError(enriched);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section>
      <NewsSearch onSearch={handleSearch} />
      <NewsList articles={articles} loading={loading} error={error} />
    </section>
  );
}
