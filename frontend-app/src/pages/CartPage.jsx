import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getCart, updateCartQuantity, removeFromCart } from "../api/cartApi";
import { useCart } from "../context/CartContext";

function Cart() {
  const [cart, setCart] = useState({ items: [], summary: { totalItems: 0, totalPrice: 0 } });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const debounceTimers = useRef({});

  const navigate = useNavigate();
  const { refreshCart } = useCart();

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
    // Cleanup: cancel any pending API calls if the user leaves the page
    return () => {
      Object.values(debounceTimers.current).forEach(clearTimeout);
    };
  }, []);

  const handleQuantityChange = async (productId, newQty) => {
    // 1. Optimistically update the UI immediately
    setCart((prev) => {
      const updatedItems = prev.items.map((item) => {
        if (item.product._id === productId) {
          const itemTotal = item.product.price * newQty;
          return {
            ...item,
            quantity: newQty,
            itemTotal: parseFloat(itemTotal.toFixed(2)),
          };
        }
        return item;
      });
      const totalItems = updatedItems.reduce((sum, item) => sum + item.quantity, 0);
      const totalPrice = updatedItems.reduce((sum, item) => sum + item.itemTotal, 0);
      return {
        items: updatedItems,
        summary: {
          totalItems,
          totalPrice: parseFloat(totalPrice.toFixed(2)),
        },
      };
    });

    // 2. Debounce the API call: wait 500ms after the user stops clicking/typing
    if (debounceTimers.current[productId]) {
      clearTimeout(debounceTimers.current[productId]);
    }
    debounceTimers.current[productId] = setTimeout(async () => {
      try {
        await updateCartQuantity(productId, newQty);
      } catch (err) {
        setError(err.message);
        loadCart(); // Revert to server truth on error
      }
    }, 500);
  };

  const handleRemove = async (productId) => {
    // Optimistically remove from UI immediately
    const removedItem = cart.items.find((i) => i.product._id === productId);
    setCart((prev) => ({
      ...prev,
      items: prev.items.filter((item) => item.product._id !== productId),
      summary: {
        totalItems: prev.summary.totalItems - (removedItem?.quantity || 0),
        totalPrice: parseFloat((prev.summary.totalPrice - (removedItem?.itemTotal || 0)).toFixed(2)),
      },
    }));

    try {
      await removeFromCart(productId);
      refreshCart(); // Update the navbar badge count
    } catch (err) {
      setError(err.message);
      loadCart(); // Revert on error
    }
  };

  // Shared input style — matches Browse Products exactly
  const inputStyle = {
    width: "60px",
    padding: "8px 10px",
    fontSize: "15px",
    border: "2px solid #bdbdbd",
    borderRadius: "8px",
    backgroundColor: "#ffffff",
    color: "#333333",
    textAlign: "center",
    boxSizing: "border-box",
    outline: "none",
  };

  if (loading) {
    return (
      <div className="page-container">
        <p style={{ textAlign: "center", padding: "40px", color: "#666" }}>Loading cart...</p>
      </div>
    );
  }

  return (
    <div className="page-container">
      <h2 style={{ marginBottom: "24px", fontSize: "28px", color: "#1B5E20" }}>
        Shopping Cart
      </h2>

      {error && (
        <p style={{ color: "#C62828", textAlign: "center", padding: "16px", marginBottom: "16px" }}>
          {error}
        </p>
      )}

      {cart.items.length === 0 ? (
        <div
          style={{
            backgroundColor: "#ffffff",
            borderRadius: "16px",
            padding: "50px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
            border: "1px solid #e0e0e0",
            textAlign: "center",
          }}
        >
          <p style={{ fontSize: "18px", color: "#666", marginBottom: "20px" }}>
            Your cart is empty.
          </p>
          <Link to="/products/browse">
            <button
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
              Browse Products
            </button>
          </Link>
        </div>
      ) : (
        <>
          {/* Cart Items */}
          <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginBottom: "24px" }}>
            {cart.items.map((item) => (
              <div
                key={item.product._id}
                style={{
                  backgroundColor: "#ffffff",
                  borderRadius: "16px",
                  padding: "20px",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                  border: "1px solid #e0e0e0",
                  display: "flex",
                  alignItems: "center",
                  gap: "20px",
                  flexWrap: "wrap",
                }}
              >
                {/* Product Image */}
                {item.product.images && item.product.images.length > 0 ? (
                  <img
                    src={`http://localhost:5000${item.product.images[0]}`}
                    alt={item.product.name}
                    loading="lazy"
                    style={{
                      width: "80px",
                      height: "80px",
                      objectFit: "cover",
                      borderRadius: "10px",
                      border: "1px solid #e0e0e0",
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: "80px",
                      height: "80px",
                      borderRadius: "10px",
                      background: "#f5f5f5",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#999",
                      fontSize: "12px",
                    }}
                  >
                    No Image
                  </div>
                )}

                {/* Product Info */}
                <div style={{ flex: "1", minWidth: "180px" }}>
                  <h3 style={{ margin: "0 0 6px", fontSize: "17px", color: "#333" }}>
                    {item.product.name}
                  </h3>
                  <p style={{ margin: "0 0 4px", fontSize: "14px", color: "#666" }}>
                    Farmer: {item.product.farmer?.name}
                  </p>
                  <p style={{ margin: 0, fontSize: "14px", color: "#666" }}>
                    ৳{item.product.price} / {item.product.unit || "piece"}
                  </p>
                </div>

                {/* Quantity */}
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <label
                    style={{
                      fontSize: "14px",
                      fontWeight: "600",
                      color: "#333",
                    }}
                  >
                    Qty:
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={(e) => handleQuantityChange(item.product._id, parseInt(e.target.value) || 1)}
                    style={inputStyle}
                  />
                </div>

                {/* Item Total */}
                <div style={{ minWidth: "80px", textAlign: "right" }}>
                  <p style={{ margin: 0, fontSize: "16px", fontWeight: "700", color: "#1B5E20" }}>
                    ৳{item.itemTotal}
                  </p>
                </div>

                {/* Remove Button */}
                <button
                  onClick={() => handleRemove(item.product._id)}
                  style={{
                    backgroundColor: "#C62828",
                    color: "#ffffff",
                    border: "none",
                    width: "36px",
                    height: "36px",
                    borderRadius: "8px",
                    fontSize: "18px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                  title="Remove item"
                >
                  ×
                </button>
              </div>
            ))}
          </div>

          {/* Cart Summary Card */}
          <div
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "16px",
              padding: "24px",
              boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
              border: "1px solid #e0e0e0",
              maxWidth: "400px",
              marginLeft: "auto",
            }}
          >
            <h3 style={{ margin: "0 0 16px", fontSize: "18px", color: "#1B5E20" }}>
              Cart Summary
            </h3>

            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
              <span style={{ color: "#666", fontSize: "15px" }}>Total Items:</span>
              <span style={{ fontWeight: "600", color: "#333" }}>{cart.summary.totalItems}</span>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "20px" }}>
              <span style={{ color: "#666", fontSize: "15px" }}>Total Price:</span>
              <span style={{ fontWeight: "700", fontSize: "18px", color: "#1B5E20" }}>
                ৳{cart.summary.totalPrice}
              </span>
            </div>

            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
              <Link to="/products/browse" style={{ textDecoration: "none" }}>
                <button
                  style={{
                    backgroundColor: "#ffffff",
                    color: "#2E7D32",
                    border: "2px solid #2E7D32",
                    padding: "12px 20px",
                    borderRadius: "10px",
                    fontSize: "15px",
                    fontWeight: "600",
                    cursor: "pointer",
                  }}
                >
                  Continue Shopping
                </button>
              </Link>

              <button
                onClick={() => navigate("/checkout")}
                style={{
                  backgroundColor: "#2E7D32",
                  color: "#ffffff",
                  border: "none",
                  padding: "12px 24px",
                  borderRadius: "10px",
                  fontSize: "15px",
                  fontWeight: "600",
                  cursor: "pointer",
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

export default Cart;