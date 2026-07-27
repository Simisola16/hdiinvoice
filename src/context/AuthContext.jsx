/**
 * AuthContext
 * Provides user state + login/logout actions to the entire app.
 * Stores JWT in localStorage and attaches it via Authorization header
 * on every request (avoids cross-origin cookie blocking in modern browsers).
 */
import { createContext, useContext, useState, useEffect } from 'react';
import { login as apiLogin, logout as apiLogout, getMe, setAuthToken } from '../api';

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

  // On mount, attach any stored token to axios and validate with server
  useEffect(() => {
    const storedToken = localStorage.getItem('hca_token');
    if (!storedToken) {
      setUser(null);
      setAuthToken(null);
      localStorage.removeItem('hca_user');
      setLoading(false);
      return;
    }

    setAuthToken(storedToken);

    getMe()
      .then((res) => {
        setUser(res.data);
        localStorage.setItem('hca_user', JSON.stringify(res.data));
      })
      .catch(() => {
        // Token expired or missing — clear local state
        setUser(null);
        setAuthToken(null);
        localStorage.removeItem('hca_user');
        localStorage.removeItem('hca_token');
      })
      .finally(() => setLoading(false));
  }, []);

  const login = async (username, password) => {
    const res = await apiLogin({ username, password });
    const { user: loggedInUser, token } = res.data;

    // Persist token and attach to all future requests
    if (token) {
      localStorage.setItem('hca_token', token);
      setAuthToken(token);
    }

    setUser(loggedInUser);
    localStorage.setItem('hca_user', JSON.stringify(loggedInUser));
    return loggedInUser;
  };

  const logout = async () => {
    try { await apiLogout(); } catch { /* ignore */ }
    setUser(null);
    setAuthToken(null);
    localStorage.removeItem('hca_user');
    localStorage.removeItem('hca_token');
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
