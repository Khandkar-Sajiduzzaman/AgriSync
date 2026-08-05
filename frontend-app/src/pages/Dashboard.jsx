import { Link } from "react-router-dom";

function Dashboard() {
  return (
    <div
      style={{
        maxWidth: "500px",
        margin: "50px auto",
        textAlign: "center",
      }}
    >
      <h1>AgriSync Dashboard</h1>

      <p>Welcome!</p>

      <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>

        <Link to="/profile">
          <button style={{ width: "250px", height: "40px" }}>
            My Profile
          </button>
        </Link>

        <Link to="/products/add">
          <button style={{ width: "250px", height: "40px" }}>
            Add Product
          </button>
        </Link>

        <Link to="/products/my">
          <button style={{ width: "250px", height: "40px" }}>
            My Products
          </button>
        </Link>

      </div>
    </div>
  );
}

export default Dashboard;