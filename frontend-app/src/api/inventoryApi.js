const API_URL = 'http://localhost:5000/api/inventory';

const getToken = () => localStorage.getItem('token');

const getHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${getToken()}`,
});

export const getInventoryOverview = async () => {
  const response = await fetch(`${API_URL}/overview`, { headers: { Authorization: `Bearer ${getToken()}` } });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'Failed to load inventory overview');
  return data;
};

export const getInventoryProducts = async () => {
  const response = await fetch(`${API_URL}/products`, { headers: { Authorization: `Bearer ${getToken()}` } });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'Failed to load inventory products');
  return data;
};

export const getInventoryHistory = async () => {
  const response = await fetch(`${API_URL}/history`, { headers: { Authorization: `Bearer ${getToken()}` } });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'Failed to load inventory history');
  return data;
};

export const getInventoryRequests = async (status = '') => {
  const url = status ? `${API_URL}/requests?status=${encodeURIComponent(status)}` : `${API_URL}/requests`;
  const response = await fetch(url, { headers: { Authorization: `Bearer ${getToken()}` } });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Failed to load inventory requests');
  }
  return data;
};

export const getMyInventoryRequests = async () => {
  const response = await fetch(`${API_URL}/requests/my`, { headers: { Authorization: `Bearer ${getToken()}` } });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Failed to load your inventory requests');
  }
  return data;
};

export const submitInventoryRequest = async (payload) => {
  const response = await fetch(`${API_URL}/requests`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(payload),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Failed to submit inventory request');
  }
  return data;
};

export const approveInventoryRequest = async (requestId) => {
  const response = await fetch(`${API_URL}/requests/${requestId}/approve`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'Failed to approve request');
  return data;
};

export const rejectInventoryRequest = async (requestId, rejectionReason) => {
  const response = await fetch(`${API_URL}/requests/${requestId}/reject`, {
    method: 'PATCH',
    headers: getHeaders(),
    body: JSON.stringify({ rejectionReason }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'Failed to reject request');
  return data;
};

export const adjustInventoryStock = async (productId, { newStock, reason }) => {
  const response = await fetch(`${API_URL}/products/${productId}/adjust`, {
    method: 'PATCH',
    headers: getHeaders(),
    body: JSON.stringify({ newStock, reason }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'Failed to adjust stock');
  return data;
};
