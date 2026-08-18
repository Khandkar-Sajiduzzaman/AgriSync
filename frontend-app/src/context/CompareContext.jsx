import { createContext, useContext, useState, useCallback } from "react";

const CompareContext = createContext(null);

const MAX_COMPARE = 4;

export function CompareProvider({ children }) {
  // Session-only: not persisted to localStorage or the backend.
  const [compareIds, setCompareIds] = useState([]);

  const addToCompare = useCallback((productId) => {
    setCompareIds((prev) => {
      if (prev.includes(productId)) return prev;
      if (prev.length >= MAX_COMPARE) return prev; // silently ignore; UI should disable instead
      return [...prev, productId];
    });
  }, []);

  const removeFromCompare = useCallback((productId) => {
    setCompareIds((prev) => prev.filter((id) => id !== productId));
  }, []);

  const toggleCompare = useCallback((productId) => {
    setCompareIds((prev) =>
      prev.includes(productId)
        ? prev.filter((id) => id !== productId)
        : prev.length >= MAX_COMPARE
        ? prev
        : [...prev, productId]
    );
  }, []);

  const clearCompare = useCallback(() => setCompareIds([]), []);

  const isComparing = useCallback((productId) => compareIds.includes(productId), [compareIds]);

  const isFull = compareIds.length >= MAX_COMPARE;

  return (
    <CompareContext.Provider
      value={{
        compareIds,
        addToCompare,
        removeFromCompare,
        toggleCompare,
        clearCompare,
        isComparing,
        isFull,
        maxCompare: MAX_COMPARE,
      }}
    >
      {children}
    </CompareContext.Provider>
  );
}

export function useCompare() {
  const ctx = useContext(CompareContext);
  if (!ctx) throw new Error("useCompare must be used inside CompareProvider");
  return ctx;
}