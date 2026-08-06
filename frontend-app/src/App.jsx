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
  };

  if (!loggedIn) {
    return <AuthForm onAuthSuccess={handleAuthSuccess} />;
  }

  return (
    <Routes>
      <Route element={<MainLayout onLogout={handleLogout} />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/products/browse" element={<BrowseProducts />} />
        <Route path="/profile" element={<ProfilePage />} />

        <Route
          path="/products/add"
          element={
            role === "farmer" ? <AddProduct /> : <Navigate to="/" replace />
          }
        />

        <Route path="/products/my" element={<MyProducts />} />

        <Route path="/products/:id/edit" element={<EditProduct />} />

        <Route path="/products/:id" element={<ProductDetails />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
      <Route
             path="/wishlist"
            element={role === "buyer" ? <Wishlist /> : <Navigate to="/" replace />}/>
    </Routes>
  );
}

export default App;