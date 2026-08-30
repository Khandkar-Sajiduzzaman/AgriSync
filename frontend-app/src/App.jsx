import { useState, useEffect } from "react";
import { updateDeliveryLocation } from "./api/orderApi";
import { toggleAvailability } from "./api/deliveryApi";
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
import ComparePage from "./pages/ComparePage";
import ReviewModeration from "./pages/ReviewModeration";
// NEW PAGES for Place Order feature
import CartPage from "./pages/CartPage";
import CheckoutPage from "./pages/CheckoutPage";
import OrdersPage from "./pages/OrdersPage";
import OrderDetailPage from "./pages/OrderDetailPage";


// Negotiations page
import NegotiationsPage from "./pages/NegotiationsPage";

//Chat
import ChatPage from "./pages/ChatPage";

// DeliveryDashboard
import DeliveryDashboard from "./pages/DeliveryDashboard";
import DeliveryZones from "./pages/DeliveryZones";
import DeliveryZonesPublic from "./pages/DeliveryZonesPublic";
import InventoryManagement from "./pages/InventoryManagement";
import InventoryRequestPage from "./pages/InventoryRequestPage";

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

  // Delivery Man: keep sending GPS location on ALL pages while logged in
  useEffect(() => {
    if (!loggedIn || role !== "delivery_man") return;
    if (localStorage.getItem("locationSharingEnabled") !== "true") return;

    const sendLocation = async (position) => {
      try {
        await updateDeliveryLocation(position.coords.latitude, position.coords.longitude);
      } catch (err) {
        console.log("Location update failed:", err.message);
      }
    };

    // Send once immediately
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(sendLocation, (err) => {
        console.log("Geolocation error:", err.message);
      });
    }

    // Then every 10 seconds
    const intervalId = setInterval(() => {
      if (localStorage.getItem("locationSharingEnabled") !== "true") return;
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(sendLocation, (err) => {
          console.log("Interval geolocation error:", err.message);
        });
      }
    }, 10000);

    return () => clearInterval(intervalId);
  }, [loggedIn, role]);

  const handleLogout = async () => {
    // If delivery man: stop location sharing and mark unavailable in database
    if (role === "delivery_man") {
      localStorage.removeItem("locationSharingEnabled");
      try {
        await toggleAvailability(false);
      } catch (err) {
        console.log("Failed to mark unavailable on logout:", err.message);
      }
    }
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

        {/* Product Comparison (Buyer only) */}
        <Route
          path="/compare"
          element={role === "buyer" ? <ComparePage /> : <Navigate to="/" replace />}
        />
        {/* Admin: Review Moderation */}
        <Route
          path="/review-moderation"
          element={role === "admin" ? <ReviewModeration /> : <Navigate to="/" replace />}
        />
        {/* Profile */}
        <Route path="/profile" element={<ProfilePage />} />

        {/* Chat (Available to logged-in users) */}
        <Route path="/chat" element={<ChatPage />} />

        {/* Farmer Only */}
        <Route
          path="/products/add"
          element={role === "farmer" ? <AddProduct /> : <Navigate to="/" replace />}
        />

        {/* Farmer Products */}
        <Route path="/products/my" element={<MyProducts />} />

        {/* Farmer Inventory Requests */}
        <Route
          path="/inventory/requests"
          element={role === "farmer" ? <InventoryRequestPage /> : <Navigate to="/" replace />}
        />

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

        {/* Orders (Buyer + Farmer only. Delivery men use /delivery instead) */}
        <Route
          path="/orders"
          element={role === "buyer" || role === "farmer" ? <OrdersPage /> : <Navigate to="/delivery" replace />}
        />

        {/* Order Detail (Buyer + Farmer + Delivery Man) */}
        <Route
          path="/orders/:id"
          element={role === "buyer" || role === "farmer" || role === "delivery_man" ? <OrderDetailPage /> : <Navigate to="/" replace />}
        />
        {/* Negotiations (Buyer + Farmer only) */}
        <Route
          path="/negotiations"
          element={role === "buyer" || role === "farmer" ? <NegotiationsPage /> : <Navigate to="/" replace />}
        />
        {/* Delivery Man Dashboard */}
        <Route
          path="/delivery"
          element={role === "delivery_man" ? <DeliveryDashboard /> : <Navigate to="/" replace />}
        />

        {/* Farmer: Delivery Zones management */}
        <Route
          path="/farmer/delivery-zones"
          element={role === "farmer" ? <DeliveryZones /> : <Navigate to="/" replace />}
        />

        {/* Public/Buyer: View delivery zones */}
        <Route
          path="/delivery-zones"
          element={<DeliveryZonesPublic />}
        />

        {/* Admin Inventory Management */}
        <Route
          path="/inventory-management"
          element={role === "admin" ? <InventoryManagement /> : <Navigate to="/" replace />}
        />
      </Route>
      {/* Unknown Routes */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;