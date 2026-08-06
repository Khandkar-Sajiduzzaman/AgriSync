// This file centralizes every call to the backend, so components
// don't each write their own fetch() logic. Similar to having one
// api.js file instead of scattering curl/AJAX calls across pages.

const BASE_URL = "http://localhost:5000/api/users";

// helper: reads the saved token and builds the auth header
const authHeader = () => {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const registerUser = async (userData) => {
  const res = await fetch(`${BASE_URL}/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(userData),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Registration failed");
  return data;
};

export const loginUser = async (credentials) => {
  const res = await fetch(`${BASE_URL}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(credentials),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Login failed");
  return data;
};

export const getProfile = async () => {
  const res = await fetch(`${BASE_URL}/profile`, {
    headers: { ...authHeader() },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Could not load profile");
  return data;
};

export const updateProfile = async (updates) => {
  const res = await fetch(`${BASE_URL}/profile`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...authHeader() },
    body: JSON.stringify(updates),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Update failed");
  return data;
};

export const uploadProfileImage = async (file) => {
  const formData = new FormData();
  formData.append("profileImage", file);

  const res = await fetch(`${BASE_URL}/profile/image`, {
    method: "PUT",
    headers: { ...authHeader() }, // no Content-Type here - browser sets it for FormData
    body: formData,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Image upload failed");
  return data;
};
export const toggleWishlist = async (productId) => {
  const res = await fetch(`${BASE_URL}/wishlist/${productId}`, {
    method: "PUT",
    headers: { ...authHeader() },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Could not update wishlist");
  return data;
};

export const getWishlist = async () => {
  const res = await fetch(`${BASE_URL}/wishlist`, {
    headers: { ...authHeader() },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Could not load wishlist");
  return data;
};

export const toggleFollowFarmer = async (farmerId) => {
  const res = await fetch(`${BASE_URL}/follow/${farmerId}`, {
    method: "PUT",
    headers: { ...authHeader() },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Could not update follow status");
  return data;
};

export const getFollowedFarmers = async () => {
  const res = await fetch(`${BASE_URL}/following`, {
    headers: { ...authHeader() },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Could not load followed farmers");
  return data;
};