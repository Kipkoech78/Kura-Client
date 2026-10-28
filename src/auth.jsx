import React, { createContext, useContext, useEffect, useState } from 'react';
import { api } from './api.js';
import { Loading } from './ui.jsx';

const Auth = createContext();
export const useAuth = () => useContext(Auth);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (!localStorage.getItem('token')) return setReady(true);
    api('/me').then(setUser).catch(() => localStorage.removeItem('token')).finally(() => setReady(true));
  }, []);
  const logout = () => { localStorage.removeItem('token'); setUser(null); };
  if (!ready) return <Loading text="Starting up..." />;
  return <Auth.Provider value={{ user, setUser, logout }}>{children}</Auth.Provider>;
}
