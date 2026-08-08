const BASE_URL = "http://localhost:5000/api/orders";

const getToken = () => localStorage.getItem("token");

const authHeader = () => {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// Place order from cart
export const placeOrder = async (orderData) => {
  const res = await fetch(`${BASE_URL}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeader() },
    body: JSON.stringify(orderData),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to place order");
  return data;
};

// Get my orders
export const getMyOrders = async () => {
  const res = await fetch(`${BASE_URL}`, {
    headers: { ...authHeader() },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to load orders");
  return data;
};

// Get single order details
export const getOrderById = async (orderId) => {
  const res = await fetch(`${BASE_URL}/${orderId}`, {
    headers: { ...authHeader() },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to load order");
  return data;
};

// Update order status
export const updateOrderStatus = async (orderId, statusData) => {
  const res = await fetch(`${BASE_URL}/${orderId}/status`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...authHeader() },
    body: JSON.stringify(statusData),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to update status");
  return data;
};

// Get tracking history
export const getOrderTracking = async (orderId) => {
  const res = await fetch(`${BASE_URL}/${orderId}/tracking`, {
    headers: { ...authHeader() },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to load tracking");
  return data;
};