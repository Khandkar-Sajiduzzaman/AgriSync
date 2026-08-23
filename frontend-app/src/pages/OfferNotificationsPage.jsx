import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getActiveOffers } from "../api/offerApi";

function OfferNotificationsPage() {
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadOffers = async () => {
      try {
        setOffers(await getActiveOffers());
      } catch (loadError) {
        setError(loadError.message || "Failed to load active offers");
      } finally {
        setLoading(false);
      }
    };
    loadOffers();
  }, []);

  if (loading) return <div style={{ padding: 24 }}>Loading offers...</div>;

  return (
    <div style={{ maxWidth: "1000px", margin: "40px auto", padding: "0 20px" }}>
      <h2 style={{ marginBottom: 8 }}>Active Offers</h2>
      <p style={{ color: "#4b5563", marginBottom: 24 }}>
        Discover current promotional offers from local farmers.
      </p>
      {error && <p style={{ color: "#991b1b" }}>{error}</p>}
      {!error && offers.length === 0 && (
        <div style={{ padding: 32, background: "#f9fafb", borderRadius: 12, textAlign: "center", color: "#6b7280" }}>
          No active offers are available right now.
        </div>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
        {offers.map((offer) => (
          <article key={`${offer._id}-${offer.product?._id}`} style={{ background: "#fff", border: "1px solid #bbf7d0", borderRadius: 12, padding: 20, boxShadow: "0 2px 8px rgba(22, 101, 52, 0.08)" }}>
            <div style={{ color: "#166534", fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em" }}>Special offer</div>
            <h3 style={{ margin: "8px 0 10px", color: "#14532d" }}>{offer.title}</h3>
            <p style={{ margin: "0 0 8px", color: "#374151" }}><strong>Product:</strong> {offer.product?.name}</p>
            <p style={{ margin: "0 0 8px", color: "#15803d", fontSize: 20, fontWeight: 800 }}>
              {offer.discountPercent ? `${offer.discountPercent}% OFF` : `৳${offer.discountAmount} OFF`}
            </p>
            {offer.description && <p style={{ margin: "0 0 12px", color: "#4b5563", lineHeight: 1.5 }}>{offer.description}</p>}
            {offer.minOrderAmount !== null && offer.minOrderAmount !== undefined && <p style={{ margin: "0 0 8px", color: "#4b5563", fontSize: 14 }}>Minimum order: ৳{offer.minOrderAmount}</p>}
            <p style={{ margin: "0 0 16px", color: "#6b7280", fontSize: 14 }}>Valid until: {new Date(offer.endDate).toLocaleDateString()}</p>
            <Link to={`/products/${offer.product?._id}`} style={{ display: "inline-block", padding: "10px 16px", borderRadius: 8, background: "#2e7d32", color: "#fff", textDecoration: "none", fontWeight: 600 }}>View Product</Link>
          </article>
        ))}
      </div>
    </div>
  );
}

export default OfferNotificationsPage;
