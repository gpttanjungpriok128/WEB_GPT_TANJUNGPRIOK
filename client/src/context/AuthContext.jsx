import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);
const LEGACY_TOKEN_STORAGE_KEY = 'token';

function clearLegacyToken() {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.removeItem(LEGACY_TOKEN_STORAGE_KEY);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    clearLegacyToken();

    async function fetchMe() {
      try {
        const { data } = await api.get('/auth/me');
        if (isMounted) {
          setUser(data.user || null);
        }
      } catch (error) {
        if (isMounted) {
          setUser(null);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchMe();
    return () => {
      isMounted = false;
    };
  }, []);

  const login = async (payload) => {
    const { data } = await api.post('/auth/login', payload);
    clearLegacyToken();
    setUser(data.user || null);
    return data;
  };

  const register = async (payload) => {
    const { data } = await api.post('/auth/register', payload);
    clearLegacyToken();
    setUser(data.user || null);
    return data;
  };

  const loginWithGoogle = async (credential) => {
    const { data } = await api.post('/auth/google', { credential });
    clearLegacyToken();
    setUser(data.user || null);
    return data;
  };

  const logout = async () => {
    clearLegacyToken();
    setUser(null);
    try {
      await api.post('/auth/logout');
    } catch (error) {
      // Keep local auth state cleared even if logout request fails.
    }
  };

  const value = useMemo(
    () => ({
      user,
      loading,
      login,
      register,
      loginWithGoogle,
      logout
    }),
    [user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
