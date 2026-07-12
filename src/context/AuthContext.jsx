/**
 * AuthContext
 * Provides user state + login/logout actions to the entire app.
 * Persists user info in localStorage for page refresh resilience.
 */
import { createContext, useContext, useState, useEffect } from 'react';
import { login as apiLogin, logout as apiLogout, getMe } from '../api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    // Restore from localStorage on first load
    try {
      const stored = localStorage.getItem('hca_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);

  // On mount, validate the current session with the server
  useEffect(() => {
    getMe()
      .then((res) => {
        setUser(res.data);
        localStorage.setItem('hca_user', JSON.stringify(res.data));
      })
      .catch(() => {
        // Cookie expired or missing — clear local state
        setUser(null);
        localStorage.removeItem('hca_user');
      })
      .finally(() => setLoading(false));
  }, []);

  const login = async (username, password) => {
    const res = await apiLogin({ username, password });
    setUser(res.data.user);
    localStorage.setItem('hca_user', JSON.stringify(res.data.user));
    return res.data.user;
  };

  const logout = async () => {
    await apiLogout();
    setUser(null);
    localStorage.removeItem('hca_user');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
