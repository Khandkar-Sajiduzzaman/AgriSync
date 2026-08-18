import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { CartProvider } from "./context/CartContext";
import { CompareProvider } from "./context/CompareContext";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <CartProvider>
        <CompareProvider>
          <App />
        </CompareProvider>
      </CartProvider>
    </BrowserRouter>
  </React.StrictMode>
);