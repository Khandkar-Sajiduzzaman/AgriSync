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
} from "react-icons/fa";

import "../../styles/navbar.css";

function Navbar({ onLogout }) {
  const location = useLocation();
  const user = JSON.parse(localStorage.getItem("user"));
  const role = user?.role;

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
          </>
        )}
        {role === "buyer" && (
  <>
    <Link className={active("/products/browse")} to="/products/browse">
      <FaSearch /> Browse Products
    </Link>

    <Link className={active("/wishlist")} to="/wishlist">
      <FaHeart /> Wishlist
    </Link>
  </>
)}

        <button className="logout-btn" onClick={onLogout}>
          <FaSignOutAlt /> Logout
        </button>
      </div>
    </nav>
  );
}

export default Navbar;