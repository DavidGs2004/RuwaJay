import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';
import { deleteDoc, doc, onSnapshot, collection, setDoc, serverTimestamp } from 'firebase/firestore';
import { firestore } from '../lib/firebase';

const FavoritesContext = createContext(null);
export function FavoritesProvider({ children }) {
  const { user } = useAuth();
  const uid = user?.id || null;
  const activeUid = useRef(uid);
  activeUid.current = uid;
  const [favoriteState, setFavoriteState] = useState({ uid: null, items: [] });
  const [searchState, setSearchState] = useState({ uid: null, items: [] });
  const favorites = favoriteState.uid === uid ? favoriteState.items : [];
  const recentSearches = searchState.uid === uid ? searchState.items : [];

  useEffect(() => {
    let active = true;
    setFavoriteState({ uid, items: [] });
    // Discard the previous unscoped cache. Firestore owns favorites.
    try {
      localStorage.removeItem('ruwajay_favorites');
      localStorage.removeItem('ruwajay_recent_searches');
      const saved = uid ? JSON.parse(localStorage.getItem('ruwajay_recent_searches:' + uid) || '[]') : [];
      setSearchState({ uid, items: Array.isArray(saved) ? saved.slice(0, 10) : [] });
    } catch { setSearchState({ uid, items: [] }); }
    if (!uid || !firestore) return () => { active = false; };
    const unsubscribe = onSnapshot(collection(firestore, 'users', uid, 'favorites'), snapshot => {
      if (active && activeUid.current === uid) setFavoriteState({ uid, items: snapshot.docs.map(d => d.id) });
    }, error => {
      if (active && activeUid.current === uid) setFavoriteState({ uid, items: [] });
      console.error('No se pudieron cargar los favoritos:', error);
    });
    return () => { active = false; unsubscribe(); };
  }, [uid]);

  useEffect(() => {
    if (uid && searchState.uid === uid) {
      try { localStorage.setItem('ruwajay_recent_searches:' + uid, JSON.stringify(searchState.items)); } catch { /* Storage may be disabled. */ }
    }
  }, [uid, searchState]);

  const toggleFavorite = useCallback(async propertyId => {
    if (!uid || !firestore) return;
    const id = String(propertyId);
    const removing = favorites.includes(id);
    setFavoriteState(prev => ({ uid, items: removing
      ? (prev.uid === uid ? prev.items : []).filter(value => value !== id)
      : [...new Set([...(prev.uid === uid ? prev.items : []), id])] }));
    try {
      const target = doc(firestore, 'users', uid, 'favorites', id);
      if (removing) await deleteDoc(target);
      else await setDoc(target, { propertyId: id, createdAt: serverTimestamp() });
    } catch {
      if (activeUid.current !== uid) return;
      setFavoriteState(prev => prev.uid !== uid ? prev : ({ uid, items: removing
        ? [...new Set([...prev.items, id])] : prev.items.filter(value => value !== id) }));
      window.alert('No se pudo guardar el favorito. Revisa tu conexión.');
    }
  }, [uid, favorites]);
  const isFavorite = useCallback(id => favorites.includes(String(id)), [favorites]);
  const addRecentSearch = useCallback(search => {
    if (!uid) return;
    setSearchState(prev => ({ uid, items: [search, ...(prev.uid === uid ? prev.items : []).filter(s => s.query !== search.query)].slice(0, 10) }));
  }, [uid]);
  const clearRecentSearches = useCallback(() => setSearchState({ uid, items: [] }), [uid]);
  return <FavoritesContext.Provider value={{ favorites, toggleFavorite, isFavorite, recentSearches, addRecentSearch, clearRecentSearches }}>{children}</FavoritesContext.Provider>;
}
export function useFavorites() {
  const context = useContext(FavoritesContext);
  if (!context) throw new Error('useFavorites must be used within FavoritesProvider');
  return context;
}
