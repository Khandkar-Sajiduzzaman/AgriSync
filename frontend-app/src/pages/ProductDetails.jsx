import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

import { getProduct } from "../api/productApi";
import { getWishlist, toggleWishlist, getFollowedFarmers, toggleFollowFarmer } from "../api/userApi";

function ProductDetails() {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);

  const role = JSON.parse(localStorage.getItem("user"))?.role;

  useEffect(() => {
    loadProduct();
  }, []);

  const loadProduct = async () => {
    const data = await getProduct(id);
    setProduct(data);

    if (role === "buyer") {
      const wishlist = await getWishlist().catch(() => []);
      setIsWishlisted(wishlist.some((p) => p._id === id));

      const following = await getFollowedFarmers().catch(() => []);
      setIsFollowing(following.some((f) => f._id === data.farmer?._id));
    }
  };

  const handleToggleWishlist = async () => {
    await toggleWishlist(id);
    setIsWishlisted((prev) => !prev);
  };

  const handleToggleFollow = async () => {
    await toggleFollowFarmer(product.farmer._id);
    setIsFollowing((prev) => !prev);
  };

  if (!product) return <p>Loading...</p>;

  return (
    <div style={{ maxWidth: "700px", margin: "40px auto" }}>
      <h2>{product.name}</h2>

      {product.images.length > 0 && (
        <img src={`http://localhost:5000${product.images[0]}`} alt={product.name} width="300" />
      )}

      <p><strong>Description:</strong> {product.description}</p>
      <p><strong>Category:</strong> {product.category}</p>
      <p><strong>Price:</strong> ৳{product.price}</p>
      <p><strong>Stock:</strong> {product.stock}</p>
      <p><strong>Farmer:</strong> {product.farmer?.name}</p>
      <p><strong>Email:</strong> {product.farmer?.email}</p>

      {role === "buyer" && (
        <div style={{ display: "flex", gap: "10px", marginTop: "15px" }}>
          <button onClick={handleToggleWishlist}>
            {isWishlisted ? "♥ Saved" : "♡ Save"}
          </button>

          <button onClick={handleToggleFollow}>
            {isFollowing ? "Following ✓" : "Follow Farmer"}
          </button>
        </div>
      )}
    </div>
  );
}

export default ProductDetails;