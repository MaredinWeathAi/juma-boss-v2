import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import api from '../lib/api';

interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'baker';
  phone?: string;
  bakery?: {
    id: string;
    name: string;
    slug: string;
    tier: string;
    status: string;
  };
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: { name: string; email: string; password: string; bakeryName: string }) => Promise<void>;
  logout: () => void;
  impersonate: (token: string, user: User) => void;
  stopImpersonating: () => void;
  isImpersonating: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isImpersonating, setIsImpersonating] = useState(false);
  const [originalToken, setOriginalToken] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('jb_token');
    if (token) {
      api.setToken(token);
      api.get('/auth/me')
        .then((data: any) => { setUser(data.user); })
        .catch(() => { localStorage.removeItem('jb_token'); api.setToken(null); })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email: string, password: string) => {
    const data = await api.post('/auth/login', { email, password });
    localStorage.setItem('jb_token', data.token);
    api.setToken(data.token);
    setUser(data.user);
  };

  const register = async (regData: { name: string; email: string; password: string; bakeryName: string }) => {
    const data = await api.post('/auth/register', regData);
    localStorage.setItem('jb_token', data.token);
    api.setToken(data.token);
    setUser(data.user);
  };

  const logout = () => {
    localStorage.removeItem('jb_token');
    localStorage.removeItem('jb_original_token');
    api.setToken(null);
    setUser(null);
    setIsImpersonating(false);
    setOriginalToken(null);
  };

  const impersonate = (token: string, impUser: User) => {
    const currentToken = api.getToken();
    if (currentToken) {
      setOriginalToken(currentToken);
      localStorage.setItem('jb_original_token', currentToken);
    }
    api.setToken(token);
    localStorage.setItem('jb_token', token);
    setUser(impUser);
    setIsImpersonating(true);
  };

  const stopImpersonating = () => {
    const saved = originalToken || localStorage.getItem('jb_original_token');
    if (saved) {
      api.setToken(saved);
      localStorage.setItem('jb_token', saved);
      api.get('/auth/me').then((data: any) => {
        setUser(data.user);
        setIsImpersonating(false);
        setOriginalToken(null);
        localStorage.removeItem('jb_original_token');
      });
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, impersonate, stopImpersonating, isImpersonating }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
