import { Link, useLocation } from "react-router-dom";
import {
  FaLeaf,
  FaHome,
  FaUser,
  FaBoxOpen,
  FaPlusCircle,
  FaSearch,
  FaHeart,
  FaSignOutAlt,
  FaShoppingCart,
  FaClipboardList,
  FaCommentDots,
  FaTruck,
} from "react-icons/fa";

import "../../styles/navbar.css";
import { useCart } from "../../context/CartContext";

function Navbar({ onLogout }) {
  const location = useLocation();
  const user = JSON.parse(localStorage.getItem("user"));
  const role = user?.role;
  const { cartCount } = useCart();

  const active = (path) =>
    location.pathname === path ? "nav-link active" : "nav-link";

  return (
    <nav className="navbar">
      <div className="logo">
        <FaLeaf className="logo-icon" />
        <div>
          <h2>AgriSync</h2>
          <p>Fresh From Farmers</p>
        </div>
      </div>

      <div className="nav-links">
        <Link className={active("/")} to="/">
          <FaHome /> Dashboard
        </Link>

        <Link className={active("/profile")} to="/profile">
          <FaUser /> Profile
        </Link>

        {role === "farmer" && (
          <>
            <Link className={active("/products/add")} to="/products/add">
              <FaPlusCircle /> Add Product
            </Link>

            <Link className={active("/products/my")} to="/products/my">
              <FaBoxOpen /> My Products
            </Link>

            <Link className={active("/chat")} to="/chat">
              <FaCommentDots /> Messages
            </Link>

            <Link className={active("/orders")} to="/orders">
              <FaClipboardList /> Orders
            </Link>
          </>
        )}

        {role === "buyer" && (
          <>
            <Link className={active("/products/browse")} to="/products/browse">
              <FaSearch /> Browse
            </Link>

            <Link className={active("/chat")} to="/chat">
             <FaCommentDots /> Messages
            </Link>

            <Link className={active("/cart")} to="/cart" style={{ position: "relative" }}>
              <FaShoppingCart /> Cart
              {cartCount > 0 && (
                <span
                  style={{
                    position: "absolute",
                    top: "-6px",
                    right: "-10px",
                    background: "#e74c3c",
                    color: "white",
                    borderRadius: "50%",
                    padding: "2px 7px",
                    fontSize: "11px",
                    fontWeight: "bold",
                  }}
                >
                  {cartCount}
                </span>
              )}
            </Link>

            <Link className={active("/wishlist")} to="/wishlist">
              <FaHeart /> Wishlist
            </Link>

            <Link className={active("/orders")} to="/orders">
              <FaClipboardList /> My Orders
            </Link>
          </>
        )}

        {role === "delivery_man" && (
          <Link className={active("/delivery")} to="/delivery">
            <FaTruck /> My Deliveries
          </Link>
        )}

        <button
          className="logout-btn"
          onClick={onLogout}
          style={{
            background: "#c62828",
            color: "white",
            border: "none",
            padding: "10px 18px",
            borderRadius: "8px",
            cursor: "pointer",
            fontSize: "14px",
            fontWeight: "600",
            display: "flex",
            alignItems: "center",
            gap: "6px",
            transition: "background 0.2s",
          }}
          onMouseEnter={(e) => (e.target.style.background = "#b71c1c")}
          onMouseLeave={(e) => (e.target.style.background = "#c62828")}
        >
          <FaSignOutAlt /> Logout
        </button>
      </div>
    </nav>
  );
}

export default Navbar;