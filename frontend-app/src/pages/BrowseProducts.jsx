import { useState, useEffect } from "react";
import { getProducts, getCategories } from "../api/productApi";
import { getWishlist, toggleWishlist } from "../api/userApi";
import ProductCard from "../components/product/ProductCard";
import CompareBar from "../components/product/CompareBar";

function BrowseProducts() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [farmer, setFarmer] = useState("");
  const [sortBy, setSortBy] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [wishlistIds, setWishlistIds] = useState([]);

  const role = JSON.parse(localStorage.getItem("user"))?.role;

  const extractArray = (response) => {
    if (Array.isArray(response)) return response;
    if (response && Array.isArray(response.data)) return response.data;
    return [];
  };

  const fetchProducts = async (filters) => {
    setLoading(true);
    setError("");
    try {
      const result = await getProducts(filters);
      setProducts(extractArray(result));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts({ page: 1 });

    getCategories()
      .then((cats) => setCategories(cats))
      .catch((err) => {
        console.error("Failed to load categories:", err);
        setError(err.message);
      });

    if (role === "buyer") {
      getWishlist()
        .then((items) => setWishlistIds(items.map((p) => p._id)))
        .catch(() => {});
    }
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    fetchProducts({ search, category, minPrice, maxPrice, farmer, page: 1, sortBy });
  };

  const handleReset = () => {
    setSearch("");
    setCategory("");
    setMinPrice("");
    setMaxPrice("");
    setFarmer("");
    setSortBy("");
    fetchProducts({ page: 1 });
  };

  const handleToggleWishlist = async (productId) => {
    const wasSaved = wishlistIds.includes(productId);
    setWishlistIds((prev) =>
      wasSaved ? prev.filter((id) => id !== productId) : [...prev, productId]
    );

    try {
      await toggleWishlist(productId);
    } catch (err) {
      setWishlistIds((prev) =>
        wasSaved ? [...prev, productId] : prev.filter((id) => id !== productId)
      );
      console.error("Wishlist toggle failed:", err.message);
    }
  };

  const inputStyle = {
    width: "100%",
    padding: "12px 14px",
    fontSize: "15px",
    border: "2px solid #bdbdbd",
    borderRadius: "10px",
    backgroundColor: "#ffffff",
    color: "#333333",
    boxSizing: "border-box",
    outline: "none",
  };

  return (
    <div className="page-container">
      <h2 style={{ marginBottom: "24px", fontSize: "28px", color: "#1B5E20" }}>
        Browse Products
      </h2>

      <div
        style={{
          backgroundColor: "#ffffff",
          borderRadius: "16px",
          padding: "24px",
          boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
          border: "1px solid #e0e0e0",
          marginBottom: "30px",
        }}
      >
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: "16px" }}>
            <label
              style={{
                display: "block",
                fontSize: "14px",
                fontWeight: "600",
                color: "#333333",
                marginBottom: "6px",
              }}
            >
              Search by name
            </label>
            <input
              type="text"
              placeholder="e.g. Rice, Tomatoes, Mangoes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={inputStyle}
            />
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
              gap: "16px",
              marginBottom: "20px",
            }}
          >
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "14px",
                  fontWeight: "600",
                  color: "#333333",
                  marginBottom: "6px",
                }}
              >
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                style={inputStyle}
              >
                <option value="">All categories</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "14px",
                  fontWeight: "600",
                  color: "#333333",
                  marginBottom: "6px",
                }}
              >
                Min Price (৳)
              </label>
              <input
                type="number"
                placeholder="0"
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
                min="0"
                style={inputStyle}
              />
            </div>

            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "14px",
                  fontWeight: "600",
                  color: "#333333",
                  marginBottom: "6px",
                }}
              >
                Max Price (৳)
              </label>
              <input
                type="number"
                placeholder="Any"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                min="0"
                style={inputStyle}
              />
            </div>

            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "14px",
                  fontWeight: "600",
                  color: "#333333",
                  marginBottom: "6px",
                }}
              >
                Farmer (optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Rahim, Karim..."
                value={farmer}
                onChange={(e) => setFarmer(e.target.value)}
                style={inputStyle}
              />
            </div>

            {/* SORT BY DROPDOWN — MUST BE INSIDE THE GRID */}
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "14px",
                  fontWeight: "600",
                  color: "#333333",
                  marginBottom: "6px",
                }}
              >
                Sort By
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                style={inputStyle}
              >
                <option value="">Newest First</option>
                <option value="rating_high">Highest Rated</option>
                <option value="rating_low">Lowest Rated</option>
                <option value="price_low">Price: Low to High</option>
                <option value="price_high">Price: High to Low</option>
                <option value="name_asc">Name: A to Z</option>
              </select>
            </div>
          </div>

          <div style={{ display: "flex", gap: "12px" }}>
            <button
              type="submit"
              style={{
                backgroundColor: "#2E7D32",
                color: "#ffffff",
                border: "none",
                padding: "12px 28px",
                borderRadius: "10px",
                fontSize: "15px",
                fontWeight: "600",
                cursor: "pointer",
              }}
            >
              Search
            </button>
            <button
              type="button"
              onClick={handleReset}
              style={{
                backgroundColor: "#ffffff",
                color: "#2E7D32",
                border: "2px solid #2E7D32",
                padding: "12px 24px",
                borderRadius: "10px",
                fontSize: "15px",
                fontWeight: "600",
                cursor: "pointer",
              }}
            >
              Reset
            </button>
          </div>
        </form>
      </div>

      {loading && (
        <p style={{ textAlign: "center", padding: "40px", color: "#666" }}>
          Loading products...
        </p>
      )}
      {error && (
        <p style={{ color: "#C62828", textAlign: "center", padding: "20px" }}>
          {error}
        </p>
      )}

      {!loading && !error && products.length === 0 && (
        <p style={{ textAlign: "center", color: "#666", padding: "40px" }}>
          No products match your filters.
        </p>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
          gap: "20px",
        }}
      >
        {products.map((product) => (
          <ProductCard
            key={product._id}
            product={product}
            showActions={false}
            isWishlisted={wishlistIds.includes(product._id)}
            onToggleWishlist={role === "buyer" ? handleToggleWishlist : undefined}
            showCompare={role === "buyer"}
          />
        ))}
      </div>

      <CompareBar />
    </div>
  );
}

export default BrowseProducts;