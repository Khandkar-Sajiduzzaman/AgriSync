import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCompare } from "../context/CompareContext";
import { getComparisonProducts } from "../api/comparisonApi";

const NUTRITION_ROWS = [
  { key: "calories", label: "Calories (kcal / 100g)", direction: "lower" },
  { key: "protein", label: "Protein (g)", direction: "higher" },
  { key: "carbs", label: "Carbohydrates (g)", direction: null },
  { key: "fat", label: "Fat (g)", direction: "lower" },
  { key: "fiber", label: "Fiber (g)", direction: "higher" },
  { key: "vitamins", label: "Vitamins / Minerals", direction: null },
];

const CHART_COLORS = ["#2E7D32", "#1976D2", "#E65100", "#8E24AA"];

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

const bestCellStyle = {
  ...cellStyle,
  background: "#ecfdf5",
  fontWeight: "700",
  color: "#065f46",
  borderLeft: "3px solid #10b981",
};

// Returns the numeric value for a given field, or null if missing/not a number
const toNumber = (v) => {
  if (v === undefined || v === null || v === "") return null;
  const n = Number(v);
  return Number.isNaN(n) ? null : n;
};

// Given an array of numeric-or-null values and a direction ("higher" | "lower" | null),
// returns a Set of indices that count as "best". Ties are all marked best.
// Only marks a winner if at least 2 products have a real numeric value to compare.
const getBestIndices = (values, direction) => {
  if (!direction) return new Set();
  const numeric = values.map(toNumber);
  const validCount = numeric.filter((v) => v !== null).length;
  if (validCount < 2) return new Set();

  const target = direction === "higher"
    ? Math.max(...numeric.filter((v) => v !== null))
    : Math.min(...numeric.filter((v) => v !== null));

  const best = new Set();
  numeric.forEach((v, i) => {
    if (v !== null && v === target) best.add(i);
  });
  return best;
};

// Small dependency-free horizontal bar chart for one metric across products
function MetricBarChart({ label, unit, entries }) {
  const max = Math.max(...entries.map((e) => e.value), 0.0001);

  return (
    <div style={{ marginBottom: "18px" }}>
      <p style={{ margin: "0 0 8px 0", fontSize: "13px", fontWeight: "700", color: "#374151" }}>
        {label}
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
        {entries.map((e, i) => (
          <div key={e.name} style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span
              style={{
                width: "110px",
                fontSize: "12px",
                color: "#4b5563",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
              title={e.name}
            >
              {e.name}
            </span>
            <div style={{ flex: 1, background: "#f3f4f6", borderRadius: "4px", height: "18px", position: "relative" }}>
              <div
                style={{
                  width: `${(e.value / max) * 100}%`,
                  background: CHART_COLORS[i % CHART_COLORS.length],
                  height: "100%",
                  borderRadius: "4px",
                  transition: "width 0.3s ease",
                }}
              />
            </div>
            <span style={{ width: "70px", fontSize: "12px", color: "#374151", fontWeight: "600" }}>
              {e.value}{unit ? ` ${unit}` : ""}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

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

  // Precompute "best" indices for price and rating
  const priceBest = getBestIndices(products.map((p) => p.price), "lower");
  const ratingBest = getBestIndices(products.map((p) => p.averageRating), "higher");

  // Build chart data: one entry per numeric field (price + nutrition fields with a direction),
  // only included if at least 2 products actually have a value for it
  const chartMetrics = [
    { key: "price", label: "Price (৳)", unit: "৳", getValue: (p) => toNumber(p.price) },
    ...NUTRITION_ROWS.filter((r) => r.direction).map((r) => ({
      key: r.key,
      label: r.label,
      unit: "",
      getValue: (p) => toNumber(p.nutrition?.[r.key]),
    })),
  ]
    .map((metric) => {
      const entries = products
        .map((p) => ({ name: p.name, value: metric.getValue(p) }))
        .filter((e) => e.value !== null);
      return { ...metric, entries };
    })
    .filter((metric) => metric.entries.length >= 2);

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
        <>
          {chartMetrics.length > 0 && (
            <div
              style={{
                background: "#fff",
                borderRadius: "12px",
                border: "1px solid #e5e7eb",
                padding: "20px",
                marginBottom: "24px",
              }}
            >
              <h3 style={{ margin: "0 0 16px 0", fontSize: "16px", color: "#1B5E20" }}>
                Quick Visual Comparison
              </h3>
              {chartMetrics.map((metric) => (
                <MetricBarChart
                  key={metric.key}
                  label={metric.label}
                  unit={metric.unit}
                  entries={metric.entries}
                />
              ))}
            </div>
          )}

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
                  {products.map((p, i) => (
                    <td key={p._id} style={priceBest.has(i) ? bestCellStyle : cellStyle}>
                      <span style={{ fontSize: "18px", fontWeight: "700", color: priceBest.has(i) ? "#065f46" : "#2e7d32" }}>
                        ৳{p.price}
                      </span>
                      {p.unit && <span style={{ color: "#6b7280" }}> / {p.unit}</span>}
                      {priceBest.has(i) && <span style={{ marginLeft: "6px", fontSize: "12px" }}>✓ Best price</span>}
                    </td>
                  ))}
                </tr>

                <tr>
                  <td style={labelCellStyle}>Rating</td>
                  {products.map((p, i) => (
                    <td key={p._id} style={ratingBest.has(i) ? bestCellStyle : cellStyle}>
                      <span style={{ color: "#fbbf24" }}>
                        {"★".repeat(Math.round(p.averageRating || 0))}
                        {"☆".repeat(5 - Math.round(p.averageRating || 0))}
                      </span>{" "}
                      <span style={{ fontSize: "12px", color: "#6b7280" }}>
                        {p.averageRating?.toFixed(1) || "0.0"} ({p.totalReviews || 0})
                      </span>
                      {ratingBest.has(i) && <span style={{ marginLeft: "6px", fontSize: "12px" }}>✓ Top rated</span>}
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

                {NUTRITION_ROWS.map(({ key, label, direction }) => {
                  const values = products.map((p) => p.nutrition?.[key]);
                  const best = getBestIndices(values, direction);
                  return (
                    <tr key={key}>
                      <td style={labelCellStyle}>{label}</td>
                      {products.map((p, i) => (
                        <td key={p._id} style={best.has(i) ? bestCellStyle : cellStyle}>
                          {p.nutrition?.[key] || <span style={{ color: "#9ca3af" }}>—</span>}
                          {best.has(i) && <span style={{ marginLeft: "6px", fontSize: "12px" }}>✓</span>}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

export default ComparePage;