const API_URL = 'http://localhost:5000/api/offers';

const headers = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${localStorage.getItem('token')}`,
});

const request = async (url, options = {}) => {
  const response = await fetch(url, { ...options, headers: { ...headers(), ...options.headers } });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'Offer request failed');
  return data;
};

export const submitOffer = (payload) => request(API_URL, { method: 'POST', body: JSON.stringify(payload) });
export const getMyOffers = () => request(`${API_URL}/my`);
export const getActiveOffers = () => request(`${API_URL}/active`);
export const getOffers = (status = '') => request(status ? `${API_URL}?status=${encodeURIComponent(status)}` : API_URL);
export const reviewOffer = (id, action, rejectionReason = '') => request(`${API_URL}/${id}/${action}`, {
  method: 'PATCH',
  body: JSON.stringify({ rejectionReason }),
});
