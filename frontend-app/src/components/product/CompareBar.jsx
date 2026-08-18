import { useNavigate } from "react-router-dom";
import { useCompare } from "../../context/CompareContext";

function CompareBar() {
  const { compareIds, clearCompare, maxCompare } = useCompare();
  const navigate = useNavigate();

  if (compareIds.length === 0) return null;

  return (
    <div
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        background: "#1b5e20",
        color: "white",
        padding: "14px 24px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "16px",
        boxShadow: "0 -2px 10px rgba(0,0,0,0.2)",
        zIndex: 1000,
      }}
    >
      <span style={{ fontSize: "14px" }}>
        <strong>{compareIds.length}</strong> / {maxCompare} products selected for comparison
      </span>

      <button
        onClick={() => navigate("/compare")}
        disabled={compareIds.length < 2}
        style={{
          padding: "8px 18px",
          borderRadius: "6px",
          border: "none",
          cursor: compareIds.length < 2 ? "not-allowed" : "pointer",
          background: compareIds.length < 2 ? "#4caf50aa" : "#fff",
          color: compareIds.length < 2 ? "#eee" : "#1b5e20",
          fontWeight: "600",
          fontSize: "14px",
        }}
        title={compareIds.length < 2 ? "Select at least 2 products" : "Compare selected products"}
      >
        Compare
      </button>

      <button
        onClick={clearCompare}
        style={{
          padding: "8px 14px",
          borderRadius: "6px",
          border: "1px solid rgba(255,255,255,0.6)",
          background: "transparent",
          color: "white",
          cursor: "pointer",
          fontSize: "14px",
        }}
      >
        Clear
      </button>
    </div>
  );
}

export default CompareBar;