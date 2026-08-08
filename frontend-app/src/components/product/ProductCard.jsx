import { Link } from "react-router-dom";
import { useState } from "react";
import { addToCart } from "../../api/cartApi";
import { useCart } from "../../context/CartContext";

function ProductCard({
  product,
  onDelete,
  showActions = true,
  isWishlisted,
  onToggleWishlist,
}) {
  const [adding, setAdding] = useState(false);
  const [message, setMessage] = useState("");
  const { refreshCart } = useCart();

  const role = JSON.parse(localStorage.getItem("user") || "{}")?.role;

  const handleAddToCart = async () => {
    setAdding(true);
    setMessage("");
    try {
      await addToCart(product._id, 1);
      setMessage("Added!");
      refreshCart();
      setTimeout(() => setMessage(""), 1500);
    } catch (err) {
      setMessage(err.message);
    } finally {
      setAdding(false);
    }
  };

  // Shared button style
  const btnStyle = {
    padding: "8px 14px",
    borderRadius: "6px",
    border: "none",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "500",
    textDecoration: "none",
    display: "inline-block",
    textAlign: "center",
  };

  return (
    <div
      style={{
        border: "1px solid #ddd",
        borderRadius: "12px",
        padding: "20px",
        marginBottom: "20px",
        boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
        background: "#fff",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {product.images && product.images.length > 0 ? (
        <img
          src={`http://localhost:5000${product.images[0]}`}
          alt={product.name}
          style={{ width: "100%", height: "150px", objectFit: "cover", borderRadius: "8px" }}
        />
      ) : (
        <div
          style={{
            width: "100%",
            height: "150px",
            background: "#f0f0f0",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: "8px",
            color: "#888",
          }}
        >
          No Image
        </div>
      )}

      <h3 style={{ margin: "12px 0 8px 0", fontSize: "18px" }}>{product.name}</h3>

      <p style={{ margin: "4px 0", color: "#555" }}><strong>Category:</strong> {product.category || product.legacyCategory}</p>
      <p style={{ margin: "4px 0", color: "#555" }}><strong>Price:</strong> ৳{product.price}</p>
      <p style={{ margin: "4px 0", color: "#555" }}><strong>Stock:</strong> {product.stock} {product.unit}</p>

      <div style={{ display: "flex", gap: "8px", marginTop: "15px", flexWrap: "wrap", alignItems: "center" }}>
        {/* VIEW BUTTON — styled like a real button */}
        <Link
          to={`/products/${product._id}`}
          style={{
            ...btnStyle,
            background: "#e8f5e9",
            color: "#2e7d32",
            border: "1px solid #a5d6a7",
          }}
        >
          View
        </Link>

        {showActions && (
          <>
            <Link
              to={`/products/${product._id}/edit`}
              style={{
                ...btnStyle,
                background: "#fff3e0",
                color: "#e65100",
                border: "1px solid #ffcc80",
              }}
            >
              Edit
            </Link>

            <button
              onClick={() => onDelete(product._id)}
              style={{
                ...btnStyle,
                background: "#ffebee",
                color: "#c62828",
                border: "1px solid #ef9a9a",
              }}
            >
              Delete
            </button>
          </>
        )}

        {role === "buyer" && (
          <>
            <button
              onClick={handleAddToCart}
              disabled={adding || product.stock < 1}
              style={{
                ...btnStyle,
                background: product.stock < 1 ? "#ccc" : "#27ae60",
                color: "white",
                cursor: product.stock < 1 ? "not-allowed" : "pointer",
              }}
            >
              {adding ? "Adding..." : product.stock < 1 ? "Out of Stock" : "Add to Cart"}
            </button>
            {message && (
              <span style={{ fontSize: "12px", color: message === "Added!" ? "green" : "red", fontWeight: "bold" }}>
                {message}
              </span>
            )}
          </>
        )}

        {onToggleWishlist && (
          <button
            onClick={() => onToggleWishlist(product._id)}
            style={{
              ...btnStyle,
              background: isWishlisted ? "#fce4ec" : "#f5f5f5",
              color: isWishlisted ? "#c62828" : "#666",
              border: "1px solid #ddd",
            }}
          >
            {isWishlisted ? "♥ Saved" : "♡ Save"}
          </button>
        )}
      </div>
    </div>
  );
}

export default ProductCard;