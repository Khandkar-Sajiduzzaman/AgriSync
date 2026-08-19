import { useState, useEffect, useCallback, useRef } from "react";

const BASE_URL = "http://localhost:5000/api/reviews";

const getToken = () => localStorage.getItem("token");

function ReviewModeration() {
  const [reviews, setReviews] = useState({ pending: [], approved: [], rejected: [] });
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState({ pending: false, approved: false, rejected: false });
  const [activeTab, setActiveTab] = useState("pending");
  const [actionLoading, setActionLoading] = useState(null);

  // Use a ref to track which tabs have been fetched (prevents infinite loops)
  const fetchedTabsRef = useRef(new Set());

  const authHeader = useCallback(() => ({
    Authorization: `Bearer ${getToken()}`,
    "Content-Type": "application/json",
  }), []);

  // Fetch stats ONLY ONCE on mount
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch(`${BASE_URL}/stats`, { headers: authHeader() });
        if (!res.ok) throw new Error("Failed");
        const data = await res.json();
        setStats(data);
      } catch (err) {
        console.error("Failed to load stats:", err);
      }
    };
    fetchStats();
  }, [authHeader]);

  // Fetch reviews for a tab ONLY if not already fetched
  const fetchReviewsForTab = useCallback(async (tab) => {
    if (fetchedTabsRef.current.has(tab)) return; // Already fetched, skip
    fetchedTabsRef.current.add(tab);

    setLoading((prev) => ({ ...prev, [tab]: true }));
    try {
      const res = await fetch(`${BASE_URL}/flagged?status=${tab}`, { headers: authHeader() });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setReviews((prev) => ({ ...prev, [tab]: data }));
    } catch (err) {
      console.error(`Failed to load ${tab} reviews:`, err);
    } finally {
      setLoading((prev) => ({ ...prev, [tab]: false }));
    }
  }, [authHeader]);

  // Load data when tab changes
  useEffect(() => {
    fetchReviewsForTab(activeTab);
  }, [activeTab, fetchReviewsForTab]);

  const handleModerate = async (reviewId, action) => {
    setActionLoading(reviewId);
    try {
      const res = await fetch(`${BASE_URL}/${reviewId}/moderate`, {
        method: "PATCH",
        headers: authHeader(),
        body: JSON.stringify({ action }),
      });
      if (!res.ok) throw new Error("Failed");

      // OPTIMISTIC UPDATE: Move review locally without re-fetching
      const review = reviews[activeTab].find((r) => (r._id || r.id) === reviewId);
      if (!review) return;

      const updatedReview = {
        ...review,
        moderationStatus: action === "approve" ? "approved" : "rejected",
        moderatedAt: new Date().toISOString(),
        isFlagged: action === "reject",
      };

      setReviews((prev) => {
        const targetTab = action === "approve" ? "approved" : "rejected";
        return {
          ...prev,
          [activeTab]: prev[activeTab].filter((r) => (r._id || r.id) !== reviewId),
          [targetTab]: [...prev[targetTab], updatedReview],
        };
      });

      // Update stats locally
      setStats((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          pendingModeration: Math.max(0, prev.pendingModeration - 1),
          [action === "approve" ? "approvedAfterFlag" : "rejectedReviews"]:
            (action === "approve" ? prev.approvedAfterFlag : prev.rejectedReviews) + 1,
        };
      });
    } catch (err) {
      alert("Failed to moderate review. Please try again.");
    } finally {
      setActionLoading(null);
    }
  };

  const fraudReasonLabels = {
    extreme_rating: "Extreme Rating (1 or 5 stars)",
    missing_comment: "No comment provided",
    short_comment: "Comment too short (< 15 chars)",
    duplicate_content: "Duplicate comment detected",
    rapid_reviews: "Multiple reviews in 10 minutes",
    rating_comment_mismatch: "Rating contradicts comment",
    generic_comment: "Generic/bot-like comment",
  };

  const cardStyle = {
    background: "#fff",
    borderRadius: "12px",
    padding: "20px",
    border: "1px solid #e5e7eb",
    marginBottom: "16px",
  };

  const badgeStyle = (color) => ({
    display: "inline-block",
    padding: "4px 12px",
    borderRadius: "999px",
    fontSize: "12px",
    fontWeight: "600",
    background: color,
    color: "#fff",
  });

  const currentReviews = reviews[activeTab];
  const isLoading = loading[activeTab];

  return (
    <div style={{ maxWidth: "1000px", margin: "0 auto", padding: "20px" }}>
      <h2 style={{ fontSize: "24px", marginBottom: "8px" }}>Review Moderation</h2>
      <p style={{ color: "#6b7280", marginBottom: "24px" }}>
        Review and manage flagged reviews to maintain platform trust.
      </p>

      {/* Stats Cards */}
      {stats && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
            gap: "12px",
            marginBottom: "24px",
          }}
        >
          {[
            { label: "Total Reviews", value: stats.totalReviews, color: "#3b82f6" },
            { label: "Flagged", value: stats.flaggedReviews, color: "#f59e0b" },
            { label: "Pending", value: stats.pendingModeration, color: "#ef4444" },
            { label: "Approved", value: stats.approvedAfterFlag, color: "#10b981" },
            { label: "Rejected", value: stats.rejectedReviews, color: "#6b7280" },
            { label: "Flag Rate", value: `${stats.flagRate}%`, color: "#8b5cf6" },
          ].map((stat) => (
            <div
              key={stat.label}
              style={{
                background: "#fff",
                borderRadius: "12px",
                padding: "14px",
                border: "1px solid #e5e7eb",
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: "24px", fontWeight: "800", color: stat.color }}>
                {stat.value}
              </div>
              <div style={{ fontSize: "11px", color: "#6b7280", marginTop: "4px" }}>
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "20px", borderBottom: "2px solid #e5e7eb" }}>
        {["pending", "approved", "rejected"].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: "10px 20px",
              border: "none",
              borderBottom: activeTab === tab ? "3px solid #2e7d32" : "3px solid transparent",
              background: "transparent",
              cursor: "pointer",
              fontWeight: activeTab === tab ? "700" : "500",
              textTransform: "capitalize",
              color: activeTab === tab ? "#2e7d32" : "#6b7280",
              fontSize: "14px",
              transition: "all 0.2s",
            }}
          >
            {tab}
            <span
              style={{
                marginLeft: "6px",
                background: activeTab === tab ? "#2e7d32" : "#e5e7eb",
                color: activeTab === tab ? "#fff" : "#6b7280",
                padding: "2px 8px",
                borderRadius: "999px",
                fontSize: "11px",
              }}
            >
              {reviews[tab].length}
            </span>
          </button>
        ))}
      </div>

      {/* Reviews List */}
      {isLoading && currentReviews.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px", color: "#6b7280" }}>
          <div style={{ fontSize: "16px" }}>Loading reviews...</div>
        </div>
      ) : currentReviews.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            color: "#6b7280",
            padding: "50px 20px",
            background: "#f9fafb",
            borderRadius: "12px",
          }}
        >
          <div style={{ fontSize: "18px", fontWeight: "600", marginBottom: "8px" }}>
            No {activeTab} reviews
          </div>
          <div style={{ fontSize: "14px" }}>
            {activeTab === "pending"
              ? "All caught up! No flagged reviews need moderation."
              : `No reviews have been ${activeTab} yet.`}
          </div>
        </div>
      ) : (
        currentReviews.map((review) => (
          <div key={review._id || review.id} style={cardStyle}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                marginBottom: "12px",
                flexWrap: "wrap",
                gap: "8px",
              }}
            >
              <div style={{ flex: 1, minWidth: "200px" }}>
                <div style={{ fontWeight: "600", fontSize: "16px", color: "#111827" }}>
                  {review.product?.name}
                </div>
                <div style={{ fontSize: "13px", color: "#6b7280", marginTop: "4px" }}>
                  by {review.author?.name} ({review.author?.email}) • Order #
                  {review.order?.orderNumber}
                </div>
              </div>
              <div style={{ display: "flex", gap: "8px", alignItems: "center", flexShrink: 0 }}>
                <span style={{ color: "#fbbf24", fontSize: "18px", letterSpacing: "2px" }}>
                  {"★".repeat(review.rating)}
                  <span style={{ color: "#e5e7eb" }}>{"★".repeat(5 - review.rating)}</span>
                </span>
                <span style={badgeStyle("#ef4444")}>Score: {review.fraudScore}</span>
              </div>
            </div>

            <p
              style={{
                background: "#f9fafb",
                padding: "12px",
                borderRadius: "8px",
                fontSize: "14px",
                color: "#374151",
                margin: "0 0 12px 0",
                lineHeight: "1.5",
              }}
            >
              {review.comment || <em style={{ color: "#9ca3af" }}>No comment provided</em>}
            </p>

            {/* Fraud Reasons */}
            {(review.fraudReasons || []).length > 0 && (
              <div style={{ marginBottom: "16px" }}>
                <span style={{ fontSize: "12px", fontWeight: "600", color: "#991b1b" }}>
                  Fraud Indicators:
                </span>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "6px" }}>
                  {review.fraudReasons.map((reason) => (
                    <span
                      key={reason}
                      style={{
                        background: "#fef2f2",
                        color: "#991b1b",
                        padding: "4px 10px",
                        borderRadius: "6px",
                        fontSize: "12px",
                        border: "1px solid #fecaca",
                        fontWeight: "500",
                      }}
                    >
                      {fraudReasonLabels[reason] || reason}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Admin Actions */}
            {activeTab === "pending" && (
              <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                <button
                  onClick={() => handleModerate(review._id || review.id, "approve")}
                  disabled={actionLoading === (review._id || review.id)}
                  style={{
                    padding: "8px 20px",
                    background: actionLoading === (review._id || review.id) ? "#9ca3af" : "#10b981",
                    color: "#fff",
                    border: "none",
                    borderRadius: "8px",
                    cursor: "pointer",
                    fontWeight: "600",
                    fontSize: "14px",
                  }}
                >
                  {actionLoading === (review._id || review.id) ? "..." : "Approve"}
                </button>
                <button
                  onClick={() => handleModerate(review._id || review.id, "reject")}
                  disabled={actionLoading === (review._id || review.id)}
                  style={{
                    padding: "8px 20px",
                    background: actionLoading === (review._id || review.id) ? "#9ca3af" : "#ef4444",
                    color: "#fff",
                    border: "none",
                    borderRadius: "8px",
                    cursor: "pointer",
                    fontWeight: "600",
                    fontSize: "14px",
                  }}
                >
                  {actionLoading === (review._id || review.id) ? "..." : "Reject"}
                </button>
              </div>
            )}

            {review.moderationNote && (
              <div
                style={{
                  marginTop: "12px",
                  padding: "8px 12px",
                  background: "#eff6ff",
                  borderRadius: "6px",
                  fontSize: "13px",
                  color: "#1e40af",
                }}
              >
                <strong>Note:</strong> {review.moderationNote}
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}

export default ReviewModeration;