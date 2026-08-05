import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";

import ProductForm from "../components/ProductForm";

import {
  getProduct,
  updateProduct,
  uploadProductImage,
} from "../api/productApi";

function EditProduct() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [product, setProduct] = useState(null);
  const [status, setStatus] = useState("");

  useEffect(() => {
    loadProduct();
  }, []);

  const loadProduct = async () => {
    try {
      const data = await getProduct(id);
      setProduct(data);
    } catch (err) {
      setStatus("Failed to load product.");
    }
  };

  const handleUpdate = async (formData, image) => {
    try {
      await updateProduct(id, formData);

      if (image) {
        await uploadProductImage(id, image);
      }

      setStatus("✅ Product updated successfully!");

      setTimeout(() => {
        navigate("/products/my");
      }, 1000);
    } catch (err) {
      setStatus("❌ Failed to update product.");
    }
  };

  if (!product) return <p>Loading...</p>;

  return (
    <div
      style={{
        maxWidth: "600px",
        margin: "40px auto",
      }}
    >
      <h2>Edit Product</h2>

      <ProductForm
        initialData={product}
        onSubmit={handleUpdate}
        buttonText="Update Product"
      />

      {status && <p>{status}</p>}
    </div>
  );
}

export default EditProduct;