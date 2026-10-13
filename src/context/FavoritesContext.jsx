import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { deleteDoc, doc, onSnapshot, collection, setDoc } from 'firebase/firestore';
import { firestore } from '../lib/firebase';

const FavoritesContext = createContext(null);

export function FavoritesProvider({ children }) {
  const { user } = useAuth();
  const [favorites, setFavorites] = useState(() => {
    const saved = localStorage.getItem('ruwajay_favorites');
    return saved ? JSON.parse(saved) : [];
  });

  const [recentSearches, setRecentSearches] = useState(() => {
    const saved = localStorage.getItem('ruwajay_recent_searches');
    return saved ? JSON.parse(saved) : [];
  });

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/$/, '');

  useEffect(() => {
    if (!user) {
      setFavorites([]);
      return;
    }

    // 1. Si Firestore está disponible, escuchar en tiempo real
    if (firestore) {
      const unsubscribe = onSnapshot(
        collection(firestore, 'users', user.id, 'favorites'),
        (snapshot) => {
          setFavorites(snapshot.docs.map((favorite) => favorite.id));
        },
        (e) => {
          console.error("Error listening to favorites from firestore:", e);
        }
      );
      return () => unsubscribe();
    }

  }, [user?.id]);

  useEffect(() => {
    localStorage.setItem('ruwajay_favorites', JSON.stringify(favorites));
  }, [favorites]);

  useEffect(() => {
    localStorage.setItem('ruwajay_recent_searches', JSON.stringify(recentSearches));
  }, [recentSearches]);

  const toggleFavorite = useCallback(async (propertyId) => {
    if (!user) return;

    const propIdStr = String(propertyId);
    const removing = favorites.includes(propIdStr);

    // Actualización inmediata en UI
    setFavorites((prev) => removing ? prev.filter((id) => id !== propIdStr) : [...prev, propIdStr]);

    // 2. Sincronizar con Firestore si está configurado
    if (firestore) {
      try {
        const favoriteRef = doc(firestore, 'users', user.id, 'favorites', propIdStr);
        if (removing) {
          await deleteDoc(favoriteRef);
        } else {
          await setDoc(favoriteRef, { propertyId: propIdStr, createdAt: Date.now() });
        }
      } catch (e) {
        setFavorites(prev => removing ? [...new Set([...prev, propIdStr])] : prev.filter(id => id !== propIdStr));
        window.alert('No se pudo guardar el favorito. Revisa tu conexion.');
      }
    }
  }, [user, favorites]);

  const isFavorite = useCallback(
    (propertyId) => favorites.includes(String(propertyId)),
    [favorites]
  );

  const addRecentSearch = useCallback((search) => {
    setRecentSearches((prev) => {
      const filtered = prev.filter((s) => s.query !== search.query);
      return [search, ...filtered].slice(0, 10);
    });
  }, []);

  const clearRecentSearches = useCallback(() => {
    setRecentSearches([]);
  }, []);

  return (
    <FavoritesContext.Provider
      value={{
        favorites,
        toggleFavorite,
        isFavorite,
        recentSearches,
        addRecentSearch,
        clearRecentSearches,
      }}
    >
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites() {
  const ctx = useContext(FavoritesContext);
  if (!ctx) throw new Error('useFavorites must be used within FavoritesProvider');
  return ctx;
}
