import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { api, getStoredToken, setStoredToken, clearStoredToken } from '../api/client';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isAdmin: boolean;
  login: (email: string) => Promise<void>;
  logout: () => void;
  switchRole: (role: UserRole) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const initAuth = async () => {
      try {
        const res = await api.getMe();
        if (res.user) {
          setUser(res.user);
          setStoredToken(res.user.id);
        }
      } catch (err) {
        console.warn('Initial session fetch failed, fallback to admin:', err);
      } finally {
        setIsLoading(false);
      }
    };
    initAuth();
  }, []);

  const login = async (email: string) => {
    setIsLoading(true);
    try {
      const res = await api.login(email);
      setStoredToken(res.token);
      setUser(res.user);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    clearStoredToken();
    setUser(null);
  };

  const switchRole = async (role: UserRole) => {
    setIsLoading(true);
    try {
      const res = await api.switchUserRole(role);
      setStoredToken(res.token);
      setUser(res.user);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: Boolean(user),
        isLoading,
        isAdmin: user?.role === 'admin',
        login,
        logout,
        switchRole
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
