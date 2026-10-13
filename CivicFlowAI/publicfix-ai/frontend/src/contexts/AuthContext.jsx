import { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE = '/api';
const AuthContext = createContext(null);

axios.interceptors.request.use((config) => {
  const token = localStorage.getItem('pf_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('pf_token');
    if (token) {
      axios.get(`${API_BASE}/auth/me`)
        .then(res => setUser(res.data.user))
        .catch(() => { localStorage.removeItem('pf_token'); })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email, password) => {
    const res = await axios.post(`${API_BASE}/auth/login`, { email, password });
    localStorage.setItem('pf_token', res.data.token);
    setUser(res.data.user);
    return res.data.user;
  };

  const register = async (data) => {
    const res = await axios.post(`${API_BASE}/auth/register`, data);
    localStorage.setItem('pf_token', res.data.token);
    setUser(res.data.user);
    return res.data.user;
  };

  const logout = () => {
    localStorage.removeItem('pf_token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
