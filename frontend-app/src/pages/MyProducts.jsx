import { useEffect, useState } from "react";
import { getProducts, deleteProduct } from "../api/productApi";
import ProductCard from "../components/ProductCard";

function MyProducts() {
  const [products, setProducts] = useState([]);
  const [status, setStatus] = useState("");

  const user = JSON.parse(localStorage.getItem("user"));

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      const data = await getProducts();

      // Only show products belonging to the logged-in farmer
      const myProducts = data.filter(
        (product) => product.farmer && product.farmer._id === user._id
      );

      setProducts(myProducts);
    } catch (err) {
      console.error(err);
      setStatus("Failed to load products.");
    }
  };

  const handleDelete = async (id) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this product?"
    );

    if (!confirmDelete) return;

    try {
      await deleteProduct(id);
      loadProducts();
    } catch (err) {
      console.error(err);
      setStatus("Failed to delete product.");
    }
  };

  return (
    <div
      style={{
        maxWidth: "900px",
        margin: "40px auto",
      }}
    >
      <h2>My Products</h2>

      {status && <p>{status}</p>}

      {products.length === 0 ? (
        <p>No products found.</p>
      ) : (
        products.map((product) => (
          <ProductCard
            key={product._id}
            product={product}
            onDelete={handleDelete}
          />
        ))
      )}
    </div>
  );
}

export default MyProducts;