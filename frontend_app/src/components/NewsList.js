import React from 'react';

function formatDate(iso) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso || '';
  }
}

function SkeletonCard() {
  return (
    <div className="news-card skeleton">
      <div className="skeleton-image" />
      <div className="skeleton-line" />
      <div className="skeleton-line short" />
    </div>
  );
}

// PUBLIC_INTERFACE
export default function NewsList({ articles, loading, error }) {
  /** List of news article cards with loading and error states. */
  if (loading) {
    return (
      <div className="grid">
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-banner" role="alert">
        {error}
      </div>
    );
  }

  if (!articles || articles.length === 0) {
    return <div className="empty">No articles found.</div>;
  }

  return (
    <div className="grid">
      {articles.map((a, idx) => (
        <article key={`${a.url || idx}`} className="news-card">
          {a.urlToImage ? (
            <div className="thumb" style={{ backgroundImage: `url(${a.urlToImage})` }} aria-hidden="true" />
          ) : (
            <div className="thumb placeholder" />
          )}
          <div className="content">
            <h3 className="title">{a.title}</h3>
            <div className="meta">
              <span className="source">{a.source?.name || 'Unknown source'}</span>
              <span className="dot">•</span>
              <time dateTime={a.publishedAt}>{formatDate(a.publishedAt)}</time>
            </div>
            {a.description && <p className="desc">{a.description}</p>}
            {a.url && (
              <a className="link" href={a.url} target="_blank" rel="noopener noreferrer">
                Read full article →
              </a>
            )}
          </div>
        </article>
      ))}
    </div>
  );
}
