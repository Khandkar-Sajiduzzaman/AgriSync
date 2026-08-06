import { useEffect, useState } from "react";
import { getWishlist, getFollowedFarmers, toggleWishlist, toggleFollowFarmer } from "../api/userApi";
import ProductCard from "../components/product/ProductCard";

function Wishlist() {
  const [products, setProducts] = useState([]);
  const [farmers, setFarmers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    const [wishlist, followed] = await Promise.all([
      getWishlist().catch(() => []),
      getFollowedFarmers().catch(() => []),
    ]);
    setProducts(wishlist);
    setFarmers(followed);
    setLoading(false);
  };

  const handleRemove = async (productId) => {
    await toggleWishlist(productId);
    setProducts((prev) => prev.filter((p) => p._id !== productId));
  };

  const handleUnfollow = async (farmerId) => {
    await toggleFollowFarmer(farmerId);
    setFarmers((prev) => prev.filter((f) => f._id !== farmerId));
  };

  if (loading) return <p>Loading...</p>;

  return (
    <div style={{ maxWidth: "1000px", margin: "40px auto", padding: "0 20px" }}>
      <h1>My Wishlist</h1>

      {products.length === 0 ? (
        <p>No saved products yet.</p>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
            gap: "20px",
            marginBottom: "40px",
          }}
        >
          {products.map((product) => (
            <ProductCard
              key={product._id}
              product={product}
              showActions={false}
              isWishlisted={true}
              onToggleWishlist={handleRemove}
            />
          ))}
        </div>
      )}

      <h1>Favorite Farmers</h1>

      {farmers.length === 0 ? (
        <p>You're not following any farmers yet.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {farmers.map((farmer) => (
            <div
              key={farmer._id}
              style={{
                border: "1px solid #ddd",
                borderRadius: "8px",
                padding: "12px 16px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div>
                <strong>{farmer.name}</strong>
                <p style={{ margin: 0, fontSize: "14px", color: "#666" }}>{farmer.email}</p>
              </div>
              <button onClick={() => handleUnfollow(farmer._id)}>Unfollow</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Wishlist;