//
//
// NewsAPI client for fetching top headlines and search results.
// Reads configuration from environment variables and supports proxy usage.
//
// Security: No secrets are hardcoded. The API key must be supplied via REACT_APP_NEWS_API_KEY
// only when calling NewsAPI directly from the browser. When using a backend proxy, the API key
// must remain on the server and should NOT be sent from the browser.
//
// This module adds robust error handling for network/CORS problems and clearer diagnostics.
// It supports two modes:
//  - Direct mode (base includes newsapi.org): endpoints 'top-headlines' and 'everything' with X-Api-Key header
//  - Proxy mode (custom base, e.g., http://localhost:3010/api/news): endpoints 'top-headlines' and 'search' with NO API key header
//
const DEFAULT_BASE = 'https://newsapi.org/v2';

function stripTrailingSlashes(s) {
  return String(s || '').replace(/\/*$/, '');
}

function isProxyBase(base) {
  // Heuristic: if the base includes newsapi.org, treat as direct mode; else proxy mode.
  return !/newsapi\.org/i.test(base || '');
}

// PUBLIC_INTERFACE
export function getNewsApiConfig() {
  /** Get NewsAPI configuration from environment variables with safe defaults.
   *
   * PUBLIC ENV VARS (CRA exposes only REACT_APP_*):
   * - REACT_APP_NEWS_API_BASE: Preferred base URL (proxy like http://localhost:3010/api/news or direct https://newsapi.org/v2)
   * - REACT_APP_NEWS_API_KEY:  Only required in direct mode; do not set/use in proxy mode.
   *
   * Deprecated/misnamed variables (ignored): REACT_APP_NEWS_APP_BASE, REACT_APP_API_BASE, REACT_APP_REACT_APP_NEWSAPI_KEY, REACT_APP_REACT_APP_NEWS_API_BASE
   */
  // Standardize: prefer REACT_APP_NEWS_API_BASE. Fallback to legacy names only if strictly necessary.
  const legacyBase =
    process.env.REACT_APP_REACT_APP_NEWS_API_BASE ||
    process.env.REACT_APP_API_BASE ||
    process.env.REACT_APP_NEWS_APP_BASE;
  const baseRaw = process.env.REACT_APP_NEWS_API_BASE || legacyBase || DEFAULT_BASE;
  const base = stripTrailingSlashes(baseRaw);

  // Note: CRA only exposes REACT_APP_* vars to the browser
  const apiKey = process.env.REACT_APP_NEWS_API_KEY || undefined; // do NOT read misnamed duplicates

  return { base, apiKey };
}

function buildQuery(params = {}) {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    searchParams.set(key, String(value));
  });
  return searchParams.toString();
}

function mapApiError(status, payload) {
  // Provide user-friendly error messages, including 429 handling.
  if (status === 429) {
    return 'Rate limit reached. Please wait a minute before trying again.';
  }
  const message = payload?.message || payload?.error || 'Unexpected error contacting news service.';
  if (status >= 500) {
    return 'News service is currently unavailable. Please try again later.';
  }
  if (status === 401 || status === 403) {
    return 'Unauthorized: Please ensure a valid NewsAPI key is configured (direct mode) or proxy is authorized.';
  }
  return message;
}

/**
 * Determine if error is a browser network/CORS error.
 * In such cases, error.name may be 'TypeError' and error.message includes 'Failed to fetch'.
 */
function isNetworkOrCORSError(err) {
  if (!err) return false;
  const msg = String(err.message || '').toLowerCase();
  return (
    err.name === 'TypeError' &&
    (msg.includes('failed to fetch') ||
      msg.includes('networkerror') ||
      msg.includes('load failed') ||
      msg.includes('cors'))
  );
}

/**
 * Generate a concise, user-friendly error suitable for UI display without leaking secrets.
 */
function toUserFacingError(err, url, mode) {
  if (isNetworkOrCORSError(err)) {
    // Provide guidance on common causes
    const e = new Error(
      `Network/CORS error: Unable to reach the news service (${mode}). If using a proxy, ensure REACT_APP_NEWS_API_BASE points to it and that the proxy is running. Otherwise verify CORS/network access and try again.`
    );
    e.code = 'NETWORK';
    e.details = { url, mode };
    return e;
  }
  return err instanceof Error ? err : new Error('Unexpected error occurred.');
}

