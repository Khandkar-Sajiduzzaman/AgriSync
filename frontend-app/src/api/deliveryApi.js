const BASE_URL = "http://localhost:5000/api/delivery";

const getToken = () => localStorage.getItem("token");

const authHeader = () => {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// Farmer: Find nearby available delivery men for a specific order
export const findNearbyDeliveryMen = async (orderId, maxDistance = 10) => {
  const res = await fetch(`${BASE_URL}/find-nearby`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeader() },
    body: JSON.stringify({ orderId, maxDistance }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to find delivery men");
  return data;
};

// Farmer: Send a delivery request to a specific delivery man
export const sendDeliveryRequest = async (orderId, deliveryManId, message = "") => {
  const res = await fetch(`${BASE_URL}/send-request`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeader() },
    body: JSON.stringify({ orderId, deliveryManId, message }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to send delivery request");
  return data;
};

// Delivery Man: Get all delivery requests sent to me
export const getDeliveryRequests = async (status = "pending") => {
  const res = await fetch(`${BASE_URL}/my-requests?status=${status}`, {
    headers: { ...authHeader() },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to load delivery requests");
  return data;
};

// Delivery Man: Accept or reject a delivery request
export const respondToDeliveryRequest = async (requestId, status) => {
  const res = await fetch(`${BASE_URL}/respond-request/${requestId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...authHeader() },
    body: JSON.stringify({ status }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to respond to request");
  return data;
};

// Delivery Man: Get all my active deliveries
export const getMyActiveDeliveries = async () => {
  const res = await fetch(`${BASE_URL}/my-deliveries`, {
    headers: { ...authHeader() },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to load active deliveries");
  return data;
};

// Delivery Man: Mark a single order as out_for_delivery
export const markDeliveryStarted = async (orderId) => {
  const res = await fetch(`${BASE_URL}/start-delivery/${orderId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...authHeader() },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to start delivery");
  return data;
};

// Delivery Man: Start batch delivery for normal orders in a city
export const startBatchDelivery = async (city) => {
  const res = await fetch(`${BASE_URL}/start-batch`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...authHeader() },
    body: JSON.stringify({ city }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to start batch delivery");
  return data;
};

// Delivery Man: Get available normal delivery batches by city
export const getNormalDeliveryBatches = async () => {
  const res = await fetch(`${BASE_URL}/batches`, {
    headers: { ...authHeader() },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to load delivery batches");
  return data;
};

// Delivery Man: Update preferences (areas, max orders)
export const updateDeliveryPreferences = async (preferredAreas, maxOrders) => {
  const res = await fetch(`${BASE_URL}/preferences`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...authHeader() },
    body: JSON.stringify({ preferredAreas, maxOrders }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to update preferences");
  return data;
};

// Delivery Man: Toggle online/offline status
export const toggleAvailability = async (isAvailable) => {
  const res = await fetch(`${BASE_URL}/toggle-availability`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...authHeader() },
    body: JSON.stringify({ isAvailable }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to toggle availability");
  return data;
};