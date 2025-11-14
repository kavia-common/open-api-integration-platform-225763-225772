//
// NewsAPI client for fetching top headlines and search results.
// Reads configuration from environment variables.
//
// Security: No secrets are hardcoded. The API key must be supplied via REACT_APP_NEWS_API_KEY.
// This module adds robust error handling for network/CORS problems and clearer diagnostics.
//
const DEFAULT_BASE = 'https://newsapi.org/v2';

// PUBLIC_INTERFACE
export function getNewsApiConfig() {
  /** Get NewsAPI configuration from environment variables with safe defaults. */
  const baseRaw = process.env.REACT_APP_NEWS_API_BASE || DEFAULT_BASE;
  const base = String(baseRaw).replace(/\/*$/, '');

  // Note: CRA only exposes REACT_APP_* vars to the browser
  const apiKey =
    process.env.REACT_APP_NEWS_API_KEY ||
    process.env.REACT_APP_REACT_APP_NEWSAPI_KEY; // tolerant fallback

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
    return 'Unauthorized: Please ensure a valid NewsAPI key is configured.';
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
function toUserFacingError(err, url) {
  if (isNetworkOrCORSError(err)) {
    // Provide guidance on common causes
    const e = new Error(
      'Network/CORS error: Unable to reach the news service. This can occur if your browser blocked the request or the service is unavailable.'
    );
    e.code = 'NETWORK';
    e.details = { url };
    return e;
  }
  return err instanceof Error ? err : new Error('Unexpected error occurred.');
}

async function doFetch(endpoint, params, externalSignal) {
  const { base, apiKey } = getNewsApiConfig();

  if (!apiKey) {
    const e = new Error('NewsAPI key is missing. Set REACT_APP_NEWS_API_KEY in your environment.');
    e.code = 'CONFIG';
    throw e;
  }

  if (!/^https?:\/\//i.test(base)) {
    const e = new Error('Invalid NewsAPI base URL. Ensure REACT_APP_NEWS_API_BASE starts with http(s)://');
    e.code = 'CONFIG';
    throw e;
  }

  const query = buildQuery(params);
  const url = `${base}/${endpoint}${query ? `?${query}` : ''}`;

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
      headers: {
        'X-Api-Key': apiKey,
      },
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timeout);
    throw toUserFacingError(err, url);
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
    totalResults: data.totalResults || 0,
    articles: Array.isArray(data.articles) ? data.articles : [],
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
  const data = await doFetch('everything', params, signal);
  return {
    totalResults: data.totalResults || 0,
    articles: Array.isArray(data.articles) ? data.articles : [],
  };
}
