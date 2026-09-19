import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { deleteDoc, doc, getDocs, collection, setDoc } from 'firebase/firestore';
import { firebaseAuth, firestore } from '../lib/firebase';

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

    getDocs(collection(firestore, 'users', user.id, 'favorites'))
      .then((snapshot) => setFavorites(snapshot.docs.map((favorite) => favorite.id)))
      .catch((e) => {
        console.error("Error loading favorites from firestore:", e);
      });
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

    // Optimistic update
    setFavorites((prev) =>
      removing ? prev.filter((id) => id !== propertyId) : [...prev, propertyId]
    );

    try {
      const favoriteRef = doc(firestore, 'users', user.id, 'favorites', String(propertyId));
      if (removing) {
        await deleteDoc(favoriteRef);
      } else {
        await setDoc(favoriteRef, { propertyId: String(propertyId), createdAt: Date.now() });
      }
    } catch (e) {
      console.error("Error toggling favorite in firestore:", e);
      // Rollback on error
      setFavorites(favorites);
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
