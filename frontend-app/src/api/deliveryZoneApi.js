const API_URL = "http://localhost:5000/api/delivery-zones";

const getToken = () => {
  const t = localStorage.getItem('token');
  if (!t) return null;
  return `Bearer ${t}`;
};

export const createDeliveryZone = async (data) => {
  const resp = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(getToken() ? { Authorization: getToken() } : {}),
    },
    body: JSON.stringify(data),
  });
  const res = await resp.json();
  if (!resp.ok) throw new Error(res.message || 'Failed to create delivery zone');
  return res;
};

export const getMyDeliveryZones = async () => {
  const resp = await fetch(`${API_URL}/my`, {
    headers: {
      ...(getToken() ? { Authorization: getToken() } : {}),
    },
  });
  const res = await resp.json();
  if (!resp.ok) throw new Error(res.message || 'Failed to load delivery zones');
  return res;
};

export const updateDeliveryZone = async (id, data) => {
  const resp = await fetch(`${API_URL}/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...(getToken() ? { Authorization: getToken() } : {}),
    },
    body: JSON.stringify(data),
  });
  const res = await resp.json();
  if (!resp.ok) throw new Error(res.message || 'Failed to update delivery zone');
  return res;
};

export const deleteDeliveryZone = async (id) => {
  const resp = await fetch(`${API_URL}/${id}`, {
    method: 'DELETE',
    headers: {
      ...(getToken() ? { Authorization: getToken() } : {}),
    },
  });
  const res = await resp.json();
  if (!resp.ok) throw new Error(res.message || 'Failed to delete delivery zone');
  return res;
};

export const checkDeliveryCoverage = async (params = {}) => {
  const url = new URL(`${API_URL}/check`);
  Object.keys(params).forEach((k) => params[k] !== undefined && url.searchParams.append(k, params[k]));
  const resp = await fetch(url.toString());
  const res = await resp.json();
  if (!resp.ok) throw new Error(res.message || 'Failed to check coverage');
  return res;
};

export const getPublicZones = async () => {
  // call check without params to get zones list
  const resp = await fetch(`${API_URL}/check`);
  const res = await resp.json();
  if (!resp.ok) throw new Error(res.message || 'Failed to load public zones');
  return res.zones || [];
};

export const getFarmersInZone = async (id) => {
  const resp = await fetch(`${API_URL}/${id}/farmers`);
  const res = await resp.json();
  if (!resp.ok) throw new Error(res.message || 'Failed to load farmers for zone');
  return res;
};
