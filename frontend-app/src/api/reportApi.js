const BASE_URL = `${import.meta.env.VITE_API_URL}/api/admin/reports/sales`;

const authHeader = () => {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const generateSalesReport = async (payload) => {
  const res = await fetch(BASE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeader() },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to generate report");
  return data;
};

export const getSalesReports = async (page = 1, limit = 20) => {
  const res = await fetch(`${BASE_URL}?page=${page}&limit=${limit}`, {
    headers: { ...authHeader() },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to load reports");
  return data;
};

export const getSalesReportById = async (id) => {
  const res = await fetch(`${BASE_URL}/${id}`, {
    headers: { ...authHeader() },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to load report");
  return data;
};