import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { getMyOrders, updateOrderStatus } from "../api/orderApi";
import { updateDeliveryLocation } from "../api/orderApi";

function DeliveryDashboard() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [locationEnabled, setLocationEnabled] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);

const loadOrders = async () => {
  setLoading(true);
  try {
    const result = await getMyOrders();
    setOrders(result.data || []); // Extract array from paginated response
  } catch (err) {
    setError(err.message);
  } finally {
    setLoading(false);
  }
};

  useEffect(() => {
    loadOrders();
  }, []);

  // Send GPS location every 10 seconds while on this page
  useEffect(() => {
    if (!locationEnabled) return;

    let watchId;
    let intervalId;

    const sendLocation = async (position) => {
      try {
        await updateDeliveryLocation(position.coords.latitude, position.coords.longitude);
      } catch (err) {
        console.log("Location update failed:", err.message);
      }
    };

    if (navigator.geolocation) {
      // Get initial position
      navigator.geolocation.getCurrentPosition(sendLocation, (err) => {
        console.log("Geolocation error:", err.message);
      });

      // Then watch for changes and send every 10s
      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          // Throttle: only send if 10s passed since last send
        },
        (err) => console.log("Watch error:", err.message),
        { enableHighAccuracy: true, maximumAge: 10000 }
      );

      // Use interval for reliable 10-second updates
      intervalId = setInterval(() => {
        navigator.geolocation.getCurrentPosition(sendLocation, (err) => {
          console.log("Interval geolocation error:", err.message);
        });
      }, 10000);
    }

    return () => {
      if (watchId) navigator.geolocation.clearWatch(watchId);
      if (intervalId) clearInterval(intervalId);
    };
  }, [locationEnabled]);

  const handleStatusUpdate = async (orderId, newStatus, notes = "") => {
    setUpdatingId(orderId);
    try {
      await updateOrderStatus(orderId, { status: newStatus, notes });
      await loadOrders();
    } catch (err) {
      setError(err.message);
    } finally {
      setUpdatingId(null);
    }
  };

  const statusConfig = {
    shipped: { color: "#06b6d4", bg: "#ecfeff", label: "Ready for Pickup" },
    out_for_delivery: { color: "#f97316", bg: "#fff7ed", label: "Out for Delivery" },
    delivered: { color: "#10b981", bg: "#ecfdf5", label: "Delivered" },
  };

  const activeOrders = orders.filter((o) => o.status === "shipped" || o.status === "out_for_delivery");
  const completedOrders = orders.filter((o) => o.status === "delivered");

  return (
    <div style={{ maxWidth: "1000px", margin: "0 auto", padding: "32px 20px" }}>
      <div style={{ marginBottom: "32px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <h1 style={{ fontSize: "28px", fontWeight: "700", color: "#111827", margin: "0 0 6px 0" }}>
            Delivery Dashboard
          </h1>
          <p style={{ color: "#6b7280", fontSize: "15px", margin: "0" }}>
            Manage your deliveries and update your location
          </p>
        </div>
        <button
          onClick={() => setLocationEnabled(!locationEnabled)}
          style={{
            padding: "10px 20px",
            background: locationEnabled ? "#dcfce7" : "#fef2f2",
            color: locationEnabled ? "#166534" : "#991b1b",
            border: `1px solid ${locationEnabled ? "#86efac" : "#fecaca"}`,
            borderRadius: "8px",
            cursor: "pointer",
            fontSize: "14px",
            fontWeight: "600",
          }}
        >
          {locationEnabled ? "📡 Location Sharing ON" : "📡 Location Sharing OFF"}
        </button>
      </div>

      {error && (
        <div style={{ background: "#fef2f2", border: "1px solid #fecaca", color: "#dc2626", padding: "12px 16px", borderRadius: "8px", marginBottom: "20px", fontSize: "14px" }}>
          {error}
        </div>
      )}

      {/* Active Deliveries */}
      <h2 style={{ fontSize: "18px", fontWeight: "600", color: "#374151", margin: "0 0 16px 0" }}>
        Active Deliveries ({activeOrders.length})
      </h2>

      {activeOrders.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px 20px", background: "#f9fafb", borderRadius: "12px", marginBottom: "32px" }}>
          <p style={{ color: "#6b7280", margin: "0" }}>No active deliveries right now.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginBottom: "32px" }}>
          {activeOrders.map((order) => {
            const status = statusConfig[order.status];
            return (
              <div
                key={order._id}
                style={{
                  background: "#ffffff",
                  borderRadius: "12px",
                  border: "1px solid #e5e7eb",
                  padding: "20px 24px",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px", marginBottom: "16px" }}>
                  <div>
                    <span style={{ fontSize: "15px", fontWeight: "600", color: "#111827" }}>{order.orderNumber}</span>
                    <span
                      style={{
                        marginLeft: "10px",
                        padding: "4px 12px",
                        borderRadius: "999px",
                        fontSize: "12px",
                        fontWeight: "600",
                        background: status.bg,
                        color: status.color,
                      }}
                    >
                      {status.label}
                    </span>
                  </div>
                  <span style={{ fontSize: "18px", fontWeight: "700", color: "#111827" }}>৳{order.totalAmount}</span>
                </div>

                <div style={{ marginBottom: "16px" }}>
                  <p style={{ margin: "0 0 4px 0", fontSize: "13px", color: "#6b7280" }}>
                    <strong>Buyer:</strong> {order.buyer?.name} • {order.buyer?.phone}
                  </p>
                  <p style={{ margin: "0", fontSize: "13px", color: "#6b7280" }}>
                    <strong>Address:</strong> {order.deliveryAddress}
                  </p>
                </div>

                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                  <Link to={`/orders/${order._id}`} style={{ textDecoration: "none" }}>
                    <button
                      style={{
                        padding: "8px 16px",
                        background: "#ffffff",
                        color: "#374151",
                        border: "1px solid #d1d5db",
                        borderRadius: "8px",
                        cursor: "pointer",
                        fontSize: "13px",
                      }}
                    >
                      View Details
                    </button>
                  </Link>

                  {order.status === "shipped" && (
                    <button
                      onClick={() => handleStatusUpdate(order._id, "out_for_delivery", "Picked up and out for delivery")}
                      disabled={updatingId === order._id}
                      style={{
                        padding: "8px 16px",
                        background: "#f97316",
                        color: "white",
                        border: "none",
                        borderRadius: "8px",
                        cursor: "pointer",
                        fontSize: "13px",
                        fontWeight: "600",
                      }}
                    >
                      {updatingId === order._id ? "Updating..." : "Start Delivery →"}
                    </button>
                  )}

                  {order.status === "out_for_delivery" && (
                    <button
                      onClick={() => handleStatusUpdate(order._id, "delivered", "Delivered to customer")}
                      disabled={updatingId === order._id}
                      style={{
                        padding: "8px 16px",
                        background: "#10b981",
                        color: "white",
                        border: "none",
                        borderRadius: "8px",
                        cursor: "pointer",
                        fontSize: "13px",
                        fontWeight: "600",
                      }}
                    >
                      {updatingId === order._id ? "Updating..." : "Mark Delivered ✓"}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Completed Deliveries */}
      {completedOrders.length > 0 && (
        <>
          <h2 style={{ fontSize: "18px", fontWeight: "600", color: "#374151", margin: "0 0 16px 0" }}>
            Completed ({completedOrders.length})
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {completedOrders.slice(0, 5).map((order) => (
              <div
                key={order._id}
                style={{
                  background: "#f9fafb",
                  borderRadius: "8px",
                  padding: "12px 16px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span style={{ fontSize: "14px", color: "#374151" }}>{order.orderNumber}</span>
                <span style={{ fontSize: "13px", color: "#10b981", fontWeight: "600" }}>Delivered</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default DeliveryDashboard;