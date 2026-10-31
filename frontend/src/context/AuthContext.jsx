import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('opspilot_token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      if (token) {
        try {
          const res = await api.get('/auth/me');
          setUser(res.data);
          localStorage.setItem('opspilot_user', JSON.stringify(res.data));
        } catch (err) {
          console.error('Failed to load authenticated user profile:', err);
          logout();
        }
      }
      setLoading(false);
    };

    fetchUser();
  }, [token]);

  const login = async (username_or_email, password) => {
    const res = await api.post('/auth/login', { username_or_email, password });
    const accessToken = res.data.access_token;
    localStorage.setItem('opspilot_token', accessToken);
    setToken(accessToken);

    const userProfile = await api.get('/auth/me', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    setUser(userProfile.data);
    localStorage.setItem('opspilot_user', JSON.stringify(userProfile.data));
    return userProfile.data;
  };

  const register = async (email, username, password, fullName) => {
    const res = await api.post('/auth/register', {
      email,
      username,
      password,
      full_name: fullName,
    });
    return res.data;
  };

  const logout = () => {
    localStorage.removeItem('opspilot_token');
    localStorage.removeItem('opspilot_user');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, isAuthenticated: !!user }}>
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

