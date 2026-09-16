import { createContext, useContext, useEffect, useState } from 'react';

const AuthContext = createContext(null);
const API_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

async function api(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.detail || 'No se pudo completar la solicitud.');
  return data;
}


export { AVATAR_OPTIONS } from '../data/avatars';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isPostAuthLoading, setIsPostAuthLoading] = useState(false);

  // Load saved profile extras (avatar, bio, verification) from localStorage
  const loadProfileExtras = (baseUser) => {
    if (!baseUser) return baseUser;
    try {
      const extras = JSON.parse(localStorage.getItem(`ruwajay_profile_${baseUser.id}`) || '{}');
      return { ...baseUser, ...extras };
    } catch { return baseUser; }
  };

  const saveProfileExtras = (userId, extras) => {
    try {
      const existing = JSON.parse(localStorage.getItem(`ruwajay_profile_${userId}`) || '{}');
      localStorage.setItem(`ruwajay_profile_${userId}`, JSON.stringify({ ...existing, ...extras }));
    } catch { /* ignore */ }
  };

  useEffect(() => {
    const token = localStorage.getItem('ruwajay_token');
    if (!token) { setIsInitializing(false); return; }
    api('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } })
      .then((data) => setUser(loadProfileExtras(data.user)))
      .catch(() => {
        localStorage.removeItem('ruwajay_token');
        localStorage.removeItem('ruwajay_user');
      })
      .finally(() => setIsInitializing(false));
  }, []);

  useEffect(() => {
    if (user) localStorage.setItem('ruwajay_user', JSON.stringify(user));
    else localStorage.removeItem('ruwajay_user');
  }, [user]);

  const authenticate = async (path, payload) => {
    setIsLoading(true);
    try {
      const data = await api(path, { method: 'POST', body: JSON.stringify(payload) });
      localStorage.setItem('ruwajay_token', data.access_token);
      const enrichedUser = loadProfileExtras(data.user);
      setUser(enrichedUser);
      setIsPostAuthLoading(true);
      window.setTimeout(() => setIsPostAuthLoading(false), 3000);
      return enrichedUser;
    } finally { setIsLoading(false); }
  };

  const login = (email, password) => authenticate('/api/auth/login', { email, password });
  const register = (name, email, password, role, phone) => authenticate('/api/auth/register', { name, email, password, role, phone });
  const requestPasswordReset = (email) => api('/api/auth/password/request', { method: 'POST', body: JSON.stringify({ email }) });
  const verifyResetCode = (email, code) => api('/api/auth/password/verify', { method: 'POST', body: JSON.stringify({ email, code }) });
  const resetPassword = (resetToken, password) => api('/api/auth/password/reset', { method: 'POST', body: JSON.stringify({ reset_token: resetToken, password }) });

  const logout = () => {
    setUser(null);
    localStorage.removeItem('ruwajay_user');
    localStorage.removeItem('ruwajay_token');
  };

  /** Update profile fields (name, phone, bio, avatarId, avatarImage, dpiData, verified) and persist extras locally */
  const updateProfile = (updates) => {
    setUser((previous) => {
      if (!previous) return previous;
      const next = { ...previous, ...updates };
      // Persist profile-specific extras to localStorage keyed by user ID
      const extras = {};
      if ('avatarId' in updates) extras.avatarId = updates.avatarId;
      if ('avatarImage' in updates) extras.avatarImage = updates.avatarImage;
      if ('bio' in updates) extras.bio = updates.bio;
      if ('verified' in updates) extras.verified = updates.verified;
      if ('dpiData' in updates) extras.dpiData = updates.dpiData;
      if ('name' in updates) extras.name = updates.name;
      if ('phone' in updates) extras.phone = updates.phone;
      if (Object.keys(extras).length > 0) saveProfileExtras(previous.id, extras);
      return next;
    });
  };

  /** Change password (validates current password → sets new password via secure backend API) */
  const changePassword = async (currentPassword, newPassword) => {
    if (!user) throw new Error('No hay sesión activa.');
    const token = localStorage.getItem('ruwajay_token');
    return api('/api/auth/password/change', {
      method: 'POST',
      body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  };

  /** Request identity verification (DPI badge + verification data) */
  const requestVerification = (dpiData = {}) => {
    const verifiedData = {
      ...dpiData,
      verifiedAt: new Date().toLocaleDateString('es-GT', { year: 'numeric', month: 'long', day: 'numeric' }),
    };
    updateProfile({
      verified: true,
      dpiData: verifiedData,
    });
    return Promise.resolve({ success: true, dpiData: verifiedData });
  };

  /** Safely revoke and purge sensitive DPI identification data */
  const purgeDpiData = () => {
    if (!user) return;
    updateProfile({
      verified: false,
      dpiData: null,
    });
  };

  return <AuthContext.Provider value={{ user, isLoading, isInitializing, isPostAuthLoading, login, register, logout, updateProfile, changePassword, requestVerification, purgeDpiData, requestPasswordReset, verifyResetCode, resetPassword }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return context;
}

