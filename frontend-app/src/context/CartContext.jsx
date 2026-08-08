import { createContext, useContext, useState, useCallback, useEffect } from "react";
import { getCart } from "../api/cartApi";

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const [cartCount, setCartCount] = useState(0);
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(false);

  const refreshCart = useCallback(async () => {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    if (user.role !== "buyer") return;

    setLoading(true);
    try {
      const data = await getCart();
      setCartItems(data.items || []);
      setCartCount(data.summary?.totalItems || 0);
    } catch {
      setCartItems([]);
      setCartCount(0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshCart();
  }, [refreshCart]);

  return (
    <CartContext.Provider value={{ cartCount, cartItems, loading, refreshCart }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}