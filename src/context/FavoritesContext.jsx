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

  useEffect(() => {
    if (!user || !firestore) {
      setFavorites([]);
      return;
    }

    // Listener en tiempo real para sincronización instantánea entre Web y App
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
  }, [user?.id]);

  useEffect(() => {
    localStorage.setItem('ruwajay_favorites', JSON.stringify(favorites));
  }, [favorites]);

  useEffect(() => {
    localStorage.setItem('ruwajay_recent_searches', JSON.stringify(recentSearches));
  }, [recentSearches]);

  const toggleFavorite = useCallback(async (propertyId) => {
    if (!user || !firestore) return;

    const removing = favorites.includes(propertyId);

    try {
      const favoriteRef = doc(firestore, 'users', user.id, 'favorites', String(propertyId));
      if (removing) {
        await deleteDoc(favoriteRef);
      } else {
        await setDoc(favoriteRef, { propertyId: String(propertyId), createdAt: Date.now() });
      }
    } catch (e) {
      console.error("Error toggling favorite in firestore:", e);
    }
  }, [user, favorites]);

  const isFavorite = useCallback(
    (propertyId) => favorites.includes(propertyId),
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
