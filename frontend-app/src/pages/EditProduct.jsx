import { useEffect, useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import ProductForm from "../components/product/ProductForm"
import { getProduct, updateProduct, uploadProductImage } from "../api/productApi"
import { toast } from "sonner"

function EditProduct() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [product, setProduct] = useState(null)

  useEffect(() => {
    loadProduct()
  }, [])

  const loadProduct = async () => {
    try {
      const data = await getProduct(id)
      setProduct(data)
    } catch (err) {
      toast.error("Failed to load product.")
    }
  }

  const handleUpdate = async (formData, image) => {
    try {
      await updateProduct(id, formData)
      if (image) {
        await uploadProductImage(id, image)
      }
      toast.success("Product updated successfully!")
      setTimeout(() => navigate("/products/my"), 1000)
    } catch (err) {
      toast.error("Failed to update product.")
    }
  }

  if (!product) return <p className="text-stone-500">Loading...</p>

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold text-agri-800">Edit Product</h1>
      <ProductForm
        initialData={product}
        onSubmit={handleUpdate}
        buttonText="Update Product"
      />
    </div>
  )
}

export default EditProduct