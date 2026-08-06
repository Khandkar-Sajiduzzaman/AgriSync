import { Link } from "react-router-dom";

function Dashboard() {
  const user = JSON.parse(localStorage.getItem("user"));
  const role = user?.role;

  return (
    <div style={{ maxWidth: "500px", margin: "50px auto", textAlign: "center" }}>
      <h1>AgriSync Dashboard</h1>

      <p>Welcome!</p>

      <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
        <Link to="/profile">
          <button style={{ width: "250px", height: "40px" }}>My Profile</button>
        </Link>

        {role === "farmer" && (
          <>
            <Link to="/products/add">
              <button style={{ width: "250px", height: "40px" }}>Add Product</button>
            </Link>

            <Link to="/products/my">
              <button style={{ width: "250px", height: "40px" }}>My Products</button>
            </Link>
          </>
        )}

        {role === "buyer" && (
  <>
    <Link to="/products/browse">
      <button style={{ width: "250px", height: "40px" }}>Browse Products</button>
    </Link>

    <Link to="/wishlist">
      <button style={{ width: "250px", height: "40px" }}>My Wishlist</button>
    </Link>
  </>
)}
      </div>
    </div>
  );
}

export default Dashboard;