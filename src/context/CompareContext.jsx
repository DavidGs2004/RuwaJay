import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const CompareContext = createContext(null);
const MAX_COMPARE = 3;

export function CompareProvider({ children }) {
  const [comparedProperties, setComparedProperties] = useState(() => {
    try {
      const saved = sessionStorage.getItem('ruwajay_compared');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [isCompareModalOpen, setIsCompareModalOpen] = useState(false);
  const [compareNotice, setCompareNotice] = useState(null);

  useEffect(() => {
    try {
      sessionStorage.setItem('ruwajay_compared', JSON.stringify(comparedProperties));
    } catch {
      // Ignore storage errors
    }
  }, [comparedProperties]);

  const showNotice = useCallback((message) => {
    setCompareNotice(message);
    setTimeout(() => {
      setCompareNotice((current) => (current === message ? null : current));
    }, 2800);
  }, []);

  const isInCompare = useCallback(
    (propertyId) => comparedProperties.some((p) => p.id === propertyId),
    [comparedProperties]
  );

  const addToCompare = useCallback(
    (property) => {
      if (!property) return false;
      if (comparedProperties.some((p) => p.id === property.id)) {
        return true;
      }
      if (comparedProperties.length >= MAX_COMPARE) {
        showNotice(`Máximo ${MAX_COMPARE} propiedades para comparar simultáneamente.`);
        return false;
      }
      setComparedProperties((prev) => [...prev, property]);
      showNotice(`"${property.title?.substring(0, 24)}..." agregada al comparador.`);
      return true;
    },
    [comparedProperties, showNotice]
  );

  const removeFromCompare = useCallback((propertyId) => {
    setComparedProperties((prev) => prev.filter((p) => p.id !== propertyId));
  }, []);

  const toggleCompare = useCallback(
    (property) => {
      if (!property) return;
      if (isInCompare(property.id)) {
        removeFromCompare(property.id);
      } else {
        addToCompare(property);
      }
    },
    [isInCompare, addToCompare, removeFromCompare]
  );

  const clearCompare = useCallback(() => {
    setComparedProperties([]);
  }, []);

  const openCompareModal = useCallback(() => {
    if (comparedProperties.length < 2) {
      showNotice('Selecciona al menos 2 propiedades para comparar.');
      return;
    }
    setIsCompareModalOpen(true);
  }, [comparedProperties, showNotice]);

  const closeCompareModal = useCallback(() => {
    setIsCompareModalOpen(false);
  }, []);

  return (
    <CompareContext.Provider
      value={{
        comparedProperties,
        maxCompare: MAX_COMPARE,
        isInCompare,
        addToCompare,
        removeFromCompare,
        toggleCompare,
        clearCompare,
        isCompareModalOpen,
        openCompareModal,
        closeCompareModal,
        compareNotice,
      }}
    >
      {children}
    </CompareContext.Provider>
  );
}

export function useCompare() {
  const ctx = useContext(CompareContext);
  if (!ctx) throw new Error('useCompare must be used within CompareProvider');
  return ctx;
}
