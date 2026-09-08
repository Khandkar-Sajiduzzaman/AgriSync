const BASE_URL = `${import.meta.env.VITE_API_URL}/api/payment`;

export const createBkashPayment = async (orderId) => {
  const res = await fetch(`${BASE_URL}/bkash/create`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${localStorage.getItem("token")}`,
    },
    body: JSON.stringify({ orderId }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "bKash initialization failed");
  return data;
};
