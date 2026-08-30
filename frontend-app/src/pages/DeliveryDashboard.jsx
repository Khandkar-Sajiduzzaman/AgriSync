import { useEffect, useState, useCallback, lazy, Suspense } from "react";
import { Link } from "react-router-dom";
import { getMyOrders, updateOrderStatus } from "../api/orderApi";
import { getDeliveryRequests, respondToDeliveryRequest, getMyActiveDeliveries, toggleAvailability } from "../api/deliveryApi";

const LiveMap = lazy(() => import("../components/delivery/LiveMap"));

function DeliveryDashboard() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [locationEnabled, setLocationEnabled] = useState(() => {
    return localStorage.getItem("locationSharingEnabled") === "true";
  });
  const [updatingId, setUpdatingId] = useState(null);

  // NEW: delivery requests state
  const [deliveryRequests, setDeliveryRequests] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [respondingId, setRespondingId] = useState(null);

  const loadOrders = async () => {
    setLoading(true);
    try {
      // Use getMyActiveDeliveries for better organization, fallback to getMyOrders
      const result = await getMyOrders();
      setOrders(result.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // NEW: load pending delivery requests
  const loadDeliveryRequests = async () => {
    setLoadingRequests(true);
    try {
      const data = await getDeliveryRequests("pending");
      setDeliveryRequests(data || []);
    } catch (err) {
      console.log("Failed to load delivery requests:", err.message);
      setDeliveryRequests([]);
    } finally {
      setLoadingRequests(false);
    }
  };

  useEffect(() => {
    loadOrders();
    loadDeliveryRequests();
  }, []);



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

  // NEW: handle accept/reject delivery request
  const handleRespondToRequest = async (requestId, response) => {
    setRespondingId(requestId);
    setError("");
    try {
      await respondToDeliveryRequest(requestId, response);
      // Refresh both requests and orders
      await loadDeliveryRequests();
      await loadOrders();
    } catch (err) {
      setError(err.message || `Failed to ${response} request`);
    } finally {
      setRespondingId(null);
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
            Manage your delivery requests and active deliveries
          </p>
        </div>
        <button
          onClick={async () => {
            const newState = !locationEnabled;
            setLocationEnabled(newState);
            localStorage.setItem("locationSharingEnabled", newState.toString());
            try {
              await toggleAvailability(newState);
            } catch (err) {
              console.log("Failed to toggle availability:", err.message);
            }
          }}
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
          {locationEnabled ? "📡 Location Sharing ON • Available" : "📡 Location Sharing OFF • Offline"}
        </button>
      </div>

      {error && (
        <div style={{ background: "#fef2f2", border: "1px solid #fecaca", color: "#dc2626", padding: "12px 16px", borderRadius: "8px", marginBottom: "20px", fontSize: "14px" }}>
          {error}
        </div>
      )}

      {/* NEW: Delivery Requests Section */}
      <h2 style={{ fontSize: "18px", fontWeight: "600", color: "#374151", margin: "0 0 16px 0" }}>
        📬 Delivery Requests ({deliveryRequests.length})
      </h2>

      {loadingRequests ? (
        <div style={{ textAlign: "center", padding: "24px", background: "#f9fafb", borderRadius: "12px", marginBottom: "32px" }}>
          <div style={{ width: "28px", height: "28px", border: "3px solid #e5e7eb", borderTop: "3px solid #2e7d32", borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto" }} />
          <p style={{ color: "#6b7280", marginTop: "12px", fontSize: "14px" }}>Loading requests...</p>
        </div>
      ) : deliveryRequests.length === 0 ? (
        <div style={{ textAlign: "center", padding: "24px", background: "#f9fafb", borderRadius: "12px", marginBottom: "32px" }}>
          <p style={{ color: "#6b7280", margin: "0", fontSize: "14px" }}>No pending delivery requests right now.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginBottom: "32px" }}>
          {deliveryRequests.map((req) => (
            <div
              key={req._id}
              style={{
                background: "#ffffff",
                borderRadius: "12px",
                border: "1px solid #e5e7eb",
                padding: "20px 24px",
                boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px", marginBottom: "12px" }}>
                <div>
                  <span style={{ fontSize: "15px", fontWeight: "600", color: "#111827" }}>
                    {req.order?.orderNumber}
                  </span>
                  <span
                    style={{
                      marginLeft: "10px",
                      padding: "4px 12px",
                      borderRadius: "999px",
                      fontSize: "12px",
                      fontWeight: "600",
                      background: req.requestType === "instant" ? "#fff7ed" : "#eff6ff",
                      color: req.requestType === "instant" ? "#c2410c" : "#1d4ed8",
                    }}
                  >
                    {req.requestType === "instant" ? "⚡ Instant" : "🚚 Normal"}
                  </span>
                </div>
                <span style={{ fontSize: "18px", fontWeight: "700", color: "#111827" }}>
                  ৳{req.order?.totalAmount}
                </span>
              </div>

              <div style={{ marginBottom: "16px" }}>
                <p style={{ margin: "0 0 4px 0", fontSize: "13px", color: "#6b7280" }}>
                  <strong>Farmer:</strong> {req.order?.farmer?.name} • {req.order?.farmer?.phone}
                </p>
                <p style={{ margin: "0 0 4px 0", fontSize: "13px", color: "#6b7280" }}>
                  <strong>Buyer:</strong> {req.order?.buyer?.name} • {req.order?.buyer?.address}
                </p>
                <p style={{ margin: "0", fontSize: "13px", color: "#6b7280" }}>
                  <strong>Delivery:</strong> {req.order?.deliveryArea}, {req.order?.deliveryCity}
                </p>
                {req.message && (
                  <p style={{ margin: "8px 0 0 0", fontSize: "13px", color: "#92400e", fontStyle: "italic", background: "#fffbeb", padding: "8px", borderRadius: "6px" }}>
                    "{req.message}"
                  </p>
                )}
              </div>

              <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                <button
                  onClick={() => handleRespondToRequest(req._id, "accepted")}
                  disabled={respondingId === req._id}
                  style={{
                    padding: "8px 18px",
                    background: "#2e7d32",
                    color: "white",
                    border: "none",
                    borderRadius: "8px",
                    cursor: "pointer",
                    fontSize: "13px",
                    fontWeight: "600",
                  }}
                >
                  {respondingId === req._id ? "Processing..." : "✓ Accept"}
                </button>
                <button
                  onClick={() => handleRespondToRequest(req._id, "rejected")}
                  disabled={respondingId === req._id}
                  style={{
                    padding: "8px 18px",
                    background: "#fef2f2",
                    color: "#dc2626",
                    border: "1px solid #fecaca",
                    borderRadius: "8px",
                    cursor: "pointer",
                    fontSize: "13px",
                    fontWeight: "600",
                  }}
                >
                  {respondingId === req._id ? "Processing..." : "✕ Decline"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Active Deliveries */}
      <h2 style={{ fontSize: "18px", fontWeight: "600", color: "#374151", margin: "0 0 16px 0" }}>
        🛵 Active Deliveries ({activeOrders.length})
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

                {locationEnabled && order.status === "out_for_delivery" && (
                  <div style={{ marginBottom: "16px", borderRadius: "12px", overflow: "hidden", border: "1px solid #e5e7eb" }}>
                    <Suspense fallback={<div style={{ height: "200px", display: "flex", alignItems: "center", justifyContent: "center" }}>Loading map...</div>}>
                      <LiveMap
                        deliveryPosition={null}
                        buyerPosition={null}
                      />
                    </Suspense>
                  </div>
                )}

               <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                  <Link
                    to={`/orders/${order._id}`}
                    style={{
                      padding: "8px 16px",
                      background: "#ffffff",
                      color: "#374151",
                      border: "1px solid #d1d5db",
                      borderRadius: "8px",
                      cursor: "pointer",
                      fontSize: "13px",
                      textDecoration: "none",
                      display: "inline-block",
                    }}
                  >
                    View Details
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