import { useState } from "react";
import { useNavigate } from "react-router-dom";

import ProductForm from "../components/ProductForm";
import {
  createProduct,
  uploadProductImage,
} from "../api/productApi";

function AddProduct() {
  const navigate = useNavigate();

  const [status, setStatus] = useState("");

  const handleAddProduct = async (formData, image) => {
    try {
      // Create the product first
      const product = await createProduct(formData);

      // If an image was selected, upload it
      if (image && product._id) {
        await uploadProductImage(product._id, image);
      }

      setStatus("✅ Product added successfully!");

      // Wait a moment before going to My Products
      setTimeout(() => {
        navigate("/products/my");
      }, 1000);

    } catch (error) {
      setStatus("❌ Failed to add product.");
      console.error(error);
    }
  };

  return (
    <div
      style={{
        maxWidth: "600px",
        margin: "40px auto",
      }}
    >
      <h2>Add New Product</h2>

      <ProductForm
        onSubmit={handleAddProduct}
        buttonText="Add Product"
      />

      {status && (
        <p style={{ marginTop: "20px" }}>
          {status}
        </p>
      )}
    </div>
  );
}

export default AddProduct;