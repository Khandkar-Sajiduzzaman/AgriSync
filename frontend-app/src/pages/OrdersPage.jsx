import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getMyOrders, updateOrderStatus } from "../api/orderApi";
import { findNearbyDeliveryMen, sendDeliveryRequest } from "../api/deliveryApi";

function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingId, setUpdatingId] = useState(null);

  // NEW: state for delivery man selection modal
  const [showDmModal, setShowDmModal] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [nearbyDeliveryMen, setNearbyDeliveryMen] = useState([]);
  const [loadingDm, setLoadingDm] = useState(false);
  const [sendingRequest, setSendingRequest] = useState(false);

  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const role = user.role;

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    setLoading(true);
    try {
      const result = await getMyOrders();
      setOrders(result.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (orderId, newStatus, notes = "") => {
    const previousOrders = orders;
    setOrders((prev) =>
      prev.map((o) => (o._id === orderId ? { ...o, status: newStatus } : o))
    );
    setUpdatingId(orderId);

    try {
      await updateOrderStatus(orderId, { status: newStatus, notes });
    } catch (err) {
      setError(err.message);
      setOrders(previousOrders);
    } finally {
      setUpdatingId(null);
    }
  };

  // NEW: Open delivery man selection modal
  const handleOpenChooseDm = async (orderId) => {
    setSelectedOrderId(orderId);
    setShowDmModal(true);
    setLoadingDm(true);
    setError("");
    try {
      const data = await findNearbyDeliveryMen(orderId, 50); // 50km radius
      setNearbyDeliveryMen(data.deliveryMen || []);
    } catch (err) {
      setError(err.message || "Failed to find delivery men");
      setNearbyDeliveryMen([]);
    } finally {
      setLoadingDm(false);
    }
  };

  // NEW: Send delivery request to selected delivery man
  const handleSendRequest = async (deliveryManId, dmName) => {
    if (!selectedOrderId) return;
    setSendingRequest(true);
    setError("");
    try {
      await sendDeliveryRequest(selectedOrderId, deliveryManId, `Please deliver this order.`);
      // Optimistically update order status to awaiting_delivery
      setOrders((prev) =>
        prev.map((o) =>
          o._id === selectedOrderId ? { ...o, status: "awaiting_delivery" } : o
        )
      );
      setShowDmModal(false);
      setSelectedOrderId(null);
      setNearbyDeliveryMen([]);
    } catch (err) {
      setError(err.message || "Failed to send request");
    } finally {
      setSendingRequest(false);
    }
  };

  const statusConfig = {
    pending: { color: "#f59e0b", bg: "#fffbeb", label: "Pending" },
    confirmed: { color: "#3b82f6", bg: "#eff6ff", label: "Confirmed" },
    processing: { color: "#8b5cf6", bg: "#f5f3ff", label: "Processing" },
    awaiting_delivery: { color: "#f97316", bg: "#fff7ed", label: "Awaiting Delivery" },
    shipped: { color: "#06b6d4", bg: "#ecfeff", label: "Shipped" },
    out_for_delivery: { color: "#f97316", bg: "#fff7ed", label: "Out for Delivery" },
    delivered: { color: "#10b981", bg: "#ecfdf5", label: "Delivered" },
    cancelled: { color: "#ef4444", bg: "#fef2f2", label: "Cancelled" },
    refunded: { color: "#6b7280", bg: "#f9fafb", label: "Refunded" },
  };

  // MODIFIED: farmer action flow now includes "Choose Delivery Man" before Ship
  const getFarmerActions = (currentStatus, order) => {
    const flow = {
      pending: [{ label: "Confirm", status: "confirmed", color: "#3b82f6", type: "status" }],
      confirmed: [{ label: "Process", status: "processing", color: "#8b5cf6", type: "status" }],
      processing: [
        { label: "Choose Delivery Man", action: "choose_dm", color: "#f59e0b", type: "action" },
      ],
      awaiting_delivery: [
        { label: "Ship", status: "shipped", color: "#06b6d4", type: "status" },
      ],
    };
    return flow[currentStatus] || [];
  };

  if (loading) {
    return (
      <div style={{ maxWidth: "1000px", margin: "0 auto", padding: "40px 20px", textAlign: "center" }}>
        <div style={{ width: "40px", height: "40px", border: "3px solid #e5e7eb", borderTop: "3px solid #2e7d32", borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto" }} />
        <p style={{ color: "#6b7280", marginTop: "16px" }}>Loading orders...</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: "1000px", margin: "0 auto", padding: "32px 20px" }}>
      {/* Header */}
      <div style={{ marginBottom: "32px" }}>
        <h1 style={{ fontSize: "28px", fontWeight: "700", color: "#111827", margin: "0 0 6px 0" }}>
          {role === "buyer" ? "My Orders" : "Incoming Orders"}
        </h1>
        <p style={{ color: "#6b7280", fontSize: "15px", margin: "0" }}>
          {role === "buyer" ? "Track and manage your purchases" : "Manage customer orders"}
        </p>
      </div>

      {error && (
        <div style={{ background: "#fef2f2", border: "1px solid #fecaca", color: "#dc2626", padding: "12px 16px", borderRadius: "8px", marginBottom: "20px", fontSize: "14px" }}>
          {error}
        </div>
      )}

      {orders.length === 0 ? (
        <div style={{ textAlign: "center", padding: "80px 20px", background: "#f9fafb", borderRadius: "16px", border: "1px dashed #d1d5db" }}>
          <div style={{ fontSize: "48px", marginBottom: "16px" }}>📦</div>
          <h3 style={{ color: "#374151", margin: "0 0 8px 0" }}>No orders yet</h3>
          <p style={{ color: "#6b7280", margin: "0 0 20px 0" }}>
            {role === "buyer" ? "Start shopping to see your orders here." : "No orders have been placed for your products yet."}
          </p>
          {role === "buyer" && (
            <Link to="/products/browse">
              <button style={{ padding: "10px 24px", background: "#2e7d32", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "14px", fontWeight: "600" }}>
                Browse Products
              </button>
            </Link>
          )}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {orders.map((order) => {
            const status = statusConfig[order.status];
            const otherPerson = role === "buyer" ? order.farmer : order.buyer;

            return (
              <div
                key={order._id}
                style={{
                  background: "#ffffff",
                  borderRadius: "12px",
                  border: "1px solid #e5e7eb",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                  overflow: "hidden",
                  transition: "box-shadow 0.2s",
                }}
              >
                {/* Card Header */}
                <div style={{ padding: "20px 24px", display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px" }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "6px", flexWrap: "wrap" }}>
                      <span style={{ fontSize: "15px", fontWeight: "600", color: "#111827" }}>
                        {order.orderNumber}
                      </span>
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "6px",
                          padding: "4px 12px",
                          borderRadius: "999px",
                          fontSize: "12px",
                          fontWeight: "600",
                          textTransform: "capitalize",
                          background: status.bg,
                          color: status.color,
                        }}
                      >
                        <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: status.color }} />
                        {status.label}
                      </span>
                    </div>
                    <p style={{ margin: "0", fontSize: "13px", color: "#9ca3af" }}>
                      Placed on {new Date(order.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </p>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <p style={{ margin: "0", fontSize: "20px", fontWeight: "700", color: "#111827" }}>
                      ৳{order.totalAmount}
                    </p>
                    <p style={{ margin: "2px 0 0 0", fontSize: "12px", color: "#9ca3af" }}>
                      {order.items?.length || 0} item{order.items?.length !== 1 ? "s" : ""}
                    </p>
                  </div>
                </div>

                {/* Card Body */}
                <div style={{ padding: "0 24px 16px 24px", borderTop: "1px solid #f3f4f6" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "14px 0" }}>
                    <div
                      style={{
                        width: "36px",
                        height: "36px",
                        borderRadius: "50%",
                        background: "#e8f5e9",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "16px",
                      }}
                    >
                      {role === "buyer" ? "👨‍🌾" : "👤"}
                    </div>
                    <div>
                      <p style={{ margin: "0", fontSize: "14px", fontWeight: "600", color: "#374151" }}>
                        {otherPerson?.name}
                      </p>
                      <p style={{ margin: "2px 0 0 0", fontSize: "12px", color: "#9ca3af" }}>
                        {role === "buyer" ? "Farmer" : "Buyer"} • {order.paymentMethod?.replace(/_/g, " ")}
                        {order.deliveryType && (
                          <span style={{ marginLeft: "8px", textTransform: "capitalize" }}>
                            • {order.deliveryType === "instant" ? "⚡ Express" : "🚚 Normal"} Delivery
                          </span>
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Preview Items */}
                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "16px" }}>
                    {order.items?.slice(0, 3).map((item) => (
                      <div
                        key={item.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          padding: "6px 12px",
                          background: "#f9fafb",
                          borderRadius: "8px",
                          fontSize: "13px",
                          color: "#4b5563",
                        }}
                      >
                        {item.product?.images?.[0] && (
                          <img
                            src={`http://localhost:5000${item.product.images[0]}`}
                            alt=""
                            style={{ width: "28px", height: "28px", borderRadius: "4px", objectFit: "cover" }}
                          />
                        )}
                        <span>{item.productName || item.product?.name}</span>
                        <span style={{ color: "#9ca3af" }}>× {item.quantity}</span>
                      </div>
                    ))}
                    {order.items?.length > 3 && (
                      <span style={{ padding: "6px 12px", fontSize: "13px", color: "#6b7280", background: "#f9fafb", borderRadius: "8px" }}>
                        +{order.items.length - 3} more
                      </span>
                    )}
                  </div>

                  {/* Actions */}
                  <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
                    <Link to={`/orders/${order._id}`} style={{ textDecoration: "none" }}>
                      <button
                        style={{
                          padding: "8px 18px",
                          background: "#ffffff",
                          color: "#374151",
                          border: "1px solid #d1d5db",
                          borderRadius: "8px",
                          cursor: "pointer",
                          fontSize: "13px",
                          fontWeight: "500",
                          transition: "all 0.15s",
                        }}
                        onMouseEnter={(e) => { e.target.style.background = "#f9fafb"; e.target.style.borderColor = "#9ca3af"; }}
                        onMouseLeave={(e) => { e.target.style.background = "#ffffff"; e.target.style.borderColor = "#d1d5db"; }}
                      >
                        View Details
                      </button>
                    </Link>

                    {/* Buyer Cancel */}
                    {role === "buyer" && order.status === "pending" && (
                      <button
                        onClick={() => handleStatusUpdate(order._id, "cancelled", "Cancelled by buyer")}
                        disabled={updatingId === order._id}
                        style={{
                          padding: "8px 18px",
                          background: "#fef2f2",
                          color: "#dc2626",
                          border: "1px solid #fecaca",
                          borderRadius: "8px",
                          cursor: "pointer",
                          fontSize: "13px",
                          fontWeight: "500",
                        }}
                      >
                        {updatingId === order._id ? "Cancelling..." : "Cancel Order"}
                      </button>
                    )}

                    {/* Farmer Actions */}
                    {role === "farmer" &&
                      getFarmerActions(order.status, order).map((action) => (
                        <button
                          key={action.status || action.action}
                          onClick={() => {
                            if (action.type === "action" && action.action === "choose_dm") {
                              handleOpenChooseDm(order._id);
                            } else {
                              handleStatusUpdate(order._id, action.status, `${action.label} by farmer`);
                            }
                          }}
                          disabled={updatingId === order._id || sendingRequest}
                          style={{
                            padding: "8px 18px",
                            background: action.color,
                            color: "white",
                            border: "none",
                            borderRadius: "8px",
                            cursor: "pointer",
                            fontSize: "13px",
                            fontWeight: "600",
                            boxShadow: `0 2px 6px ${action.color}40`,
                          }}
                        >
                          {updatingId === order._id || sendingRequest ? "Updating..." : action.label}
                        </button>
                      ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* NEW: Delivery Man Selection Modal */}
      {showDmModal && (
        <div style={{
          position: "fixed",
          top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(0,0,0,0.5)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000,
          padding: "20px",
        }}>
          <div style={{
            background: "#fff",
            borderRadius: "16px",
            maxWidth: "500px",
            width: "100%",
            maxHeight: "80vh",
            overflow: "auto",
            padding: "24px",
          }}>
            <h3 style={{ margin: "0 0 16px 0", fontSize: "18px", fontWeight: "700", color: "#111827" }}>
              Choose a Delivery Partner
            </h3>
            <p style={{ margin: "0 0 16px 0", fontSize: "14px", color: "#6b7280" }}>
              Select an available delivery man to send a delivery request.
            </p>

            {loadingDm ? (
              <div style={{ textAlign: "center", padding: "40px" }}>
                <div style={{ width: "32px", height: "32px", border: "3px solid #e5e7eb", borderTop: "3px solid #2e7d32", borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto" }} />
                <p style={{ color: "#6b7280", marginTop: "12px", fontSize: "14px" }}>Finding nearby delivery men...</p>
              </div>
            ) : nearbyDeliveryMen.length === 0 ? (
              <div style={{ textAlign: "center", padding: "32px", background: "#f9fafb", borderRadius: "12px" }}>
                <p style={{ color: "#6b7280", fontSize: "14px" }}>No available delivery men found nearby.</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {nearbyDeliveryMen.map((dm) => (
                  <div
                    key={dm._id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "14px",
                      background: dm.canTake ? "#f0fdf4" : "#f9fafb",
                      border: `1px solid ${dm.canTake ? "#86efac" : "#e5e7eb"}`,
                      borderRadius: "10px",
                      opacity: dm.canTake ? 1 : 0.6,
                    }}
                  >
                    <div>
                      <p style={{ margin: "0", fontSize: "14px", fontWeight: "600", color: "#111827" }}>
                        {dm.name}
                        {dm.areaMatch && <span style={{ marginLeft: "6px", fontSize: "11px", color: "#16a34a", background: "#dcfce7", padding: "2px 6px", borderRadius: "4px" }}>Preferred Area</span>}
                      </p>
                      <p style={{ margin: "4px 0 0 0", fontSize: "12px", color: "#6b7280" }}>
                        {dm.vehicleType || "No vehicle"} • {dm.distanceKm ? `${dm.distanceKm} km away` : "Distance unknown"}
                      </p>
                      <p style={{ margin: "2px 0 0 0", fontSize: "12px", color: dm.canTake ? "#16a34a" : "#dc2626" }}>
                        {dm.reason}
                      </p>
                    </div>
                    <button
                      onClick={() => handleSendRequest(dm._id, dm.name)}
                      disabled={!dm.canTake || sendingRequest}
                      style={{
                        padding: "8px 16px",
                        background: dm.canTake ? "#2e7d32" : "#d1d5db",
                        color: "white",
                        border: "none",
                        borderRadius: "8px",
                        cursor: dm.canTake ? "pointer" : "not-allowed",
                        fontSize: "13px",
                        fontWeight: "600",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {sendingRequest ? "Sending..." : "Send Request"}
                    </button>
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={() => { setShowDmModal(false); setSelectedOrderId(null); setNearbyDeliveryMen([]); }}
              style={{
                marginTop: "16px",
                width: "100%",
                padding: "10px",
                background: "transparent",
                border: "1px solid #d1d5db",
                borderRadius: "8px",
                cursor: "pointer",
                fontSize: "14px",
                color: "#6b7280",
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default OrdersPage;