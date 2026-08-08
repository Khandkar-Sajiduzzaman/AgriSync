import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getCart, updateCartQuantity, removeFromCart } from "../api/cartApi";
import { useCart } from "../context/CartContext";

function CartPage() {
  const [cart, setCart] = useState({ items: [], summary: { totalItems: 0, totalPrice: 0 } });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { refreshCart } = useCart();
  const navigate = useNavigate();

  const loadCart = async () => {
    setLoading(true);
    try {
      const data = await getCart();
      setCart(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCart();
  }, []);

  const handleQuantityChange = async (productId, newQty) => {
    try {
      await updateCartQuantity(productId, parseInt(newQty));
      await loadCart();
      refreshCart();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleRemove = async (productId) => {
    try {
      await removeFromCart(productId);
      await loadCart();
      refreshCart();
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) return <p style={{ textAlign: "center", marginTop: "40px" }}>Loading cart...</p>;

  return (
    <div style={{ maxWidth: "900px", margin: "40px auto", padding: "0 20px" }}>
      <h1>🛒 Shopping Cart</h1>

      {error && <p style={{ color: "red" }}>{error}</p>}

      {cart.items.length === 0 ? (
        <div style={{ textAlign: "center", marginTop: "60px" }}>
          <p>Your cart is empty.</p>
          <Link to="/products/browse">
            <button style={{ marginTop: "15px" }}>Browse Products</button>
          </Link>
        </div>
      ) : (
        <>
          <div style={{ marginTop: "20px" }}>
            {cart.items.map((item) => (
              <div
                key={item.id}
                style={{
                  display: "flex",
                  gap: "20px",
                  alignItems: "center",
                  border: "1px solid #ddd",
                  borderRadius: "10px",
                  padding: "15px",
                  marginBottom: "15px",
                }}
              >
                {/* Product Image */}
                {item.product.images && item.product.images.length > 0 ? (
                  <img
                    src={`http://localhost:5000${item.product.images[0]}`}
                    alt={item.product.name}
                    style={{ width: "100px", height: "80px", objectFit: "cover", borderRadius: "8px" }}
                  />
                ) : (
                  <div style={{ width: "100px", height: "80px", background: "#eee", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    No Image
                  </div>
                )}

                {/* Product Info */}
                <div style={{ flex: 1 }}>
                  <h3 style={{ margin: "0 0 5px 0" }}>{item.product.name}</h3>
                  <p style={{ margin: "0", color: "#666" }}>
                    Farmer: {item.product.farmer?.name} | ৳{item.product.price} / {item.product.unit}
                  </p>
                </div>

                {/* Quantity Controls */}
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <label>Qty:</label>
                  <input
                    type="number"
                    min="1"
                    max={item.product.stock + item.quantity}
                    value={item.quantity}
                    onChange={(e) => handleQuantityChange(item.product._id, e.target.value)}
                    style={{ width: "50px", padding: "5px" }}
                  />
                  <span>{item.product.unit}</span>
                </div>

                {/* Item Total */}
                <div style={{ minWidth: "100px", textAlign: "right" }}>
                  <p style={{ margin: "0", fontWeight: "bold" }}>৳{item.itemTotal}</p>
                </div>

                {/* Remove Button */}
                <button
                  onClick={() => handleRemove(item.product._id)}
                  style={{
                    background: "#e74c3c",
                    color: "white",
                    border: "none",
                    padding: "6px 12px",
                    borderRadius: "5px",
                    cursor: "pointer",
                  }}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>

          {/* Cart Summary */}
          <div
            style={{
              border: "2px solid #27ae60",
              borderRadius: "10px",
              padding: "20px",
              marginTop: "20px",
              background: "#f8fff8",
            }}
          >
            <h3 style={{ marginTop: 0 }}>Cart Summary</h3>
            <p><strong>Total Items:</strong> {cart.summary.totalItems}</p>
            <p style={{ fontSize: "20px" }}>
              <strong>Total Price:</strong> ৳{cart.summary.totalPrice}
            </p>

            <div style={{ display: "flex", gap: "10px", marginTop: "15px" }}>
              <Link to="/products/browse">
                <button style={{ background: "#95a5a6" }}>Continue Shopping</button>
              </Link>

              <button
                onClick={() => navigate("/checkout")}
                style={{
                  background: "#27ae60",
                  color: "white",
                  padding: "10px 30px",
                  fontSize: "16px",
                }}
              >
                Proceed to Checkout →
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default CartPage;