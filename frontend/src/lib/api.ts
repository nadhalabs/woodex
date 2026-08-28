// NEXT_PUBLIC_API_URL, when set, must include the /api/v1 prefix.
// The same-origin default is handled by Next/reverse-proxy rewrites.
const API_BASE = (process.env.NEXT_PUBLIC_API_URL || '/api/v1').replace(/\/$/, '');

export async function fetchApi(endpoint: string, options: RequestInit = {}) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('woodex_token') : null;
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
    credentials: 'include',
  });

  if (res.status === 401 && typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
    localStorage.removeItem('woodex_token');
    window.location.href = '/login';
    throw new Error('Unauthorized');
  }

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: 'An error occurred' }));
    throw new Error(errorData.detail || `Request failed with status ${res.status}`);
  }

  if (res.status === 204) {
    return null;
  }

  return res.json();
}
