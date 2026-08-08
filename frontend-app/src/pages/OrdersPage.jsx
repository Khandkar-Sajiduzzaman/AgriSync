import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getMyOrders, updateOrderStatus } from "../api/orderApi";

function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingId, setUpdatingId] = useState(null);

  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const role = user.role;

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    setLoading(true);
    try {
      const data = await getMyOrders();
      setOrders(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

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
    pending: { color: "#f59e0b", bg: "#fffbeb", label: "Pending" },
    confirmed: { color: "#3b82f6", bg: "#eff6ff", label: "Confirmed" },
    processing: { color: "#8b5cf6", bg: "#f5f3ff", label: "Processing" },
    shipped: { color: "#06b6d4", bg: "#ecfeff", label: "Shipped" },
    out_for_delivery: { color: "#f97316", bg: "#fff7ed", label: "Out for Delivery" },
    delivered: { color: "#10b981", bg: "#ecfdf5", label: "Delivered" },
    cancelled: { color: "#ef4444", bg: "#fef2f2", label: "Cancelled" },
    refunded: { color: "#6b7280", bg: "#f9fafb", label: "Refunded" },
  };

  const getFarmerActions = (currentStatus) => {
    const flow = {
      pending: [{ label: "Confirm", status: "confirmed", color: "#3b82f6" }],
      confirmed: [{ label: "Process", status: "processing", color: "#8b5cf6" }],
      processing: [{ label: "Ship", status: "shipped", color: "#06b6d4" }],
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
                      getFarmerActions(order.status).map((action) => (
                        <button
                          key={action.status}
                          onClick={() => handleStatusUpdate(order._id, action.status, `${action.label} by farmer`)}
                          disabled={updatingId === order._id}
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
                          {updatingId === order._id ? "Updating..." : action.label}
                        </button>
                      ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default OrdersPage;