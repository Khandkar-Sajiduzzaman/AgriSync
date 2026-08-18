import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getProduct, recordProductView } from "../api/productApi";
import { getWishlist, toggleWishlist, getFollowedFarmers, toggleFollowFarmer } from "../api/userApi";
import { getProductReviews, canReviewProduct } from "../api/reviewApi";
import ReviewForm from "../components/product/ReviewForm";
import ReviewsList from "../components/product/ReviewsList";
import { useCompare } from "../context/CompareContext";

const NUTRITION_LABELS = {
  calories: "Calories (kcal / 100g)",
  protein: "Protein (g)",
  carbs: "Carbohydrates (g)",
  fat: "Fat (g)",
  fiber: "Fiber (g)",
  vitamins: "Vitamins / Minerals",
  note: "Notes",
};

function ProductDetails() {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);

  const [reviewsData, setReviewsData] = useState(null);
  const [reviewSort, setReviewSort] = useState("newest");
  const [canReview, setCanReview] = useState({ canReview: false, orderId: null });
  const [reviewsLoading, setReviewsLoading] = useState(false);

  const role = JSON.parse(localStorage.getItem("user"))?.role;
  const { toggleCompare, isComparing, isFull } = useCompare();

  useEffect(() => {
    loadData();
  }, [id]);

  // Check delivery coverage for buyers
  useEffect(() => {
    const checkDelivery = async () => {
      try {
        if (!product) return;
        const user = JSON.parse(localStorage.getItem('user')) || {};
        const isBuyer = user?.role === 'buyer';
        if (!isBuyer) return;
        const { checkDeliveryCoverage } = await import('../api/deliveryZoneApi');
        // Prefer lat/lng if buyer stored location, otherwise use address field
        const lat = user.latitude;
        const lng = user.longitude;
        const location = user.address || user.district || user.division || '';
        let res;
        if (lat && lng) {
          res = await checkDeliveryCoverage({ farmerUserId: product.farmer?._id, lat, lng });
        } else if (location) {
          res = await checkDeliveryCoverage({ farmerUserId: product.farmer?._id, location });
        } else {
          // no buyer location available — skip
          return;
        }
        // attach info to product state
        setProduct((p) => ({ ...p, deliveryAvailability: res }));
      } catch (err) {
        console.error('Failed to check delivery coverage', err);
      }
    };
    checkDelivery();
  }, [product]);

  useEffect(() => {
    if (id) loadReviews();
  }, [id, reviewSort]);

  const loadData = async () => {
    setLoading(true);
    try {
      const productData = await getProduct(id);
      setProduct(productData);

      // Track product view for recommendations (from prome_1 branch)
      if (role === "buyer") {
        recordProductView(id).catch(() => {});
      }

      if (role === "buyer") {
        const [wishlist, following, reviewEligibility] = await Promise.all([
          getWishlist().catch(() => []),
          getFollowedFarmers().catch(() => []),
          canReviewProduct(id).catch(() => ({ canReview: false })),
        ]);

        setIsWishlisted(wishlist.some((p) => p._id === id));
        setIsFollowing(following.some((f) => f._id === productData.farmer?._id));
        setCanReview(reviewEligibility);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadReviews = async () => {
    setReviewsLoading(true);
    try {
      const data = await getProductReviews(id, reviewSort);
      setReviewsData(data);
    } catch (err) {
      console.error("Failed to load reviews:", err);
    } finally {
      setReviewsLoading(false);
    }
  };

  const handleToggleWishlist = async () => {
    const nextState = !isWishlisted;
    setIsWishlisted(nextState);
    try {
      await toggleWishlist(id);
    } catch (err) {
      setIsWishlisted(!nextState);
    }
  };

  const handleToggleFollow = async () => {
    if (!product?.farmer?._id) return;
    const nextState = !isFollowing;
    setIsFollowing(nextState);
    try {
      await toggleFollowFarmer(product.farmer._id);
    } catch (err) {
      setIsFollowing(!nextState);
    }
  };

  const handleReviewSubmitted = () => {
    loadReviews();
    setCanReview({ ...canReview, canReview: false, hasReviewed: true });
  };

  if (loading) return <p>Loading product...</p>;
  if (!product) return <p>Product not found.</p>;

  return (
    <div style={{ maxWidth: "900px", margin: "40px auto", padding: "0 20px" }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "32px",
          marginBottom: "40px",
          background: "#ffffff",
          borderRadius: "16px",
          padding: "28px",
          border: "1px solid #e5e7eb",
        }}
      >
        <div>
          {product.images?.length > 0 && (
            <img
              src={`http://localhost:5000${product.images[0]}`}
              alt={product.name}
              style={{
                width: "100%",
                maxHeight: "320px",
                borderRadius: "12px",
                objectFit: "cover",
              }}
            />
          )}
        </div>

        <div>
          <h2 style={{ margin: "0 0 8px 0", fontSize: "24px" }}>{product.name}</h2>

          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
            <span style={{ color: "#fbbf24", fontSize: "18px" }}>
              {"★".repeat(Math.round(product.averageRating || 0))}
              {"☆".repeat(5 - Math.round(product.averageRating || 0))}
            </span>
            <span style={{ fontSize: "14px", color: "#6b7280" }}>
              {product.averageRating?.toFixed(1) || "0.0"} ({product.totalReviews || 0} reviews)
            </span>
          </div>

          <p style={{ fontSize: "28px", fontWeight: "800", color: "#2e7d32", margin: "0 0 16px 0" }}>
            ৳{product.price}
          </p>

          <p style={{ color: "#374151", lineHeight: 1.6, marginBottom: "16px" }}>
            {product.description || "No description available."}
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "14px", color: "#6b7280", marginBottom: "16px" }}>
            <p style={{ margin: 0 }}><strong>Category:</strong> {product.legacyCategory || product.category}</p>
            <p style={{ margin: 0 }}><strong>Stock:</strong> {product.stock} {product.unit}</p>
            <p style={{ margin: 0 }}><strong>Farmer:</strong> {product.farmer?.name}</p>
          </div>
 
          {product.deliveryAvailability && (
            <div style={{ marginTop: 8, padding: '10px', borderRadius: 8, background: product.deliveryAvailability.delivers ? '#ecfdf5' : '#fff1f2', color: product.deliveryAvailability.delivers ? '#065f46' : '#991b1b' }}>
              {product.deliveryAvailability.delivers ? (
                <div>Delivery available to your location{product.deliveryAvailability.matchedZone ? ` — ${product.deliveryAvailability.matchedZone.name}` : ''}.</div>
              ) : (
                <div>Delivery not available to your location.</div>
              )}
            </div>
          )}

          {product.nutritionInfo &&
            Object.entries(product.nutritionInfo).some(([, v]) => v) && (
              <div
                style={{
                  marginTop: 8,
                  marginBottom: 16,
                  padding: "14px",
                  borderRadius: 8,
                  background: "#f9fafb",
                  border: "1px solid #e5e7eb",
                }}
              >
                <p style={{ margin: "0 0 8px 0", fontWeight: 700, fontSize: "14px", color: "#374151" }}>
                  Nutritional Information
                </p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 16px", fontSize: "13px", color: "#4b5563" }}>
                  {Object.entries(product.nutritionInfo)
                    .filter(([, value]) => value !== "" && value !== null && value !== undefined)
                    .map(([key, value]) => (
                      <div key={key}>
                        <strong>{NUTRITION_LABELS[key] || key}:</strong> {value}
                      </div>
                    ))}
                </div>
              </div>
            )}

          {role === "buyer" && (
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
              <button
                onClick={() => toggleCompare(product._id)}
                disabled={!isComparing(product._id) && isFull}
                title={!isComparing(product._id) && isFull ? "You can compare up to 4 products at a time" : ""}
                style={{
                  padding: "10px 20px",
                  borderRadius: "8px",
                  border: "1px solid #d1d5db",
                  background: isComparing(product._id) ? "#e8f5e9" : "#fff",
                  color: isComparing(product._id) ? "#1b5e20" : "#374151",
                  cursor: !isComparing(product._id) && isFull ? "not-allowed" : "pointer",
                  fontWeight: "600",
                }}
              >
                {isComparing(product._id) ? "✓ Added to Compare" : "+ Add to Compare"}
              </button>
              <button
                onClick={handleToggleWishlist}
                style={{
                  padding: "10px 20px",
                  borderRadius: "8px",
                  border: "1px solid #d1d5db",
                  background: isWishlisted ? "#fef2f2" : "#fff",
                  color: isWishlisted ? "#dc2626" : "#374151",
                  cursor: "pointer",
                  fontWeight: "600",
                }}
              >
                {isWishlisted ? "♥ Saved" : "♡ Save"}
              </button>
              <button
                onClick={handleToggleFollow}
                style={{
                  padding: "10px 20px",
                  borderRadius: "8px",
                  border: "1px solid #d1d5db",
                  background: isFollowing ? "#ecfdf5" : "#fff",
                  color: isFollowing ? "#059669" : "#374151",
                  cursor: "pointer",
                  fontWeight: "600",
                }}
              >
                {isFollowing ? "Following ✓" : "Follow Farmer"}
              </button>
            </div>
          )}
        </div>
      </div>

      <div>
        {reviewsLoading ? (
          <p style={{ textAlign: "center", color: "#6b7280" }}>Loading reviews...</p>
        ) : (
          <ReviewsList
            reviews={reviewsData?.reviews}
            averageRating={reviewsData?.averageRating}
            totalReviews={reviewsData?.totalReviews}
            distribution={reviewsData?.distribution}
            sort={reviewSort}
            onSortChange={setReviewSort}
          />
        )}

        {role === "buyer" && canReview.canReview && (
          <ReviewForm
            productId={id}
            orderId={canReview.orderId}
            onReviewSubmitted={handleReviewSubmitted}
          />
        )}

        {role === "buyer" && canReview.hasReviewed && (
          <div
            style={{
              marginTop: "16px",
              padding: "16px",
              background: "#eff6ff",
              borderRadius: "8px",
              textAlign: "center",
              color: "#1e40af",
              fontSize: "14px",
            }}
          >
            ✓ You have already reviewed this product. Thank you!
          </div>
        )}

        {role === "buyer" && !canReview.canReview && !canReview.hasReviewed && (
          <div
            style={{
              marginTop: "16px",
              padding: "16px",
              background: "#f3f4f6",
              borderRadius: "8px",
              textAlign: "center",
              color: "#6b7280",
              fontSize: "14px",
            }}
          >
            Purchase and receive this product to leave a review.
          </div>
        )}
      </div>
    </div>
  );
}

export default ProductDetails;