import { Link } from "react-router-dom";

function ProductCard({
  product,
  onDelete,
  showActions = true,
  isWishlisted,
  onToggleWishlist,
}) {
  return (
    <div
      style={{
        border: "1px solid #ddd",
        borderRadius: "10px",
        padding: "20px",
        marginBottom: "20px",
        boxShadow: "0 2px 5px rgba(0,0,0,0.1)",
      }}
    >
      {product.images && product.images.length > 0 ? (
        <img
          src={`http://localhost:5000${product.images[0]}`}
          alt={product.name}
          style={{ width: "200px", height: "150px", objectFit: "cover", borderRadius: "8px" }}
        />
      ) : (
        <div
          style={{
            width: "200px",
            height: "150px",
            background: "#eee",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: "8px",
          }}
        >
          No Image
        </div>
      )}

      <h3>{product.name}</h3>

      <p><strong>Category:</strong> {product.category || product.legacyCategory || 'Uncategorized'}</p>
      <p><strong>Price:</strong> ৳{product.price}</p>
      <p><strong>Stock:</strong> {product.stock}</p>

      <div style={{ display: "flex", gap: "10px", marginTop: "15px" }}>
        <Link to={`/products/${product._id}`}>
          <button>View</button>
        </Link>

        {showActions && (
          <>
            <Link to={`/products/${product._id}/edit`}>
              <button>Edit</button>
            </Link>

            <button
              onClick={() => onDelete(product._id)}
              style={{
                backgroundColor: "#d9534f",
                color: "white",
                border: "none",
                padding: "8px 12px",
                cursor: "pointer",
                borderRadius: "5px",
              }}
            >
              Delete
            </button>
          </>
        )}

        {onToggleWishlist && (
          <button onClick={() => onToggleWishlist(product._id)}>
            {isWishlisted ? "♥ Saved" : "♡ Save"}
          </button>
        )}
      </div>
    </div>
  );
}

export default ProductCard;