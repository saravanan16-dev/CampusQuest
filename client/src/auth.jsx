import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api, getToken, setToken } from './api.js';

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(Boolean(getToken()));

  useEffect(() => {
    if (!getToken()) return;
    api.get('/auth/me').then(setUser).catch(() => setToken(null)).finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email, password) => {
    const r = await api.post('/auth/login', { email, password });
    setToken(r.token);
    setUser(r.user);
    return r.user;
  }, []);

  const register = useCallback(async (name, email, password) => {
    const r = await api.post('/auth/register', { name, email, password });
    setToken(r.token);
    setUser(r.user);
    return r.user;
  }, []);

  const logout = useCallback(async () => {
    try { await api.post('/auth/logout'); } catch { /* token is discarded either way */ }
    setToken(null);
    setUser(null);
  }, []);

  return <AuthContext.Provider value={{ user, loading, login, register, logout }}>{children}</AuthContext.Provider>;
}
