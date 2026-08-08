import { useState } from "react"
import { useNavigate } from "react-router-dom"
import ProductForm from "../components/product/ProductForm"
import { createProduct, uploadProductImage } from "../api/productApi"
import { toast } from "sonner"

function AddProduct() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)

  const handleAddProduct = async (formData, image) => {
    setLoading(true)
    try {
      const product = await createProduct(formData)
      if (image && product._id) {
        await uploadProductImage(product._id, image)
      }
      toast.success("Product added successfully!")
      setTimeout(() => navigate("/products/my"), 1000)
    } catch (error) {
      toast.error("Failed to add product.")
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold text-agri-800">Add New Product</h1>
      <ProductForm onSubmit={handleAddProduct} buttonText={loading ? "Adding..." : "Add Product"} />
    </div>
  )
}

export default AddProduct