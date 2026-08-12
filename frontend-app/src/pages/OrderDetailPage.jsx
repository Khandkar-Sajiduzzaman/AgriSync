import { useEffect, useState, useCallback, lazy, Suspense } from "react";
import { useParams, Link } from "react-router-dom";
import {
  getOrderById,
  getOrderTracking,
  updateOrderStatus,
  getLatestTracking,
  getAvailableDeliveryMen,
  assignDeliveryMan,
} from "../api/orderApi";

// Lazy load the map so it doesn't slow down the initial page load
const LiveMap = lazy(() => import("../components/delivery/LiveMap"));


function OrderDetailPage() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [tracking, setTracking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updating, setUpdating] = useState(false);

  // NEW: For live GPS tracking and delivery man assignment
  const [liveLocation, setLiveLocation] = useState(null);
  const [deliveryMen, setDeliveryMen] = useState([]);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assigning, setAssigning] = useState(false);

  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const role = user.role;

  useEffect(() => {
    loadOrder();
  }, [id]);

  // NEW: Poll for live GPS location every 10 seconds
  // Only runs when the order status is "out_for_delivery" to save bandwidth
  useEffect(() => {
    if (!order || order.status !== "out_for_delivery") return;

    let intervalId;

    const pollTracking = async () => {
      try {
        const data = await getLatestTracking(id);
        if (data.currentLocation?.latitude && data.currentLocation?.longitude) {
          setLiveLocation([data.currentLocation.latitude, data.currentLocation.longitude]);
        } else if (data.latestTracking) {
          setLiveLocation([data.latestTracking.latitude, data.latestTracking.longitude]);
        }
      } catch (err) {
        // Silently fail on poll errors (network blips are normal)
        console.log("Tracking poll error:", err.message);
      }
    };

    pollTracking(); // fetch immediately when status changes
    intervalId = setInterval(pollTracking, 10000); // then every 10 seconds

    return () => clearInterval(intervalId); // cleanup: stop polling when leaving page
  }, [order?.status, id]);

  const loadOrder = async () => {
    setLoading(true);
    try {
      const data = await getOrderById(id);
      setOrder(data);
      try {
        const trackData = await getOrderTracking(id);
        setTracking(trackData);
      } catch {
        setTracking(null);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (newStatus, notes) => {
    setUpdating(true);
    try {
      await updateOrderStatus(id, { status: newStatus, notes });
      await loadOrder();
    } catch (err) {
      setError(err.message);
    } finally {
      setUpdating(false);
    }
  };

  // NEW: Farmer assigns a delivery man to this order
  const handleAssignDeliveryMan = async (dmId) => {
    setAssigning(true);
    try {
      await assignDeliveryMan(id, dmId);
      setShowAssignModal(false);
      await loadOrder(); // refresh to show the assigned delivery man
    } catch (err) {
      setError(err.message);
    } finally {
      setAssigning(false);
    }
  };

  // NEW: Fetch the list of available delivery men from the backend
  const loadDeliveryMen = async () => {
    try {
      const data = await getAvailableDeliveryMen();
      setDeliveryMen(data);
    } catch (err) {
      console.log("Failed to load delivery men:", err.message);
    }
  };

  const statusConfig = {
    pending: { color: "#f59e0b", bg: "#fffbeb", label: "Pending", icon: "⏳" },
    confirmed: { color: "#3b82f6", bg: "#eff6ff", label: "Confirmed", icon: "✓" },
    processing: { color: "#8b5cf6", bg: "#f5f3ff", label: "Processing", icon: "⚙️" },
    shipped: { color: "#06b6d4", bg: "#ecfeff", label: "Shipped", icon: "🚚" },
    out_for_delivery: { color: "#f97316", bg: "#fff7ed", label: "Out for Delivery", icon: "🛵" },
    delivered: { color: "#10b981", bg: "#ecfdf5", label: "Delivered", icon: "✅" },
    cancelled: { color: "#ef4444", bg: "#fef2f2", label: "Cancelled", icon: "❌" },
    refunded: { color: "#6b7280", bg: "#f9fafb", label: "Refunded", icon: "↩️" },
  };

  const getFarmerActions = (currentStatus) => {
    const flow = {
      pending: [{ label: "Confirm Order", status: "confirmed", color: "#3b82f6" }],
      confirmed: [{ label: "Start Processing", status: "processing", color: "#8b5cf6" }],
      processing: [
        { label: "Mark as Shipped", status: "shipped", color: "#06b6d4" },
        { label: "Assign Delivery Man", action: "assign", color: "#f59e0b" },
      ],
    };
    return flow[currentStatus] || [];
  };

  const progressSteps = ["pending", "confirmed", "processing", "shipped", "out_for_delivery", "delivered"];

  if (loading) {
    return (
      <div style={{ maxWidth: "900px", margin: "0 auto", padding: "40px 20px", textAlign: "center" }}>
        <div style={{ width: "40px", height: "40px", border: "3px solid #e5e7eb", borderTop: "3px solid #2e7d32", borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto" }} />
        <p style={{ color: "#6b7280", marginTop: "16px" }}>Loading order details...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ maxWidth: "900px", margin: "0 auto", padding: "40px 20px", textAlign: "center" }}>
        <div style={{ fontSize: "48px", marginBottom: "16px" }}>⚠️</div>
        <p style={{ color: "#dc2626" }}>{error}</p>
        <Link to="/orders">
          <button style={{ marginTop: "16px", padding: "10px 20px" }}>Back to Orders</button>
        </Link>
      </div>
    );
  }

  if (!order) {
    return (
      <div style={{ maxWidth: "900px", margin: "0 auto", padding: "40px 20px", textAlign: "center" }}>
        <p>Order not found.</p>
        <Link to="/orders">
          <button style={{ marginTop: "16px" }}>Back to Orders</button>
        </Link>
      </div>
    );
  }

  const status = statusConfig[order.status];
  const currentStepIndex = progressSteps.indexOf(order.status);
  const otherPerson = role === "buyer" ? order.farmer : order.buyer;

  return (
    <div style={{ maxWidth: "900px", margin: "0 auto", padding: "32px 20px" }}>
      {/* Back Button */}
      <Link to="/orders" style={{ textDecoration: "none" }}>
        <button
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            padding: "8px 16px",
            background: "transparent",
            border: "1px solid #d1d5db",
            borderRadius: "8px",
            cursor: "pointer",
            fontSize: "14px",
            color: "#4b5563",
            marginBottom: "24px",
          }}
        >
          ← Back to Orders
        </button>
      </Link>

      {/* Header Card */}
      <div style={{ background: "#ffffff", borderRadius: "16px", border: "1px solid #e5e7eb", boxShadow: "0 1px 3px rgba(0,0,0,0.04)", overflow: "hidden", marginBottom: "24px" }}>
        <div style={{ padding: "28px 32px", display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "16px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px", flexWrap: "wrap" }}>
              <h1 style={{ margin: "0", fontSize: "22px", fontWeight: "700", color: "#111827" }}>
                Order #{order.orderNumber}
              </h1>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "5px 14px",
                  borderRadius: "999px",
                  fontSize: "13px",
                  fontWeight: "600",
                  background: status.bg,
                  color: status.color,
                }}
              >
                {status.icon} {status.label}
              </span>
            </div>
            <p style={{ margin: "0", fontSize: "14px", color: "#9ca3af" }}>
              Placed on {new Date(order.createdAt).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })} at {new Date(order.createdAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
            </p>
          </div>
          <div style={{ textAlign: "right" }}>
            <p style={{ margin: "0", fontSize: "28px", fontWeight: "800", color: "#111827" }}>
              ৳{order.totalAmount}
            </p>
            <p style={{ margin: "4px 0 0 0", fontSize: "13px", color: "#9ca3af" }}>
              {order.items?.length || 0} item{order.items?.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
      </div>

      {/* Progress Tracker (only for non-cancelled orders) */}
      {order.status !== "cancelled" && order.status !== "refunded" && (
        <div style={{ background: "#ffffff", borderRadius: "16px", border: "1px solid #e5e7eb", boxShadow: "0 1px 3px rgba(0,0,0,0.04)", padding: "28px 32px", marginBottom: "24px", overflowX: "auto" }}>
          <div style={{ display: "flex", alignItems: "center", minWidth: "600px" }}>
            {progressSteps.map((step, index) => {
              const isCompleted = index <= currentStepIndex;
              const isCurrent = index === currentStepIndex;
              const stepStatus = statusConfig[step];

              return (
                <div key={step} style={{ display: "flex", alignItems: "center", flex: 1 }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1 }}>
                    <div
                      style={{
                        width: "36px",
                        height: "36px",
                        borderRadius: "50%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "14px",
                        fontWeight: "700",
                        background: isCompleted ? stepStatus.color : "#f3f4f6",
                        color: isCompleted ? "#ffffff" : "#9ca3af",
                        border: isCurrent ? `3px solid ${stepStatus.color}` : "3px solid transparent",
                        transition: "all 0.3s",
                      }}
                    >
                      {isCompleted ? "✓" : index + 1}
                    </div>
                    <span
                      style={{
                        marginTop: "8px",
                        fontSize: "11px",
                        fontWeight: isCurrent ? "600" : "500",
                        color: isCompleted ? stepStatus.color : "#9ca3af",
                        textTransform: "capitalize",
                        textAlign: "center",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {stepStatus.label}
                    </span>
                  </div>
                  {index < progressSteps.length - 1 && (
                    <div
                      style={{
                        flex: 1,
                        height: "3px",
                        background: index < currentStepIndex ? stepStatus.color : "#f3f4f6",
                        margin: "0 8px",
                        marginBottom: "20px",
                        borderRadius: "2px",
                      }}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Two Column Layout */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", marginBottom: "24px" }}>
        {/* Left: Order Info */}
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          {/* Items */}
          <div style={{ background: "#ffffff", borderRadius: "16px", border: "1px solid #e5e7eb", boxShadow: "0 1px 3px rgba(0,0,0,0.04)", overflow: "hidden" }}>
            <div style={{ padding: "20px 24px", borderBottom: "1px solid #f3f4f6" }}>
              <h3 style={{ margin: "0", fontSize: "16px", fontWeight: "600", color: "#111827" }}>Order Items</h3>
            </div>
            <div style={{ padding: "8px 0" }}>
              {order.items?.map((item) => (
                <div
                  key={item.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "16px",
                    padding: "14px 24px",
                    borderBottom: "1px solid #f9fafb",
                  }}
                >
                  {item.product?.images?.[0] ? (
                    <img
                      src={`http://localhost:5000${item.product.images[0]}`}
                      alt={item.productName || item.product?.name}
                      style={{ width: "56px", height: "56px", borderRadius: "10px", objectFit: "cover" }}
                    />
                  ) : (
                    <div style={{ width: "56px", height: "56px", borderRadius: "10px", background: "#f3f4f6", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px" }}>
                      📦
                    </div>
                  )}
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: "0", fontSize: "15px", fontWeight: "600", color: "#111827" }}>
                      {item.productName || item.product?.name}
                    </p>
                    <p style={{ margin: "4px 0 0 0", fontSize: "13px", color: "#6b7280" }}>
                      ৳{item.unitPrice} × {item.quantity} {item.unit || item.product?.unit}
                    </p>
                  </div>
                  <p style={{ margin: "0", fontSize: "15px", fontWeight: "700", color: "#111827" }}>
                    ৳{item.total}
                  </p>
                </div>
              ))}
            </div>
            {/* Totals */}
            <div style={{ padding: "16px 24px", background: "#f9fafb", borderTop: "1px solid #f3f4f6" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                <span style={{ fontSize: "14px", color: "#6b7280" }}>Subtotal</span>
                <span style={{ fontSize: "14px", color: "#374151" }}>৳{order.subtotal || order.totalAmount}</span>
              </div>
              {order.deliveryFee > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                  <span style={{ fontSize: "14px", color: "#6b7280" }}>Delivery Fee</span>
                  <span style={{ fontSize: "14px", color: "#374151" }}>৳{order.deliveryFee}</span>
                </div>
              )}
              {order.discountAmount > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                  <span style={{ fontSize: "14px", color: "#10b981" }}>Discount</span>
                  <span style={{ fontSize: "14px", color: "#10b981" }}>-৳{order.discountAmount}</span>
                </div>
              )}
              <div style={{ display: "flex", justifyContent: "space-between", paddingTop: "12px", borderTop: "2px solid #e5e7eb" }}>
                <span style={{ fontSize: "16px", fontWeight: "700", color: "#111827" }}>Total</span>
                <span style={{ fontSize: "18px", fontWeight: "800", color: "#2e7d32" }}>৳{order.totalAmount}</span>
              </div>
            </div>
          </div>

          {/* Status History */}
          <div style={{ background: "#ffffff", borderRadius: "16px", border: "1px solid #e5e7eb", boxShadow: "0 1px 3px rgba(0,0,0,0.04)", overflow: "hidden" }}>
            <div style={{ padding: "20px 24px", borderBottom: "1px solid #f3f4f6" }}>
              <h3 style={{ margin: "0", fontSize: "16px", fontWeight: "600", color: "#111827" }}>Status History</h3>
            </div>
            <div style={{ padding: "16px 24px" }}>
              {order.statusHistory?.length > 0 ? (
                <div style={{ position: "relative" }}>
                  {order.statusHistory.map((history, index) => {
                    const hStatus = statusConfig[history.status];
                    return (
                      <div key={history.id} style={{ display: "flex", gap: "16px", paddingBottom: index < order.statusHistory.length - 1 ? "20px" : "0" }}>
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                          <div
                            style={{
                              width: "12px",
                              height: "12px",
                              borderRadius: "50%",
                              background: hStatus.color,
                              border: "2px solid #ffffff",
                              boxShadow: "0 0 0 2px " + hStatus.color,
                              flexShrink: 0,
                            }}
                          />
                          {index < order.statusHistory.length - 1 && (
                            <div style={{ width: "2px", flex: 1, background: "#e5e7eb", marginTop: "8px" }} />
                          )}
                        </div>
                        <div style={{ flex: 1, paddingBottom: index < order.statusHistory.length - 1 ? "20px" : "0" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "8px" }}>
                            <span
                              style={{
                                fontSize: "14px",
                                fontWeight: "600",
                                color: hStatus.color,
                                textTransform: "capitalize",
                              }}
                            >
                              {hStatus.icon} {hStatus.label}
                            </span>
                            <span style={{ fontSize: "12px", color: "#9ca3af" }}>
                              {new Date(history.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })} {new Date(history.createdAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                            </span>
                          </div>
                          <p style={{ margin: "4px 0 0 0", fontSize: "13px", color: "#6b7280" }}>{history.notes}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p style={{ color: "#9ca3af", fontSize: "14px" }}>No status history available.</p>
              )}
            </div>
          </div>
        </div>

        {/* Right: Delivery & Actions */}
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          {/* Delivery Info */}
          <div style={{ background: "#ffffff", borderRadius: "16px", border: "1px solid #e5e7eb", boxShadow: "0 1px 3px rgba(0,0,0,0.04)", overflow: "hidden" }}>
            <div style={{ padding: "20px 24px", borderBottom: "1px solid #f3f4f6" }}>
              <h3 style={{ margin: "0", fontSize: "16px", fontWeight: "600", color: "#111827" }}>Delivery Information</h3>
            </div>
            <div style={{ padding: "20px 24px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
                <div style={{ width: "40px", height: "40px", borderRadius: "50%", background: "#e8f5e9", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px" }}>
                  {role === "buyer" ? "👨‍🌾" : "👤"}
                </div>
                <div>
                  <p style={{ margin: "0", fontSize: "15px", fontWeight: "600", color: "#111827" }}>
                    {otherPerson?.name}
                  </p>
                  <p style={{ margin: "2px 0 0 0", fontSize: "13px", color: "#6b7280" }}>
                    {role === "buyer" ? "Farmer" : "Buyer"}
                  </p>
                </div>
              </div>

              <div style={{ marginBottom: "16px" }}>
                <p style={{ margin: "0 0 6px 0", fontSize: "12px", fontWeight: "600", color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.5px" }}>Delivery Address</p>
                <p style={{ margin: "0", fontSize: "14px", color: "#374151", lineHeight: "1.6" }}>
                  {order.deliveryAddress}
                </p>
              </div>

              {order.deliveryNotes && (
                <div style={{ marginBottom: "16px" }}>
                  <p style={{ margin: "0 0 6px 0", fontSize: "12px", fontWeight: "600", color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.5px" }}>Notes</p>
                  <p style={{ margin: "0", fontSize: "14px", color: "#6b7280", fontStyle: "italic" }}>
                    "{order.deliveryNotes}"
                  </p>
                </div>
              )}

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <InfoPill label="Payment" value={order.paymentMethod?.replace(/_/g, " ")} />
                <InfoPill label="Payment Status" value={order.paymentStatus} color={order.paymentStatus === "paid" ? "#10b981" : "#f59e0b"} />
                {order.estimatedDelivery && (
                  <InfoPill label="Est. Delivery" value={new Date(order.estimatedDelivery).toLocaleDateString()} />
                )}
                {order.deliveryMan && (
                  <InfoPill label="Delivery Partner" value={order.deliveryMan.name} />
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div style={{ background: "#ffffff", borderRadius: "16px", border: "1px solid #e5e7eb", boxShadow: "0 1px 3px rgba(0,0,0,0.04)", padding: "24px" }}>
            <h3 style={{ margin: "0 0 16px 0", fontSize: "16px", fontWeight: "600", color: "#111827" }}>Actions</h3>

            {/* Buyer Cancel */}
            {role === "buyer" && order.status === "pending" && (
              <button
                onClick={() => handleStatusUpdate("cancelled", "Cancelled by buyer")}
                disabled={updating}
                style={{
                  width: "100%",
                  padding: "12px",
                  background: "#fef2f2",
                  color: "#dc2626",
                  border: "1px solid #fecaca",
                  borderRadius: "10px",
                  cursor: "pointer",
                  fontSize: "14px",
                  fontWeight: "600",
                  marginBottom: "10px",
                }}
              >
                {updating ? "Cancelling..." : "❌ Cancel Order"}
              </button>
            )}

            {/* Farmer Actions */}
            {role === "farmer" &&
              getFarmerActions(order.status).map((action) => (
                <button
                  key={action.status || action.action}
                  onClick={() => {
                    if (action.action === "assign") {
                      loadDeliveryMen(); // fetch available delivery men
                      setShowAssignModal(true); // show the popup
                    } else {
                      handleStatusUpdate(action.status, `${action.label} by farmer`);
                    }
                  }}
                  disabled={updating || assigning}
                  style={{
                    width: "100%",
                    padding: "12px",
                    background: action.color,
                    color: "white",
                    border: "none",
                    borderRadius: "10px",
                    cursor: "pointer",
                    fontSize: "14px",
                    fontWeight: "600",
                    marginBottom: "10px",
                    boxShadow: `0 4px 12px ${action.color}40`,
                  }}
                >
                  {updating || assigning ? "Updating..." : `${action.label} →`}
                </button>
              ))}

            {order.status === "delivered" && (
              <div style={{ padding: "12px", background: "#ecfdf5", borderRadius: "10px", textAlign: "center" }}>
                <p style={{ margin: "0", fontSize: "14px", color: "#10b981", fontWeight: "600" }}>
                  ✅ Order delivered successfully
                </p>
              </div>
            )}

            {order.status === "cancelled" && (
              <div style={{ padding: "12px", background: "#fef2f2", borderRadius: "10px", textAlign: "center" }}>
                <p style={{ margin: "0", fontSize: "14px", color: "#dc2626", fontWeight: "600" }}>
                  ❌ This order has been cancelled
                </p>
                {order.cancelledAt && (
                  <p style={{ margin: "4px 0 0 0", fontSize: "12px", color: "#9ca3af" }}>
                    on {new Date(order.cancelledAt).toLocaleDateString()}
                  </p>
                )}
              </div>
            )}

            {/* NEW: Assign Delivery Man Modal */}
            {showAssignModal && (
              <div style={{ marginTop: "16px", padding: "16px", background: "#fffbeb", borderRadius: "10px", border: "1px solid #fcd34d" }}>
                <p style={{ margin: "0 0 12px 0", fontSize: "14px", fontWeight: "600", color: "#92400e" }}>
                  Select a Delivery Partner
                </p>
                {deliveryMen.length === 0 ? (
                  <p style={{ fontSize: "13px", color: "#92400e" }}>No available delivery men right now.</p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {deliveryMen.map((dm) => (
                      <button
                        key={dm._id}
                        onClick={() => handleAssignDeliveryMan(dm._id)}
                        disabled={assigning}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          padding: "10px 12px",
                          background: "white",
                          border: "1px solid #fcd34d",
                          borderRadius: "8px",
                          cursor: "pointer",
                          fontSize: "13px",
                        }}
                      >
                        <span style={{ fontWeight: "600" }}>{dm.name}</span>
                        <span style={{ color: "#92400e", fontSize: "12px" }}>
                          {dm.deliveryManProfile?.vehicleType || "Vehicle"} • {dm.phone || "No phone"}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
                <button
                  onClick={() => setShowAssignModal(false)}
                  style={{
                    marginTop: "10px",
                    padding: "8px 16px",
                    background: "transparent",
                    border: "1px solid #d1d5db",
                    borderRadius: "8px",
                    cursor: "pointer",
                    fontSize: "13px",
                    color: "#6b7280",
                  }}
                >
                  Cancel
                </button>
              </div>
            )}
          </div>

          {/* NEW: Live Map Tracking */}
          {(order.status === "out_for_delivery" || order.status === "shipped" || order.status === "delivered") && (
            <div style={{ background: "#ffffff", borderRadius: "16px", border: "1px solid #e5e7eb", boxShadow: "0 1px 3px rgba(0,0,0,0.04)", overflow: "hidden" }}>
              <div style={{ padding: "20px 24px", borderBottom: "1px solid #f3f4f6" }}>
                <h3 style={{ margin: "0", fontSize: "16px", fontWeight: "600", color: "#111827" }}>
                  📍 Live Tracking
                  {order.status === "out_for_delivery" && (
                    <span style={{ marginLeft: "8px", fontSize: "12px", color: "#10b981", fontWeight: "500" }}>
                      ● Live
                    </span>
                  )}
                </h3>
              </div>
              <div style={{ padding: "16px 24px" }}>
                <Suspense fallback={<div style={{ height: "300px", display: "flex", alignItems: "center", justifyContent: "center", color: "#9ca3af" }}>Loading map...</div>}>
                  <LiveMap
                    deliveryPosition={liveLocation}
                    buyerPosition={order.buyer?.latitude && order.buyer?.longitude ? [order.buyer.latitude, order.buyer.longitude] : null}
                    farmerPosition={order.farmer?.latitude && order.farmer?.longitude ? [order.farmer.latitude, order.farmer.longitude] : null}
                  />
                </Suspense>

                {liveLocation && (
                  <p style={{ margin: "12px 0 0 0", fontSize: "13px", color: "#6b7280", textAlign: "center" }}>
                    Last updated: {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoPill({ label, value, color }) {
  return (
    <div style={{ background: "#f9fafb", padding: "12px", borderRadius: "10px" }}>
      <p style={{ margin: "0 0 4px 0", fontSize: "11px", fontWeight: "600", color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.5px" }}>
        {label}
      </p>
      <p style={{ margin: "0", fontSize: "14px", fontWeight: "600", color: color || "#374151", textTransform: "capitalize" }}>
        {value}
      </p>
    </div>
  );
}

export default OrderDetailPage;