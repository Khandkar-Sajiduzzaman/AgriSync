import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

import { getProduct } from "../api/productApi";

function ProductDetails() {
  const { id } = useParams();

  const [product, setProduct] = useState(null);

  useEffect(() => {
    loadProduct();
  }, []);

  const loadProduct = async () => {
    const data = await getProduct(id);
    setProduct(data);
  };

  if (!product) return <p>Loading...</p>;

  return (
    <div
      style={{
        maxWidth: "700px",
        margin: "40px auto",
      }}
    >
      <h2>{product.name}</h2>

      {product.images.length > 0 && (
        <img
          src={`http://localhost:5000${product.images[0]}`}
          alt={product.name}
          width="300"
        />
      )}

      <p>
        <strong>Description:</strong> {product.description}
      </p>

      <p>
        <strong>Category:</strong> {product.category}
      </p>

      <p>
        <strong>Price:</strong> ৳{product.price}
      </p>

      <p>
        <strong>Stock:</strong> {product.stock}
      </p>

      <p>
        <strong>Farmer:</strong> {product.farmer?.name}
      </p>

      <p>
        <strong>Email:</strong> {product.farmer?.email}
      </p>
    </div>
  );
}

export default ProductDetails;