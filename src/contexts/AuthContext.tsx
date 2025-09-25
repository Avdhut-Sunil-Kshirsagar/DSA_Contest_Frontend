import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { api } from '../utils/api';
import { userStateManager } from '../utils/userStateManager';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  lastLogin?: string;
  createdAt: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for stored token on app load
    const storedToken = localStorage.getItem('token');
    if (storedToken) {
      setToken(storedToken);
      api.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
      // Fetch user data; if offline, fall back to cached user but keep token
      fetchUser();
    } else {
      setLoading(false);
    }
  }, []);

  const fetchUser = async () => {
    try {
      const response = await api.get('/auth/me');
      const userData = response.data.data.user;
      
      // Check if user has changed and reset state if needed
      const stateWasReset = userStateManager.checkAndResetUserState(userData.id);
      
      if (stateWasReset) {
        console.log('New user detected, all contest state has been reset');
      }
      
      setUser(userData);
      // Cache user for offline mode
      try { localStorage.setItem('user_cache', JSON.stringify(userData)); } catch {}
    } catch (error) {
      console.error('Failed to fetch user:', error);
      // If unauthorized, clear token; if network error, keep token and try cached user
      const status = (error as any)?.response?.status;
      if (status === 401) {
        localStorage.removeItem('token');
        setToken(null);
        api.defaults.headers.common['Authorization'] = '';
        setUser(null);
      } else {
        // Network/offline error: attempt to hydrate user from cache to allow offline access
        try {
          const cached = localStorage.getItem('user_cache');
          if (cached) {
            const cachedUser = JSON.parse(cached);
            setUser(cachedUser);
          }
        } catch {}
      }
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const response = await api.post('/auth/login', { email, password });
      const { user: userData, token: userToken } = response.data.data;
      
      // Check if user has changed and reset state if needed
      const stateWasReset = userStateManager.checkAndResetUserState(userData.id);
      
      if (stateWasReset) {
        console.log('New user logged in, all contest state has been reset');
      }
      
      setUser(userData);
      setToken(userToken);
      localStorage.setItem('token', userToken);
      api.defaults.headers.common['Authorization'] = `Bearer ${userToken}`;
      // Cache user for offline use
      try { localStorage.setItem('user_cache', JSON.stringify(userData)); } catch {}
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Login failed');
    }
  };

  const register = async (name: string, email: string, password: string) => {
    try {
      const response = await api.post('/auth/register', { name, email, password });
      const { user: userData, token: userToken } = response.data.data;
      
      // Check if user has changed and reset state if needed
      const stateWasReset = userStateManager.checkAndResetUserState(userData.id);
      
      if (stateWasReset) {
        console.log('New user registered, all contest state has been reset');
      }
      
      setUser(userData);
      setToken(userToken);
      localStorage.setItem('token', userToken);
      api.defaults.headers.common['Authorization'] = `Bearer ${userToken}`;
      // Cache user for offline use
      try { localStorage.setItem('user_cache', JSON.stringify(userData)); } catch {}
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Registration failed');
    }
  };

  const logout = () => {
    // Clear user state when logging out
    userStateManager.clearUserState();
    
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user_cache');
    api.defaults.headers.common['Authorization'] = '';
  };

  const value: AuthContextType = {
    user,
    token,
    login,
    register,
    logout,
    loading,
    isAuthenticated: !!user && !!token,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
