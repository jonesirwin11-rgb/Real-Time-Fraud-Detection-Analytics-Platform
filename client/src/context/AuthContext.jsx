import React, { createContext, useState } from 'react';
import axios from 'axios';

export const AuthContext = createContext();

const API_BASE_URL = 'http://localhost:3000/api';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(false);

  const login = async (username, password) => {
    const res = await axios.post(`${API_BASE_URL}/auth/login`, { username, password });
    const { token: receivedToken, username: authUser, role } = res.data;
    setToken(receivedToken);
    setUser({ username: authUser || username, role: role || 'analyst' });
    return res.data;
  };

  const register = async (username, password) => {
    const res = await axios.post(`${API_BASE_URL}/auth/register`, { username, password });
    return res.data;
  };

  const logout = () => {
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, register, logout, loading, soundEnabled, setSoundEnabled }}>
      {children}
    </AuthContext.Provider>
  );
};
