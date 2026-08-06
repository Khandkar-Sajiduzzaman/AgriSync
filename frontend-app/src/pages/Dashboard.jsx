import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { getProducts } from "../api/productApi";
import ProductCard from "../components/product/ProductCard";

import "../styles/dashboard.css";

function Dashboard() {
  const user = JSON.parse(localStorage.getItem("user"));
  const role = user?.role;

  const [products, setProducts] = useState([]);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      const data = await getProducts();

      // Display only first 6 products
      setProducts(data.slice(0, 6));
    } catch (err) {
      console.log(err);
    }
  };

  return (
    <div className="dashboard">
      {/* Hero Section */}
      <div className="hero">
        <h1>
          Welcome back, {user?.name || "User"} 👋
        </h1>

        <p>
          Fresh vegetables, fruits and farm products delivered directly from
          trusted local farmers.
        </p>

        {role === "buyer" && (
          <Link to="/products/browse">
            <button>Browse Products</button>
          </Link>
        )}
      </div>

      {/* Featured Products */}
      <h2 className="section-title">Featured Products</h2>

      {products.length === 0 ? (
        <div className="empty-products">
          <h3>No Products Available</h3>
        </div>
      ) : (
        <div className="products-grid">
          {products.map((product) => (
            <ProductCard
              key={product._id}
              product={product}
              showActions={false}
            />
          ))}
        </div>
      )}

      {/* Delivery + Chat */}
      <div className="dashboard-bottom">
        <div className="placeholder-card">
          <h3>🚚 Delivery Zones</h3>

          <div className="placeholder-box">
            <span>🗺️</span>

            <h4>Coming Soon</h4>

            <p>
              Farmers will soon be able to define delivery zones and buyers
              will see whether delivery is available in their area.
            </p>
          </div>
        </div>

        <div className="chat-card">
          <h3>💬 AgriSync Support</h3>

          <div className="chat-message">
            Hello there! 👋
            <br />
            <br />
            Buyer–Farmer live chat will be available in Sprint 3.
            <br />
            <br />
            Stay tuned!
          </div>

          <button className="chat-button">
            Coming Soon
          </button>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="quick-actions">
        <h2>Quick Actions</h2>

        <div className="action-buttons">
          <Link to="/profile">
            <button>My Profile</button>
          </Link>

          {role === "buyer" && (
            <>
              <Link to="/products/browse">
                <button>Browse Products</button>
              </Link>

              <Link to="/wishlist">
                <button>Wishlist</button>
              </Link>
            </>
          )}

          {role === "farmer" && (
            <>
              <Link to="/products/add">
                <button>Add Product</button>
              </Link>

              <Link to="/products/my">
                <button>My Products</button>
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default Dashboard;