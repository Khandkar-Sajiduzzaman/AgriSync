import { useState, useEffect } from "react";
import { getProducts } from "../api/productApi";
import { getWishlist, toggleWishlist } from "../api/userApi";
import { addToCart } from "../api/cartApi";
import ProductCard from "../components/product/ProductCard";

function BrowseProducts() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [wishlistIds, setWishlistIds] = useState([]);
  const [cartMessage, setCartMessage] = useState("");

  const role = JSON.parse(localStorage.getItem("user"))?.role;

  const fetchProducts = async (filters) => {
    setLoading(true);
    setError("");
    try {
      const data = await getProducts(filters);
      setProducts(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts({});

    getProducts()
      .then((all) => {
        setCategories([...new Set(all.map((p) => p.category))]);
      })
      .catch(() => {});

    if (role === "buyer") {
      getWishlist()
        .then((items) => setWishlistIds(items.map((p) => p._id)))
        .catch(() => {});
    }
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    fetchProducts({ search, category, minPrice, maxPrice });
  };

  const handleReset = () => {
    setSearch("");
    setCategory("");
    setMinPrice("");
    setMaxPrice("");
    fetchProducts({});
  };

  const handleToggleWishlist = async (productId) => {
    try {
      await toggleWishlist(productId);
      setWishlistIds((prev) =>
        prev.includes(productId) ? prev.filter((id) => id !== productId) : [...prev, productId]
      );
    } catch (err) {
      setError(err.message);
    }
  };

  const handleAddToCart = async (productId) => {
    try {
      await addToCart(productId, 1);
      setCartMessage("Added to cart!");
      setTimeout(() => setCartMessage(""), 2000);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div style={{ maxWidth: "1000px", margin: "40px auto", padding: "0 20px" }}>
      <h1>Browse Products</h1>

      {cartMessage && (
        <p style={{ background: "#d4edda", color: "#155724", padding: "10px", borderRadius: "5px" }}>
          {cartMessage}
        </p>
      )}

            <form
        onSubmit={handleSubmit}
        style={{
          display: "flex",
          gap: "10px",
          flexWrap: "wrap",
          marginBottom: "25px",
          alignItems: "center",
          padding: "15px",
          background: "#f8f9fa",
          borderRadius: "10px",
          border: "1px solid #e0e0e0",
        }}
      >
        <input
          type="text"
          placeholder="Search by name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            flex: "1 1 200px",
            padding: "10px 14px",
            border: "1px solid #ccc",
            borderRadius: "8px",
            fontSize: "14px",
            background: "#fff",
            outline: "none",
          }}
        />

        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          style={{
            padding: "10px 14px",
            border: "1px solid #ccc",
            borderRadius: "8px",
            fontSize: "14px",
            background: "#fff",
            outline: "none",
            cursor: "pointer",
          }}
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        <input
          type="number"
          placeholder="Min price"
          value={minPrice}
          onChange={(e) => setMinPrice(e.target.value)}
          style={{
            width: "100px",
            padding: "10px 14px",
            border: "1px solid #ccc",
            borderRadius: "8px",
            fontSize: "14px",
            background: "#fff",
            outline: "none",
          }}
          min="0"
        />

        <input
          type="number"
          placeholder="Max price"
          value={maxPrice}
          onChange={(e) => setMaxPrice(e.target.value)}
          style={{
            width: "100px",
            padding: "10px 14px",
            border: "1px solid #ccc",
            borderRadius: "8px",
            fontSize: "14px",
            background: "#fff",
            outline: "none",
          }}
          min="0"
        />

        <button
          type="submit"
          style={{
            padding: "10px 20px",
            background: "#2e7d32",
            color: "white",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
            fontSize: "14px",
            fontWeight: "600",
          }}
        >
          Search
        </button>
        <button
          type="button"
          onClick={handleReset}
          style={{
            padding: "10px 20px",
            background: "#f5f5f5",
            color: "#555",
            border: "1px solid #ccc",
            borderRadius: "8px",
            cursor: "pointer",
            fontSize: "14px",
          }}
        >
          Reset
        </button>
      </form>

      {loading && <p>Loading products...</p>}
      {error && <p style={{ color: "red" }}>{error}</p>}

      {!loading && !error && products.length === 0 && (
        <p>No products match your filters.</p>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
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
            onAddToCart={role === "buyer" ? handleAddToCart : undefined}
          />
        ))}
      </div>
    </div>
  );
}

export default BrowseProducts;