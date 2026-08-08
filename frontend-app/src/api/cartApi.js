const BASE_URL = "http://localhost:5000/api/cart";

const getToken = () => localStorage.getItem("token");

const authHeader = () => {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// Add product to cart
export const addToCart = async (productId, quantity = 1) => {
  const res = await fetch(`${BASE_URL}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeader() },
    body: JSON.stringify({ productId, quantity }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to add to cart");
  return data;
};

// Get all items in cart
export const getCart = async () => {
  const res = await fetch(`${BASE_URL}`, {
    headers: { ...authHeader() },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to load cart");
  return data;
};

// Update quantity
export const updateCartQuantity = async (productId, quantity) => {
  const res = await fetch(`${BASE_URL}/${productId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...authHeader() },
    body: JSON.stringify({ quantity }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to update cart");
  return data;
};

// Remove item from cart
export const removeFromCart = async (productId) => {
  const res = await fetch(`${BASE_URL}/${productId}`, {
    method: "DELETE",
    headers: { ...authHeader() },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to remove item");
  return data;
};

// Clear entire cart
export const clearCart = async () => {
  const res = await fetch(`${BASE_URL}`, {
    method: "DELETE",
    headers: { ...authHeader() },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to clear cart");
  return data;
};