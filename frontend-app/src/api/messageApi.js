const BASE_URL = `${import.meta.env.VITE_API_URL}/api/messages`;

const authHeader = () => {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const getConversations = async () => {
  const res = await fetch(`${BASE_URL}/conversations`, { headers: { ...authHeader() } });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to load conversations");
  return data;
};

export const getMessages = async (userId) => {
  const res = await fetch(`${BASE_URL}/${userId}`, { headers: { ...authHeader() } });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to load messages");
  return data;
};

export const sendMessage = async (messageData) => {
  const res = await fetch(`${BASE_URL}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeader() },
    body: JSON.stringify(messageData),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to send message");
  return data;
};