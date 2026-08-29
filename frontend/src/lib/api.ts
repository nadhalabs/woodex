import { showError } from './feedback';

// NEXT_PUBLIC_API_URL, when set, must include the /api/v1 prefix.
// The same-origin default is handled by Next/reverse-proxy rewrites.
const API_BASE = (process.env.NEXT_PUBLIC_API_URL || '/api/v1').replace(/\/$/, '');
let activeRequests = 0;
let currentUserToken: string | null = null;
let currentUserRequest: Promise<any> | null = null;

function updateRequestActivity(delta: number) {
  if (typeof window === 'undefined') return;
  activeRequests = Math.max(0, activeRequests + delta);
  window.dispatchEvent(new CustomEvent('woodex:request-activity', { detail: activeRequests > 0 }));
}

async function performRequest(endpoint: string, options: RequestInit, token: string | null) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  let res: Response;
  updateRequestActivity(1);
  try {
    res = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
      credentials: 'include',
    });
  } catch (error) {
    if (endpoint !== '/auth/login') {
      showError(error, 'Unable to reach Woodex. Check your connection and try again.');
    }
    throw error;
  } finally {
    updateRequestActivity(-1);
  }

  if (res.status === 401 && typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
    currentUserRequest = null;
    currentUserToken = null;
    localStorage.removeItem('woodex_token');
    window.location.href = '/login';
    throw new Error('Unauthorized');
  }

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    const message = typeof errorData.detail === 'string' && errorData.detail !== 'An error occurred'
      ? errorData.detail
      : res.status >= 500
        ? 'Woodex is temporarily unavailable. Please try again.'
        : 'Please check the highlighted information and try again.';
    const error = new Error(message || `Request failed with status ${res.status}`);
    if (endpoint !== '/auth/login') showError(error);
    throw error;
  }

  if (res.status === 204) {
    return null;
  }

  return res.json();
}

export function fetchApi(endpoint: string, options: RequestInit = {}) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('woodex_token') : null;
  const method = (options.method || 'GET').toUpperCase();

  if (endpoint === '/auth/me' && method === 'GET') {
    if (currentUserRequest && currentUserToken === token) {
      return currentUserRequest;
    }
    currentUserToken = token;
    currentUserRequest = performRequest(endpoint, options, token).catch((error) => {
      currentUserRequest = null;
      currentUserToken = null;
      throw error;
    });
    return currentUserRequest;
  }

  const request = performRequest(endpoint, options, token);
  if ((endpoint === '/business' && method !== 'GET') || endpoint === '/auth/logout') {
    request.then(() => {
      currentUserRequest = null;
      currentUserToken = null;
    }).catch(() => undefined);
  }
  return request;
}
