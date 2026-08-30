const BASE_URL = "http://localhost:5000/api/admin";

const authHeader = () => {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const handleResponse = async (res) => {
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Request failed");
  return data;
};

// Build query string from params object
const buildQuery = (params) => {
  const p = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") p.append(key, value);
  });
  const q = p.toString();
  return q ? `?${q}` : "";
};

export const getAdminStats = async () => {
  const res = await fetch(`${BASE_URL}/stats`, { headers: { ...authHeader() } });
  return handleResponse(res);
};

export const getAllUsers = async (params = {}) => {
  const res = await fetch(`${BASE_URL}/users${buildQuery(params)}`, { headers: { ...authHeader() } });
  return handleResponse(res);
};

export const updateUserStatus = async (id, body) => {
  const res = await fetch(`${BASE_URL}/users/${id}/status`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...authHeader() },
    body: JSON.stringify(body),
  });
  return handleResponse(res);
};

export const getAllProductsAdmin = async (params = {}) => {
  const res = await fetch(`${BASE_URL}/products${buildQuery(params)}`, { headers: { ...authHeader() } });
  return handleResponse(res);
};

export const getPendingProducts = async (params = {}) => {
  const res = await fetch(`${BASE_URL}/products/pending${buildQuery(params)}`, { headers: { ...authHeader() } });
  return handleResponse(res);
};

export const approveProduct = async (id) => {
  const res = await fetch(`${BASE_URL}/products/${id}/approve`, {
    method: "PUT",
    headers: { ...authHeader() },
  });
  return handleResponse(res);
};

export const removeProduct = async (id, reason) => {
  const res = await fetch(`${BASE_URL}/products/${id}/remove`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...authHeader() },
    body: JSON.stringify({ reason }),
  });
  return handleResponse(res);
};

export const restoreProduct = async (id) => {
  const res = await fetch(`${BASE_URL}/products/${id}/restore`, {
    method: "PUT",
    headers: { ...authHeader() },
  });
  return handleResponse(res);
};

export const getActionLogs = async (params = {}) => {
  const res = await fetch(`${BASE_URL}/action-logs${buildQuery(params)}`, { headers: { ...authHeader() } });
  return handleResponse(res);
};