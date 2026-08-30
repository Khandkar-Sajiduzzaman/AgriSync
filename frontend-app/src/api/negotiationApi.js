const BASE_URL = "http://localhost:5000/api/negotiations";

const authHeader = () => {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const createOffer = async (offerData) => {
  const res = await fetch(BASE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeader() },
    body: JSON.stringify(offerData),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to submit offer");
  return data;
};

export const respondToOffer = async (id, responseData) => {
  const res = await fetch(`${BASE_URL}/${id}/respond`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...authHeader() },
    body: JSON.stringify(responseData),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to process response");
  return data;
};

export const getMyNegotiations = async () => {
  const res = await fetch(BASE_URL, { headers: { ...authHeader() } });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to load negotiations");
  return data;
};