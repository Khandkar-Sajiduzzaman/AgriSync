import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getCart } from "../api/cartApi";
import { placeOrder } from "../api/orderApi";
import { useCart } from "../context/CartContext";

function CheckoutPage() {
  const [cart, setCart] = useState({ items: [], summary: { totalItems: 0, totalPrice: 0 } });
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [deliveryType, setDeliveryType] = useState("normal");
  const [deliveryNotes, setDeliveryNotes] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash_on_delivery");
  const [loading, setLoading] = useState(true);
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(null);
  const navigate = useNavigate();
  
  // BUG FIX: Destructure BOTH clearCart and refreshCart from context
  const { clearCart, refreshCart } = useCart();

  const user = JSON.parse(localStorage.getItem("user") || "{}");

  useEffect(() => {
    loadCart();
    if (user.address) setDeliveryAddress(user.address);
  }, []);

  const loadCart = async () => {
    try {
      const data = await getCart();
      setCart(data);
      if (data.items.length === 0) {
        setError("Your cart is empty. Add items before checkout.");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePlaceOrder = async () => {
    if (!deliveryAddress.trim()) {
      setError("Please enter a delivery address");
      return;
    }
    setPlacing(true);
    setError("");
    console.log('Checkout: Placing order...');
    
    // Extract city and area from address for delivery grouping
    // Simple heuristic: last comma-separated part = city, second-last = area
    const addressParts = deliveryAddress.split(',').map(s => s.trim());
    const deliveryCity = addressParts[addressParts.length - 1] || addressParts[0] || '';
    const deliveryArea = addressParts.length > 1 ? addressParts[addressParts.length - 2] : '';
    
    try {
      const data = await placeOrder({
        deliveryAddress,
        deliveryNotes,
        paymentMethod,
        deliveryFee,        // Send calculated delivery fee to backend
        discountAmount: 0,
        // NEW: let customer choose delivery type
        deliveryType,
        deliveryCity,
        deliveryArea,
      });
      console.log('Checkout: Order placed successfully!', data);
      setSuccess(data);
      refreshCart();
    } catch (err) {
      console.error('Checkout: Error placing order:', err.message);
      setError(err.message);
    } finally {
      console.log('Checkout: Setting placing to false');
      setPlacing(false);
    }
  };

   // Calculate totals — delivery fee depends on type chosen by customer
  // normal = ৳60 (standard, may be batched with other orders)
  // instant = ৳150 (priority, dedicated delivery man)
  const deliveryFee = deliveryType === "instant" ? 150 : 60;
  const discount = 0;
  const grandTotal = cart.summary.totalPrice + deliveryFee - discount;

  if (loading) return <p style={{ textAlign: "center", marginTop: "40px" }}>Loading...</p>;

  // SUCCESS STATE
  if (success) {
    return (
      <div style={{ maxWidth: "500px", margin: "60px auto", textAlign: "center", padding: "0 20px" }}>
        <div style={{ fontSize: "60px", marginBottom: "10px" }}>✅</div>
        <h1 style={{ color: "#27ae60", margin: "0 0 10px 0" }}>Order Placed!</h1>
        <p style={{ color: "#666", marginBottom: "25px" }}>Thank you for shopping with AgriSync.</p>

        {success.orders?.map((order) => (
          <div
            key={order._id}
            style={{
              border: "2px dashed #27ae60",
              borderRadius: "12px",
              padding: "20px",
              margin: "15px 0",
              background: "#f8fff8",
              textAlign: "left",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
              <span style={{ color: "#666", fontSize: "13px" }}>Order #</span>
              <span style={{ fontWeight: "bold", fontSize: "14px" }}>{order.orderNumber}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
              <span style={{ color: "#666", fontSize: "13px" }}>Farmer</span>
              <span style={{ fontWeight: "500" }}>{order.farmer?.name}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "#666", fontSize: "13px" }}>Total</span>
              <span style={{ fontWeight: "bold", color: "#27ae60" }}>৳{order.totalAmount}</span>
            </div>
          </div>
        ))}

        <div style={{ marginTop: "30px", display: "flex", gap: "10px", justifyContent: "center" }}>
          <button
            onClick={() => navigate("/orders")}
            style={{
              padding: "12px 24px",
              background: "#2e7d32",
              color: "white",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: "600",
            }}
          >
            View My Orders
          </button>
          <button
            onClick={() => navigate("/products/browse")}
            style={{
              padding: "12px 24px",
              background: "#f5f5f5",
              color: "#555",
              border: "1px solid #ddd",
              borderRadius: "8px",
              cursor: "pointer",
              fontSize: "14px",
            }}
          >
            Continue Shopping
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: "700px", margin: "30px auto", padding: "0 20px" }}>
      <h1 style={{ margin: "0 0 5px 0", fontSize: "28px" }}>Checkout</h1>
      <p style={{ color: "#888", margin: "0 0 25px 0", fontSize: "14px" }}>Review your order and enter delivery details</p>

      {error && (
        <div style={{
          background: "#ffebee",
          color: "#c62828",
          padding: "12px 16px",
          borderRadius: "8px",
          marginBottom: "20px",
          fontSize: "14px",
          border: "1px solid #ef9a9a",
        }}>
          {error}
        </div>
      )}

      {/* RECEIPT SECTION */}
      <div style={{
        background: "#fff",
        border: "1px solid #ddd",
        borderRadius: "12px",
        overflow: "hidden",
        marginBottom: "25px",
        boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
      }}>
        {/* Receipt Header */}
        <div style={{
          background: "#2e7d32",
          color: "white",
          padding: "20px 25px",
          textAlign: "center",
        }}>
          <div style={{ fontSize: "32px", marginBottom: "5px" }}>🧾</div>
          <h2 style={{ margin: "0", fontSize: "20px", fontWeight: "700" }}>Order Receipt</h2>
          <p style={{ margin: "5px 0 0 0", fontSize: "13px", opacity: 0.9 }}>
            {new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </p>
        </div>

        {/* Receipt Body */}
        <div style={{ padding: "25px" }}>
          {/* Items */}
          <div style={{ marginBottom: "15px" }}>
            {cart.items.map((item, index) => (
              <div
                key={item.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  padding: "10px 0",
                  borderBottom: index < cart.items.length - 1 ? "1px solid #f0f0f0" : "none",
                }}
              >
                <div style={{ flex: 1 }}>
                  <p style={{ margin: "0", fontWeight: "600", fontSize: "15px", color: "#333" }}>
                    {item.product.name}
                  </p>
                  <p style={{ margin: "3px 0 0 0", fontSize: "13px", color: "#888" }}>
                    ৳{item.product.price} × {item.quantity} {item.product.unit}
                  </p>
                </div>
                <p style={{ margin: "0", fontWeight: "600", fontSize: "15px", color: "#333", minWidth: "80px", textAlign: "right" }}>
                  ৳{item.itemTotal}
                </p>
              </div>
            ))}
          </div>

          {/* Dashed divider */}
          <div style={{
            borderTop: "2px dashed #ddd",
            margin: "15px 0",
          }} />

          {/* Totals */}
          <div style={{ padding: "0 5px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
              <span style={{ color: "#666", fontSize: "14px" }}>Subtotal ({cart.summary.totalItems} items)</span>
              <span style={{ fontSize: "14px", color: "#333" }}>৳{cart.summary.totalPrice}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
              <span style={{ color: "#666", fontSize: "14px" }}>Delivery Fee ({deliveryType === "instant" ? "Express" : "Normal"})</span>
              <span style={{ fontSize: "14px", color: "#333" }}>৳{deliveryFee}</span>
            </div>
            {discount > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                <span style={{ color: "#27ae60", fontSize: "14px" }}>Discount</span>
                <span style={{ fontSize: "14px", color: "#27ae60" }}>-৳{discount}</span>
              </div>
            )}
          </div>

          {/* Final total */}
          <div style={{
            borderTop: "2px solid #2e7d32",
            marginTop: "15px",
            paddingTop: "15px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}>
            <span style={{ fontSize: "18px", fontWeight: "700", color: "#2e7d32" }}>Total Amount</span>
            <span style={{ fontSize: "24px", fontWeight: "800", color: "#2e7d32" }}>৳{grandTotal}</span>
          </div>
        </div>

        {/* Receipt Footer */}
        <div style={{
          background: "#f8f9fa",
          padding: "12px 25px",
          textAlign: "center",
          borderTop: "1px solid #eee",
        }}>
          <p style={{ margin: "0", fontSize: "12px", color: "#999" }}>
            Thank you for supporting local farmers! 🌾
          </p>
        </div>
      </div>

      {/* DELIVERY FORM */}
      <div style={{
        background: "#fff",
        border: "1px solid #ddd",
        borderRadius: "12px",
        padding: "25px",
        boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
      }}>
        <h3 style={{ margin: "0 0 20px 0", fontSize: "18px", color: "#333" }}>Delivery Details</h3>

        <div style={{ marginBottom: "18px" }}>
          <label style={{ display: "block", marginBottom: "6px", fontWeight: "600", fontSize: "14px", color: "#333" }}>
            Delivery Address <span style={{ color: "#e74c3c" }}>*</span>
          </label>
          <textarea
            value={deliveryAddress}
            onChange={(e) => setDeliveryAddress(e.target.value)}
            placeholder="Enter your full delivery address (street, area, district)..."
            rows={3}
            style={{
              width: "100%",
              padding: "12px 14px",
              borderRadius: "8px",
              border: "1px solid #ccc",
              fontSize: "14px",
              fontFamily: "inherit",
              resize: "vertical",
              outline: "none",
              boxSizing: "border-box",
            }}
          />
        </div>

        <div style={{ marginBottom: "18px" }}>
          <label style={{ display: "block", marginBottom: "6px", fontWeight: "600", fontSize: "14px", color: "#333" }}>
            Delivery Notes <span style={{ color: "#888", fontWeight: "400" }}>(optional)</span>
          </label>
          <input
            type="text"
            value={deliveryNotes}
            onChange={(e) => setDeliveryNotes(e.target.value)}
            placeholder="e.g., Call before delivery, Leave at gate"
            style={{
              width: "100%",
              padding: "12px 14px",
              borderRadius: "8px",
              border: "1px solid #ccc",
              fontSize: "14px",
              fontFamily: "inherit",
              outline: "none",
              boxSizing: "border-box",
            }}
          />
        </div>

        <div style={{ marginBottom: "25px" }}>
          <label style={{ display: "block", marginBottom: "6px", fontWeight: "600", fontSize: "14px", color: "#333" }}>
            Payment Method
          </label>
          <select
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
            style={{
              width: "100%",
              padding: "12px 14px",
              borderRadius: "8px",
              border: "1px solid #ccc",
              fontSize: "14px",
              background: "#fff",
              outline: "none",
              cursor: "pointer",
              boxSizing: "border-box",
            }}
          >
            <option value="cash_on_delivery">💵 Cash on Delivery</option>
            <option value="online_transfer">🏦 Online Bank Transfer</option>
            <option value="mobile_banking">📱 Mobile Banking (bKash/Nagad)</option>
            <option value="card">💳 Credit/Debit Card</option>
          </select>
        </div>
        {/* NEW: Delivery Type Selection */}
        <div style={{ marginBottom: "25px" }}>
          <label style={{ display: "block", marginBottom: "6px", fontWeight: "600", fontSize: "14px", color: "#333" }}>
            Delivery Type
          </label>
          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={() => setDeliveryType("normal")}
              style={{
                flex: 1,
                minWidth: "140px",
                padding: "14px",
                background: deliveryType === "normal" ? "#e8f5e9" : "#fff",
                color: deliveryType === "normal" ? "#2e7d32" : "#555",
                border: `2px solid ${deliveryType === "normal" ? "#2e7d32" : "#ddd"}`,
                borderRadius: "10px",
                cursor: "pointer",
                fontSize: "14px",
                fontWeight: deliveryType === "normal" ? "700" : "500",
                textAlign: "left",
              }}
            >
              <div style={{ fontSize: "16px", marginBottom: "4px" }}>🚚</div>
              <div>Normal Delivery</div>
              <div style={{ fontSize: "12px", color: deliveryType === "normal" ? "#1b5e20" : "#888", marginTop: "4px" }}>
                ৳60 — Standard delivery, may be batched
              </div>
            </button>
            <button
              type="button"
              onClick={() => setDeliveryType("instant")}
              style={{
                flex: 1,
                minWidth: "140px",
                padding: "14px",
                background: deliveryType === "instant" ? "#fff3e0" : "#fff",
                color: deliveryType === "instant" ? "#e65100" : "#555",
                border: `2px solid ${deliveryType === "instant" ? "#f57c00" : "#ddd"}`,
                borderRadius: "10px",
                cursor: "pointer",
                fontSize: "14px",
                fontWeight: deliveryType === "instant" ? "700" : "500",
                textAlign: "left",
              }}
            >
              <div style={{ fontSize: "16px", marginBottom: "4px" }}>⚡</div>
              <div>Express Delivery</div>
              <div style={{ fontSize: "12px", color: deliveryType === "instant" ? "#bf360c" : "#888", marginTop: "4px" }}>
                ৳150 — Priority, dedicated delivery man
              </div>
            </button>
          </div>
        </div>
        <div style={{ display: "flex", gap: "12px" }}>
          <button
            onClick={() => navigate("/cart")}
            style={{
              padding: "14px 24px",
              background: "#f5f5f5",
              color: "#555",
              border: "1px solid #ddd",
              borderRadius: "8px",
              cursor: "pointer",
              fontSize: "15px",
              fontWeight: "600",
            }}
          >
            ← Back to Cart
          </button>
          <button
            onClick={handlePlaceOrder}
            disabled={placing || cart.items.length === 0}
            style={{
              flex: 1,
              padding: "14px 24px",
              background: cart.items.length === 0 ? "#ccc" : "#27ae60",
              color: "white",
              border: "none",
              borderRadius: "8px",
              cursor: cart.items.length === 0 ? "not-allowed" : "pointer",
              fontSize: "16px",
              fontWeight: "700",
              boxShadow: "0 2px 8px rgba(39,174,96,0.3)",
            }}
          >
            {placing ? "Placing Order..." : "Place Order →"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default CheckoutPage;