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
export const getMyOrders = async (page = 1, limit = 20) => {
  const res = await fetch(`${BASE_URL}?page=${page}&limit=${limit}`, {
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

// Get available delivery men (for farmer to assign)
export const getAvailableDeliveryMen = async () => {
  const res = await fetch(`${BASE_URL}/available-delivery-men`, {
    headers: { ...authHeader() },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to load delivery men");
  return data;
};

// Assign a delivery man to an order
export const assignDeliveryMan = async (orderId, deliveryManId) => {
  const res = await fetch(`${BASE_URL}/${orderId}/assign-delivery`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...authHeader() },
    body: JSON.stringify({ deliveryManId }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to assign delivery man");
  return data;
};

// Lightweight endpoint: only the latest GPS point (for polling)
export const getLatestTracking = async (orderId) => {
  const res = await fetch(`${BASE_URL}/${orderId}/latest-tracking`, {
    headers: { ...authHeader() },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to load tracking");
  return data;
};

// Delivery man updates their GPS location
export const updateDeliveryLocation = async (lat, lng) => {
  const res = await fetch("http://localhost:5000/api/delivery/location", {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...authHeader() },
    body: JSON.stringify({ latitude: lat, longitude: lng }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to update location");
  return data;
};

// Get live delivery location (authorized users only)
export const getDeliveryLocation = async (userId) => {
  const res = await fetch(`${BASE_URL}/delivery/location/${userId}`, {
    headers: { ...authHeader() },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to load location");
  return data;
};