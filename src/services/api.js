const API_BASE = import.meta.env.VITE_API_BASE || '';

function getAuthHeaders() {
  const token = localStorage.getItem('auth_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function apiFetch(path, options = {}) {
  const url = `${API_BASE}${path}`;
  const headers = {
    'Content-Type': 'application/json',
    ...getAuthHeaders(),
    ...options.headers,
  };

  const res = await fetch(url, { ...options, headers });
  if (res.status === 401) {
    clearAuthToken();
    window.dispatchEvent(new CustomEvent('auth-expired'));
  }
  return res;
}

export function setAuthToken(token) {
  localStorage.setItem('auth_token', token);
}

export function clearAuthToken() {
  localStorage.removeItem('auth_token');
}

export function getAuthToken() {
  return localStorage.getItem('auth_token');
}
