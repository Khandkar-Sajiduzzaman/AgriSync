import { useState } from "react";
import { createReview } from "../../api/reviewApi";

function ReviewForm({ productId, orderId, onReviewSubmitted }) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (rating === 0) {
      setError("Please select a star rating");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      await createReview({ productId, orderId, rating, comment });
      setRating(0);
      setComment("");
      onReviewSubmitted();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        background: "#f9fafb",
        borderRadius: "12px",
        padding: "20px",
        marginTop: "20px",
      }}
    >
      <h4 style={{ margin: "0 0 12px 0", fontSize: "16px" }}>Write a Review</h4>

      <div style={{ display: "flex", gap: "6px", marginBottom: "12px" }}>
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => setRating(star)}
            onMouseEnter={() => setHoverRating(star)}
            onMouseLeave={() => setHoverRating(0)}
            style={{
              background: "none",
              border: "none",
              fontSize: "28px",
              cursor: "pointer",
              color: star <= (hoverRating || rating) ? "#fbbf24" : "#d1d5db",
              transition: "color 0.15s",
              padding: "0 2px",
            }}
          >
            ★
          </button>
        ))}
        <span style={{ marginLeft: "8px", fontSize: "14px", color: "#6b7280", alignSelf: "center" }}>
          {rating > 0 ? ["Terrible", "Poor", "Average", "Good", "Excellent"][rating - 1] : "Select a rating"}
        </span>
      </div>

      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Share your experience with this product (optional)..."
        rows={4}
        style={{
          width: "100%",
          padding: "12px",
          borderRadius: "8px",
          border: "1px solid #d1d5db",
          fontSize: "14px",
          resize: "vertical",
          boxSizing: "border-box",
          fontFamily: "inherit",
        }}
      />

      {error && (
        <p style={{ color: "#dc2626", fontSize: "13px", margin: "8px 0 0 0" }}>{error}</p>
      )}

      <button
        type="submit"
        disabled={submitting}
        style={{
          marginTop: "12px",
          padding: "10px 24px",
          background: submitting ? "#9ca3af" : "#2e7d32",
          color: "#fff",
          border: "none",
          borderRadius: "8px",
          cursor: submitting ? "not-allowed" : "pointer",
          fontSize: "14px",
          fontWeight: "600",
        }}
      >
        {submitting ? "Submitting..." : "Submit Review"}
      </button>
    </form>
  );
}

export default ReviewForm;