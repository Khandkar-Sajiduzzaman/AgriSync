import { useState, useEffect } from "react";
import {
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

import AuthForm from "./components/AuthForm";

import Dashboard from "./pages/Dashboard";
import ProfilePage from "./pages/ProfilePage";
import AddProduct from "./pages/AddProduct";
import MyProducts from "./pages/MyProducts";
import EditProduct from "./pages/EditProduct";
import ProductDetails from "./pages/ProductDetails";

function App() {
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    if (localStorage.getItem("token")) {
      setLoggedIn(true);
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setLoggedIn(false);
  };

  if (!loggedIn) {
    return (
      <AuthForm
        onAuthSuccess={() => setLoggedIn(true)}
      />
    );
  }

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          padding: "20px",
        }}
      >
        <button onClick={handleLogout}>Logout</button>
      </div>

      <Routes>
        <Route path="/" element={<Dashboard />} />

        <Route path="/profile" element={<ProfilePage />} />

        <Route path="/products/add" element={<AddProduct />} />

        <Route path="/products/my" element={<MyProducts />} />

        <Route path="/products/:id" element={<ProductDetails />} />

        <Route
          path="/products/:id/edit"
          element={<EditProduct />}
        />

        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </div>
  );
}

export default App;