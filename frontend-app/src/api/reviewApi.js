const BASE_URL = "http://localhost:5000/api/reviews";

const getToken = () => localStorage.getItem("token");

const authHeader = () => {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const getProductReviews = async (productId, sort = "newest") => {
  const res = await fetch(`${BASE_URL}/product/${productId}?sort=${sort}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to load reviews");
  return data;
};

export const createReview = async (reviewData) => {
  const res = await fetch(`${BASE_URL}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeader() },
    body: JSON.stringify(reviewData),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to submit review");
  return data;
};

export const canReviewProduct = async (productId) => {
  const res = await fetch(`${BASE_URL}/can-review/${productId}`, {
    headers: { ...authHeader() },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to check review eligibility");
  return data;
};

export const getMyReviews = async () => {
  const res = await fetch(`${BASE_URL}/my`, {
    headers: { ...authHeader() },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to load your reviews");
  return data;
};

export const deleteReview = async (reviewId) => {
  const res = await fetch(`${BASE_URL}/${reviewId}`, {
    method: "DELETE",
    headers: { ...authHeader() },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to delete review");
  return data;
};