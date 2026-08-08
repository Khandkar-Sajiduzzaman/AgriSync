function ReviewsList({ reviews, averageRating, totalReviews, distribution, sort, onSortChange }) {
  const sortOptions = [
    { value: "newest", label: "Newest First" },
    { value: "highest", label: "Highest Rated" },
    { value: "lowest", label: "Lowest Rated" },
    { value: "oldest", label: "Oldest First" },
  ];

  const getPercentage = (count) => {
    if (!totalReviews) return 0;
    return Math.round((count / totalReviews) * 100);
  };

  return (
    <div style={{ marginTop: "24px" }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "auto 1fr",
          gap: "32px",
          alignItems: "center",
          marginBottom: "24px",
          background: "#ffffff",
          borderRadius: "12px",
          padding: "24px",
          border: "1px solid #e5e7eb",
        }}
      >
        <div style={{ textAlign: "center", minWidth: "120px" }}>
          <div style={{ fontSize: "48px", fontWeight: "800", color: "#111827", lineHeight: 1 }}>
            {averageRating?.toFixed(1) || "0.0"}
          </div>
          <div style={{ color: "#fbbf24", fontSize: "20px", margin: "4px 0" }}>
            {"★".repeat(Math.round(averageRating || 0))}
            {"☆".repeat(5 - Math.round(averageRating || 0))}
          </div>
          <div style={{ fontSize: "13px", color: "#6b7280" }}>
            {totalReviews} review{totalReviews !== 1 ? "s" : ""}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          {[5, 4, 3, 2, 1].map((star) => (
            <div key={star} style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span style={{ fontSize: "13px", color: "#6b7280", width: "40px", textAlign: "right" }}>
                {star} star{star > 1 ? "s" : ""}
              </span>
              <div style={{ flex: 1, height: "8px", background: "#f3f4f6", borderRadius: "4px", overflow: "hidden" }}>
                <div
                  style={{
                    width: `${getPercentage(distribution?.[star] || 0)}%`,
                    height: "100%",
                    background: "#fbbf24",
                    borderRadius: "4px",
                    transition: "width 0.3s",
                  }}
                />
              </div>
              <span style={{ fontSize: "12px", color: "#9ca3af", width: "30px" }}>
                {distribution?.[star] || 0}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
        <h3 style={{ margin: 0, fontSize: "18px", fontWeight: "600" }}>Customer Reviews</h3>
        <select
          value={sort}
          onChange={(e) => onSortChange(e.target.value)}
          style={{
            padding: "6px 12px",
            borderRadius: "6px",
            border: "1px solid #d1d5db",
            fontSize: "14px",
            background: "#fff",
          }}
        >
          {sortOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      {reviews?.length === 0 ? (
        <p style={{ color: "#6b7280", textAlign: "center", padding: "40px 0" }}>
          No reviews yet. Be the first to review!
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {reviews.map((review) => (
            <div
              key={review._id}
              style={{
                background: "#ffffff",
                borderRadius: "12px",
                padding: "20px",
                border: "1px solid #e5e7eb",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <div
                    style={{
                      width: "36px",
                      height: "36px",
                      borderRadius: "50%",
                      background: "#2e7d32",
                      color: "#fff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "14px",
                      fontWeight: "600",
                    }}
                  >
                    {review.author?.name?.charAt(0)?.toUpperCase() || "?"}
                  </div>
                  <div>
                    <div style={{ fontSize: "14px", fontWeight: "600", color: "#111827" }}>
                      {review.author?.name || "Anonymous"}
                    </div>
                    <div style={{ fontSize: "12px", color: "#9ca3af" }}>
                      {new Date(review.createdAt).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </div>
                  </div>
                </div>
                <div style={{ color: "#fbbf24", fontSize: "16px" }}>
                  {"★".repeat(review.rating)}
                  {"☆".repeat(5 - review.rating)}
                </div>
              </div>
              {review.comment && (
                <p style={{ margin: "8px 0 0 0", fontSize: "14px", color: "#374151", lineHeight: 1.6 }}>
                  {review.comment}
                </p>
              )}
              {review.isVerifiedPurchase && (
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                    marginTop: "10px",
                    fontSize: "12px",
                    color: "#059669",
                    background: "#ecfdf5",
                    padding: "3px 10px",
                    borderRadius: "999px",
                  }}
                >
                  ✓ Verified Purchase
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default ReviewsList;