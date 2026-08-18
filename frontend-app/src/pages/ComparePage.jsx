import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCompare } from "../context/CompareContext";
import { getComparisonProducts } from "../api/comparisonApi";

const NUTRITION_ROWS = [
  { key: "calories", label: "Calories (kcal / 100g)" },
  { key: "protein", label: "Protein (g)" },
  { key: "carbs", label: "Carbohydrates (g)" },
  { key: "fat", label: "Fat (g)" },
  { key: "fiber", label: "Fiber (g)" },
  { key: "vitamins", label: "Vitamins / Minerals" },
];

const cellStyle = {
  padding: "12px 16px",
  borderBottom: "1px solid #e5e7eb",
  verticalAlign: "top",
  fontSize: "14px",
  color: "#374151",
};

const labelCellStyle = {
  ...cellStyle,
  fontWeight: "700",
  background: "#f9fafb",
  whiteSpace: "nowrap",
};

function ComparePage() {
  const { compareIds, removeFromCompare, clearCompare } = useCompare();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    if (compareIds.length === 0) {
      setProducts([]);
      setLoading(false);
      return;
    }
    loadProducts();
  }, [compareIds.join(",")]);

  const loadProducts = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getComparisonProducts(compareIds);
      setProducts(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (compareIds.length === 0) {
    return (
      <div style={{ maxWidth: "700px", margin: "60px auto", textAlign: "center", padding: "0 20px" }}>
        <h2 style={{ color: "#1B5E20" }}>Nothing to compare yet</h2>
        <p style={{ color: "#6b7280", marginBottom: "24px" }}>
          Go to Browse Products and select up to 4 products to compare.
        </p>
        <button
          onClick={() => navigate("/products/browse")}
          style={{
            padding: "10px 24px",
            borderRadius: "8px",
            border: "none",
            background: "#2E7D32",
            color: "#fff",
            cursor: "pointer",
            fontWeight: "600",
          }}
        >
          Browse Products
        </button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: "1100px", margin: "40px auto", padding: "0 20px 80px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <h2 style={{ color: "#1B5E20", margin: 0 }}>Compare Products</h2>
        <button
          onClick={clearCompare}
          style={{
            padding: "8px 16px",
            borderRadius: "8px",
            border: "1px solid #d1d5db",
            background: "#fff",
            color: "#374151",
            cursor: "pointer",
            fontSize: "13px",
          }}
        >
          Clear all
        </button>
      </div>

      {loading && <p style={{ textAlign: "center", color: "#6b7280", padding: "40px" }}>Loading comparison...</p>}
      {error && <p style={{ textAlign: "center", color: "#C62828", padding: "20px" }}>{error}</p>}

      {!loading && !error && products.length > 0 && (
        <div style={{ overflowX: "auto", background: "#fff", borderRadius: "12px", border: "1px solid #e5e7eb" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={{ ...labelCellStyle, background: "#fff" }}></th>
                {products.map((p) => (
                  <th key={p._id} style={{ ...cellStyle, minWidth: "220px", textAlign: "left" }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                      {p.images?.length > 0 ? (
                        <img
                          src={`http://localhost:5000${p.images[0]}`}
                          alt={p.name}
                          style={{ width: "100%", height: "120px", objectFit: "cover", borderRadius: "8px" }}
                        />
                      ) : (
                        <div style={{ width: "100%", height: "120px", background: "#f0f0f0", borderRadius: "8px" }} />
                      )}
                      <span style={{ fontSize: "16px", fontWeight: "700", color: "#111827" }}>{p.name}</span>
                      <button
                        onClick={() => removeFromCompare(p._id)}
                        style={{
                          alignSelf: "flex-start",
                          background: "none",
                          border: "none",
                          color: "#dc2626",
                          fontSize: "12px",
                          cursor: "pointer",
                          padding: 0,
                        }}
                      >
                        Remove
                      </button>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={labelCellStyle}>Price</td>
                {products.map((p) => (
                  <td key={p._id} style={cellStyle}>
                    <span style={{ fontSize: "18px", fontWeight: "700", color: "#2e7d32" }}>৳{p.price}</span>
                    {p.unit && <span style={{ color: "#6b7280" }}> / {p.unit}</span>}
                  </td>
                ))}
              </tr>

              <tr>
                <td style={labelCellStyle}>Rating</td>
                {products.map((p) => (
                  <td key={p._id} style={cellStyle}>
                    <span style={{ color: "#fbbf24" }}>
                      {"★".repeat(Math.round(p.averageRating || 0))}
                      {"☆".repeat(5 - Math.round(p.averageRating || 0))}
                    </span>{" "}
                    <span style={{ fontSize: "12px", color: "#6b7280" }}>
                      {p.averageRating?.toFixed(1) || "0.0"} ({p.totalReviews || 0})
                    </span>
                  </td>
                ))}
              </tr>

              <tr>
                <td style={labelCellStyle}>Availability</td>
                {products.map((p) => (
                  <td key={p._id} style={cellStyle}>
                    {p.isAvailable ? (
                      <span style={{ color: "#059669", fontWeight: "600" }}>✓ In Stock ({p.stock})</span>
                    ) : (
                      <span style={{ color: "#dc2626", fontWeight: "600" }}>✗ Out of Stock</span>
                    )}
                  </td>
                ))}
              </tr>

              <tr>
                <td style={labelCellStyle}>Category</td>
                {products.map((p) => (
                  <td key={p._id} style={cellStyle}>{p.category || "—"}</td>
                ))}
              </tr>

              <tr>
                <td style={labelCellStyle}>Farmer</td>
                {products.map((p) => (
                  <td key={p._id} style={cellStyle}>{p.farmer?.name || "—"}</td>
                ))}
              </tr>

              {NUTRITION_ROWS.map(({ key, label }) => (
                <tr key={key}>
                  <td style={labelCellStyle}>{label}</td>
                  {products.map((p) => (
                    <td key={p._id} style={cellStyle}>
                      {p.nutrition?.[key] || <span style={{ color: "#9ca3af" }}>—</span>}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default ComparePage;