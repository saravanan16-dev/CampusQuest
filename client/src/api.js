const BASE = import.meta.env.VITE_API_URL || '/api/v1';
const TOKEN_KEY = 'cq_token';

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (t) => (t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY));

export class ApiError extends Error {
  constructor(status, message, code) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

async function request(method, path, body, { form = false, raw = false } = {}) {
  const headers = {};
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  let payload;
  if (body !== undefined) {
    if (form) payload = body;
    else {
      headers['Content-Type'] = 'application/json';
      payload = JSON.stringify(body);
    }
  }
  let res;
  try {
    res = await fetch(BASE + path, { method, headers, body: payload });
  } catch {
    throw new ApiError(0, 'Cannot reach the server. Check your connection and try again.', 'network');
  }
  if (res.status === 401 && token && !path.startsWith('/auth/')) {
    setToken(null);
    window.location.assign('/login');
    throw new ApiError(401, 'Your session has expired', 'expired');
  }
  if (!res.ok) {
    let data = {};
    try { data = await res.json(); } catch { /* non-JSON error body */ }
    throw new ApiError(res.status, data.message || `Request failed (${res.status})`, data.code);
  }
  return raw ? res : res.json();
}

const qs = (params = {}) => {
  const p = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => v !== undefined && v !== null && v !== '' && p.set(k, v));
  const s = p.toString();
  return s ? `?${s}` : '';
};

export const api = {
  get: (path, params) => request('GET', path + qs(params)),
  post: (path, body) => request('POST', path, body ?? {}),
  put: (path, body) => request('PUT', path, body),
  del: (path) => request('DELETE', path),
  upload: (path, formData) => request('POST', path, formData, { form: true }),
  // Downloads need the auth header, so fetch a blob and save it.
  async download(path, filename) {
    const res = await request('GET', path, undefined, { raw: true });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || 'download';
    a.click();
    URL.revokeObjectURL(url);
  },
};
