import { useEffect, useState } from "react"
import { getProducts, deleteProduct } from "../api/productApi"
import ProductCard from "../components/product/ProductCard"
import { toast } from "sonner"

function MyProducts() {
  const [products, setProducts] = useState([])
  const user = JSON.parse(localStorage.getItem("user"))

  useEffect(() => {
    loadProducts()
  }, [])

  const loadProducts = async () => {
    try {
      const data = await getProducts()
      const myProducts = data.filter(
        (product) => product.farmer && product.farmer._id === user._id
      )
      setProducts(myProducts)
    } catch (err) {
      toast.error("Failed to load products.")
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this product?")) return
    try {
      await deleteProduct(id)
      loadProducts()
      toast.success("Product deleted")
    } catch (err) {
      toast.error("Failed to delete product.")
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-agri-800">My Products</h1>

      {products.length === 0 ? (
        <p className="text-stone-500">No products found.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((product) => (
            <ProductCard
              key={product._id}
              product={product}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default MyProducts