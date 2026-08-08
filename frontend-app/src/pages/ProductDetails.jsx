import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getProduct } from "../api/productApi";
import { getWishlist, toggleWishlist, getFollowedFarmers, toggleFollowFarmer } from "../api/userApi";

function ProductDetails() {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);

  const role = JSON.parse(localStorage.getItem("user"))?.role;

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Fetch product first because we need the farmer ID
      const productData = await getProduct(id);
      setProduct(productData);

      if (role === "buyer") {
        // Then fetch BOTH wishlist and following at the same time
        const [wishlist, following] = await Promise.all([
          getWishlist().catch(() => []),
          getFollowedFarmers().catch(() => [])
        ]);

        setIsWishlisted(wishlist.some((p) => p._id === id));
        setIsFollowing(following.some((f) => f._id === productData.farmer?._id));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleWishlist = async () => {
    const nextState = !isWishlisted;
    setIsWishlisted(nextState); // Optimistic
    try {
      await toggleWishlist(id);
    } catch (err) {
      setIsWishlisted(!nextState); // Revert on error
    }
  };

  const handleToggleFollow = async () => {
    if (!product?.farmer?._id) return;
    const nextState = !isFollowing;
    setIsFollowing(nextState); // Optimistic
    try {
      await toggleFollowFarmer(product.farmer._id);
    } catch (err) {
      setIsFollowing(!nextState); // Revert on error
    }
  };

  if (loading) return <p>Loading product...</p>;
  if (!product) return <p>Product not found.</p>;

  return (
    <div style={{ maxWidth: "700px", margin: "40px auto", padding: "0 20px" }}>
      <h2>{product.name}</h2>

      {product.images?.length > 0 && (
        <img
          src={`http://localhost:5000${product.images[0]}`}
          alt={product.name}
          width="300"
          style={{ borderRadius: "12px", objectFit: "cover" }}
        />
      )}

      <p><strong>Description:</strong> {product.description || "No description"}</p>
      <p><strong>Category:</strong> {product.legacyCategory || product.category}</p>
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