/**
 * Internal fetch with mode-aware endpoint resolution and headers.
 * Supported logical endpoints:
 *  - 'top-headlines'
 *  - 'search' (maps to 'search' in proxy mode, 'everything' in direct mode)
 */
async function doFetch(endpoint, params, externalSignal) {
  const { base, apiKey } = getNewsApiConfig();
  const proxy = isProxyBase(base);
  const mode = proxy ? 'proxy' : 'direct';

  if (!/^https?:\/\//i.test(base)) {
    const e = new Error('Invalid NewsAPI base URL. Ensure REACT_APP_NEWS_API_BASE starts with http(s)://');
    e.code = 'CONFIG';
    throw e;
  }

  // In direct mode, API key is required; in proxy mode, do not require or send key.
  if (!proxy && !apiKey) {
    const e = new Error('NewsAPI key is missing. Set REACT_APP_NEWS_API_KEY in your environment or use the proxy.');
    e.code = 'CONFIG';
    throw e;
  }

  // Resolve actual path based on mode
  const path =
    endpoint === 'search'
      ? (proxy ? 'search' : 'everything')
      : endpoint; // 'top-headlines' passes through

  const query = buildQuery(params);
  const url = `${base}/${path}${query ? `?${query}` : ''}`;

  // Merge signals and provide a default timeout to prevent hanging requests
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000); // 15s timeout
  const linkSignal = (sig) => {
    if (sig) {
      if (sig.aborted) controller.abort();
      else sig.addEventListener('abort', () => controller.abort(), { once: true });
    }
  };
  linkSignal(externalSignal);

  let res;
  try {
    res = await fetch(url, {
      method: 'GET',
      headers: proxy
        ? {} // No key sent in proxy mode
        : {
            'X-Api-Key': apiKey,
          },
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timeout);
    throw toUserFacingError(err, url, mode);
  }
  clearTimeout(timeout);

  let data;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  if (!res.ok || data?.status === 'error') {
    const errMsg = mapApiError(res.status, data);
    const e = new Error(errMsg);
    e.status = res.status;
    e.details = data;
    throw e;
  }
  return data;
}

// PUBLIC_INTERFACE
export async function getTopHeadlines(
  { country = 'us', category, pageSize = 10, page = 1 } = {},
  signal
) {
  /**
   * Fetch top headlines with optional filters.
   * - country: 2-letter code (e.g., 'us', 'gb'). Defaults to 'us'.
   * - category: business, entertainment, general, health, science, sports, technology
   * - pageSize: max 100 (NewsAPI limit)
   * - page: page number
   */
  const safePageSize = Math.min(Math.max(1, Number(pageSize) || 10), 100);
  const safePage = Math.max(1, Number(page) || 1);
  const params = {
    country,
    pageSize: safePageSize,
    page: safePage,
  };
  if (category) params.category = category;
  const data = await doFetch('top-headlines', params, signal);
  return {
    totalResults: data?.totalResults || 0,
    articles: Array.isArray(data?.articles) ? data.articles : [],
  };
}

// PUBLIC_INTERFACE
export async function searchEverything(
  { q, sortBy = 'publishedAt', language = 'en', pageSize = 10, page = 1 } = {},
  signal
) {
  /**
   * Search for news across all articles.
   * - q: search query string (required)
   * - sortBy: relevancy, popularity, publishedAt
   * - language: e.g., 'en', 'de', 'fr'
   *
   * In proxy mode, this calls '/search'; in direct mode, this calls '/everything'.
   */
  const query = String(q || '').trim();
  if (!query) {
    const e = new Error('Please enter a search term.');
    e.code = 'VALIDATION';
    throw e;
  }
  const allowedSort = new Set(['relevancy', 'popularity', 'publishedAt']);
  const sort = allowedSort.has(sortBy) ? sortBy : 'publishedAt';

  const safePageSize = Math.min(Math.max(1, Number(pageSize) || 10), 100);
  const safePage = Math.max(1, Number(page) || 1);

  const params = {
    q: query,
    sortBy: sort,
    language,
    pageSize: safePageSize,
    page: safePage,
  };
  const data = await doFetch('search', params, signal); // logical 'search' maps by mode
  return {
    totalResults: data?.totalResults || 0,
    articles: Array.isArray(data?.articles) ? data.articles : [],
  };
}
