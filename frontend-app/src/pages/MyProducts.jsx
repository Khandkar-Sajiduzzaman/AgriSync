import { useEffect, useState } from "react";
import { getMyProducts, deleteProduct } from "../api/productApi";
import ProductCard from "../components/product/ProductCard";

function MyProducts() {
  const [products, setProducts] = useState([]);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const data = await getMyProducts(); // Only fetches THIS farmer's products
      setProducts(data);
    } catch (err) {
      console.error(err);
      setStatus("Failed to load products.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this product?"
    );
    if (!confirmDelete) return;

    // Optimistic delete: remove from UI immediately
    setProducts((prev) => prev.filter((p) => p._id !== id));

    try {
      await deleteProduct(id);
    } catch (err) {
      console.error(err);
      setStatus("Failed to delete product.");
      // If delete fails, reload to restore the item
      loadProducts();
    }
  };

  if (loading) return <p>Loading your products...</p>;

  return (
    <div style={{ maxWidth: "1000px", margin: "40px auto", padding: "0 20px" }}>
      <h2>My Products</h2>
      {status && <p style={{ color: "red" }}>{status}</p>}

      {products.length === 0 ? (
        <p>No products found.</p>
      ) : (
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
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default MyProducts;