import { useState, useEffect, type ReactNode, useCallback } from 'react';
import type { ApiError, User } from '../types';
import { authApi } from '../api';
import { AuthContext } from './AuthContextType';

export interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

function decodeToken(token: string): { sub: string } | null {
  try {
    const payload = token.split('.')[1];
    const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    const storedToken = localStorage.getItem('access_token');
    const storedEmail = localStorage.getItem('user_email');
    if (!storedToken) {
      setIsLoading(false);
      return;
    }

    setToken(storedToken);
    const decoded = decodeToken(storedToken);
    if (decoded?.sub) {
      setUser({
        id: parseInt(decoded.sub, 10),
        email: storedEmail || '',
        created_at: null,
      });
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const login = async (email: string, password: string) => {
    try {
      const response = await authApi.login({ email, password });
      const { access_token } = response.data;
      localStorage.setItem('access_token', access_token);
      localStorage.setItem('user_email', email);
      setToken(access_token);
      const decoded = decodeToken(access_token);
      if (decoded?.sub) {
        setUser({
          id: parseInt(decoded.sub, 10),
          email,
          created_at: null,
        });
      }
      return { success: true };
    } catch (error: unknown) {
      const apiError = error as ApiError;
      return { success: false, error: apiError.message || 'Login failed' };
    }
  };

  const register = async (email: string, password: string) => {
    try {
      const response = await authApi.register({ email, password });
      const loginResponse = await authApi.login({ email, password });
      const { access_token } = loginResponse.data;
      localStorage.setItem('access_token', access_token);
      localStorage.setItem('user_email', email);
      setToken(access_token);
      setUser({ ...response.data, email });
      return { success: true };
    } catch (error: unknown) {
      const apiError = error as ApiError;
      return { success: false, error: apiError.message || 'Registration failed' };
    }
  };

  const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user_email');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAuthenticated: !!token,
        login,
        register,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

