import { useState, useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import AuthForm from "./components/user/AuthForm";
import MainLayout from "./layouts/MainLayout";

import Dashboard from "./pages/Dashboard";
import ProfilePage from "./pages/ProfilePage";
import AddProduct from "./pages/AddProduct";
import MyProducts from "./pages/MyProducts";
import EditProduct from "./pages/EditProduct";
import ProductDetails from "./pages/ProductDetails";
import BrowseProducts from "./pages/BrowseProducts";
import Wishlist from "./pages/Wishlist";

// NEW PAGES for Place Order feature
import CartPage from "./pages/CartPage";
import CheckoutPage from "./pages/CheckoutPage";
import OrdersPage from "./pages/OrdersPage";
import OrderDetailPage from "./pages/OrderDetailPage";

function App() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [role, setRole] = useState(null);

  useEffect(() => {
    if (localStorage.getItem("token")) {
      setLoggedIn(true);
      const user = JSON.parse(localStorage.getItem("user"));
      setRole(user?.role);
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setLoggedIn(false);
    setRole(null);
  };

  const handleAuthSuccess = (data) => {
    setLoggedIn(true);
    setRole(data?.role);
    if (data?.user) {
      localStorage.setItem("user", JSON.stringify(data.user));
    }
  };

  if (!loggedIn) {
    return <AuthForm onAuthSuccess={handleAuthSuccess} />;
  }

  return (
    <Routes>
      <Route element={<MainLayout onLogout={handleLogout} />}>
        {/* Dashboard */}
        <Route path="/" element={<Dashboard />} />

        {/* Browse Products */}
        <Route path="/products/browse" element={<BrowseProducts />} />

        {/* Profile */}
        <Route path="/profile" element={<ProfilePage />} />

        {/* Farmer Only */}
        <Route
          path="/products/add"
          element={role === "farmer" ? <AddProduct /> : <Navigate to="/" replace />}
        />

        {/* Farmer Products */}
        <Route path="/products/my" element={<MyProducts />} />

        {/* Edit Product */}
        <Route path="/products/:id/edit" element={<EditProduct />} />

        {/* Product Details */}
        <Route path="/products/:id" element={<ProductDetails />} />

        {/* Buyer Wishlist */}
        <Route
          path="/wishlist"
          element={role === "buyer" ? <Wishlist /> : <Navigate to="/" replace />}
        />

        {/* NEW: Cart (Buyer only) */}
        <Route
          path="/cart"
          element={role === "buyer" ? <CartPage /> : <Navigate to="/" replace />}
        />

        {/* NEW: Checkout (Buyer only) */}
        <Route
          path="/checkout"
          element={role === "buyer" ? <CheckoutPage /> : <Navigate to="/" replace />}
        />

        {/* NEW: Orders (Buyer + Farmer) */}
        <Route
          path="/orders"
          element={role === "buyer" || role === "farmer" ? <OrdersPage /> : <Navigate to="/" replace />}
        />

        {/* NEW: Order Detail (Buyer + Farmer) */}
        <Route
          path="/orders/:id"
          element={role === "buyer" || role === "farmer" ? <OrderDetailPage /> : <Navigate to="/" replace />}
        />
      </Route>

      {/* Unknown Routes */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;