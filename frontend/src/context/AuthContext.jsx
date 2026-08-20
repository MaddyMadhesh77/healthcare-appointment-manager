import { createContext, useContext, useEffect, useState } from 'react';
import * as authApi from '../api/auth';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('hca_user');
    if (stored) setUser(JSON.parse(stored));
    setLoading(false);
  }, []);

  function persist(result) {
    localStorage.setItem('hca_token', result.token);
    localStorage.setItem('hca_user', JSON.stringify(result.user));
    setUser(result.user);
  }

  async function login(credentials) {
    const result = await authApi.login(credentials);
    persist(result);
    return result.user;
  }

  async function register(data) {
    const result = await authApi.register(data);
    persist(result);
    return result.user;
  }

  function logout() {
    localStorage.removeItem('hca_token');
    localStorage.removeItem('hca_user');
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
