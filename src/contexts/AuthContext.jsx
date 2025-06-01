import React, { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const checkLoggedIn = async () => {
      try {
        const res = await axios.get('/api/auth/me', { withCredentials: true });
        if (res.data.success) {
          setCurrentUser(res.data.user);
        }
      } catch (err) {
        // Not logged in or token expired
        setCurrentUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkLoggedIn();
  }, []);

  const register = async (username, email, password) => {
    try {
      setError(null);
      const res = await axios.post('/api/auth/register', {
        username: username.trim(),
        email: email.trim().toLowerCase(),
        password: password
      }, { withCredentials: true });

      if (res.data.success) {
        setCurrentUser(res.data.user);
        return { success: true };
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
      return { success: false, error: err.response?.data?.message || 'Registration failed' };
    }
  };

  const login = async (email, password) => {
    try {
      setError(null);
      const res = await axios.post('/api/auth/login', {
        email,
        password
      }, { withCredentials: true });

      if (res.data.success) {
        setCurrentUser(res.data.user);
        return { success: true };
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
      return { success: false, error: err.response?.data?.message || 'Login failed' };
    }
  };

  const logout = async () => {
    try {
      await axios.post('/api/auth/logout', {}, { withCredentials: true });
      setCurrentUser(null);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.response?.data?.message || 'Logout failed' };
    }
  };

  const value = {
    currentUser,
    loading,
    error,
    register,
    login,
    logout
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};