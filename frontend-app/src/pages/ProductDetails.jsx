import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { getProduct } from "../api/productApi";
import { getWishlist, toggleWishlist, getFollowedFarmers, toggleFollowFarmer } from "../api/userApi";
import { addToCart } from "../api/cartApi";
import { useCart } from "../context/CartContext";

function ProductDetails() {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [adding, setAdding] = useState(false);
  const [cartMsg, setCartMsg] = useState("");
  const { refreshCart } = useCart();

  const role = JSON.parse(localStorage.getItem("user") || "{}")?.role;

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

  const handleAddToCart = async () => {
    setAdding(true);
    setCartMsg("");
    try {
      await addToCart(product._id, quantity);
      setCartMsg("Added to cart!");
      refreshCart();
      setTimeout(() => setCartMsg(""), 2000);
    } catch (err) {
      setCartMsg(err.message);
    } finally {
      setAdding(false);
    }
  };

  if (!product) return <p>Loading...</p>;

  return (
    <div style={{ maxWidth: "700px", margin: "40px auto", padding: "0 20px" }}>
      <h2>{product.name}</h2>

      {product.images.length > 0 && (
        <img
          src={`http://localhost:5000${product.images[0]}`}
          alt={product.name}
          width="300"
          style={{ borderRadius: "10px" }}
        />
      )}

      <p><strong>Description:</strong> {product.description}</p>
      <p><strong>Category:</strong> {product.category || product.legacyCategory}</p>
      <p><strong>Price:</strong> ৳{product.price} / {product.unit}</p>
      <p><strong>Stock:</strong> {product.stock} {product.unit}</p>
      <p><strong>Farmer:</strong> {product.farmer?.name}</p>
      <p><strong>Email:</strong> {product.farmer?.email}</p>

      {role === "buyer" && (
        <div style={{ marginTop: "20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "15px" }}>
            <label><strong>Quantity:</strong></label>
            <input
              type="number"
              min="1"
              max={product.stock}
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, Math.min(product.stock, parseInt(e.target.value) || 1)))}
              style={{ width: "60px", padding: "5px" }}
            />
            <span>{product.unit}</span>
          </div>

          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <button
              onClick={handleAddToCart}
              disabled={adding || product.stock < 1}
              style={{
                backgroundColor: product.stock < 1 ? "#ccc" : "#27ae60",
                color: "white",
                border: "none",
                padding: "10px 20px",
                cursor: product.stock < 1 ? "not-allowed" : "pointer",
                borderRadius: "5px",
                fontSize: "16px",
              }}
            >
              {adding ? "Adding..." : product.stock < 1 ? "Out of Stock" : "Add to Cart"}
            </button>

            <button onClick={handleToggleWishlist}>
              {isWishlisted ? "♥ Saved" : "♡ Save to Wishlist"}
            </button>

            <button onClick={handleToggleFollow}>
              {isFollowing ? "Following ✓" : "Follow Farmer"}
            </button>
          </div>

          {cartMsg && (
            <p style={{ marginTop: "10px", color: cartMsg.includes("Added") ? "green" : "red" }}>
              {cartMsg}
            </p>
          )}

          <div style={{ marginTop: "15px" }}>
            <Link to="/cart">
              <button style={{ background: "#3498db", color: "white", border: "none", padding: "8px 16px", borderRadius: "5px" }}>
                Go to Cart →
              </button>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

export default ProductDetails;