const API_URL = "http://localhost:5000/api/comparisons";

// Get full details for a set of products (up to 4) for side-by-side comparison
export const getComparisonProducts = async (ids = []) => {
  if (!ids.length) return [];

  const query = ids.join(",");
  const response = await fetch(`${API_URL}/products?ids=${encodeURIComponent(query)}`);

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Failed to load products for comparison");
  }

  return data;
};