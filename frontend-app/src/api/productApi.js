const API_URL = "http://localhost:5000/api/products";

const getToken = () => {
  return localStorage.getItem("token");
};

// Create Product
export const createProduct = async (productData) => {
  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getToken()}`,
    },
    body: JSON.stringify(productData),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Failed to create product");
  }

  return data;
};

// Get distinct categories
export const getCategories = async () => {
  const response = await fetch(`${API_URL}/categories`);
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || "Failed to load categories");
  }
  return data;
};

// Get All Products (paginated + filtered + sorted)
export const getProducts = async (filters = {}) => {
  const params = new URLSearchParams();

  if (filters.search) params.append("search", filters.search);
  if (filters.category) params.append("category", filters.category);
  if (filters.minPrice) params.append("minPrice", filters.minPrice);
  if (filters.maxPrice) params.append("maxPrice", filters.maxPrice);
  if (filters.farmer) params.append("farmer", filters.farmer);
  if (filters.page) params.append("page", filters.page);
  if (filters.sortBy) params.append("sortBy", filters.sortBy);

  const query = params.toString();
  const response = await fetch(query ? `${API_URL}?${query}` : API_URL);

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || "Failed to load products");
  }
  return data;
};

// Get Single Product
export const getProduct = async (id) => {
  const response = await fetch(`${API_URL}/${id}`);

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Failed to load product");
  }

  return data;
};

// Update Product
export const updateProduct = async (id, productData) => {
  const response = await fetch(`${API_URL}/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getToken()}`,
    },
    body: JSON.stringify(productData),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Failed to update product");
  }

  return data;
};

// Delete Product
export const deleteProduct = async (id) => {
  const response = await fetch(`${API_URL}/${id}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${getToken()}`,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Failed to delete product");
  }

  return data;
};

// Upload Product Image
export const uploadProductImage = async (id, imageFile) => {
  const formData = new FormData();
  formData.append("productImage", imageFile);

  const response = await fetch(`${API_URL}/${id}/image`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${getToken()}`,
    },
    body: formData,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Failed to upload image");
  }

  return data;
};

// Get Smart Recommendations
export const getRecommendations = async () => {
  const response = await fetch(`${API_URL}/recommendations`, {
    headers: {
      Authorization: `Bearer ${getToken()}`,
    },
  });
  
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || "Failed to load recommendations");
  }
  return data;
};

// Record Product View
export const recordProductView = async (id) => {
  try {
    await fetch(`${API_URL}/${id}/view`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${getToken()}`,
      },
    });
  } catch (error) {
    console.error("Failed to record view");
  }
};

// Get My Products
export const getMyProducts = async () => {
  const response = await fetch(`${API_URL}/my`, {
    headers: {
      Authorization: `Bearer ${getToken()}`,
    },
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || "Failed to load your products");
  }
  return data;
};