import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import NutritionFields from "./NutritionFields"

function ProductForm({ onSubmit, initialData = {}, buttonText = "Add Product" }) {
  const [form, setForm] = useState({
    name: initialData.name || "",
    description: initialData.description || "",
    category: initialData.category || "",
    price: initialData.price || "",
    stock: initialData.stock || "",
    // ===== TRACEABILITY: Initialize origin fields from existing data =====
    origin: initialData.origin || "",
    originDetails: initialData.originDetails || "",
  })
  const [image, setImage] = useState(null)
  // nutritionInfo comes back from the API already parsed into an object (see shapeProduct)
  const [nutrition, setNutrition] = useState(initialData.nutritionInfo || {})

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (image && image.size > 2 * 1024 * 1024) {
      alert("Image must be smaller than 2MB")
      return
    }
    // ===== TRACEABILITY: Include origin and originDetails in the submitted data =====
    onSubmit({ ...form, nutritionInfo: nutrition }, image)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-lg">
      <div className="space-y-2">
        <Label htmlFor="name">Product Name</Label>
        <Input
          id="name"
          name="name"
          placeholder="Enter product name"
          value={form.name}
          onChange={handleChange}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          name="description"
          placeholder="Describe your product..."
          value={form.description}
          onChange={handleChange}
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="category">Category</Label>
        <Input
          id="category"
          name="category"
          placeholder="e.g. Vegetables, Fruits"
          value={form.category}
          onChange={handleChange}
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="price">Price (৳)</Label>
          <Input
            id="price"
            name="price"
            type="number"
            placeholder="0"
            value={form.price}
            onChange={handleChange}
            required
            min="0"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="stock">Stock</Label>
          <Input
            id="stock"
            name="stock"
            type="number"
            placeholder="0"
            value={form.stock}
            onChange={handleChange}
            min="0"
          />
        </div>
      </div>

      {/* ===== TRACEABILITY SECTION ===== */}
      <div className="space-y-3 border rounded-lg p-4 bg-amber-50/50 border-amber-200">
        <Label className="text-sm font-semibold text-amber-900">
          Product Traceability (optional)
        </Label>
        <p className="text-xs text-amber-700">
          Help buyers trust your product by sharing where it comes from and how it was produced.
        </p>

        <div className="space-y-2">
          <Label htmlFor="origin" className="text-xs">Origin / Source Location</Label>
          <Input
            id="origin"
            name="origin"
            placeholder="e.g. Rajshahi, Bangladesh"
            value={form.origin}
            onChange={handleChange}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="originDetails" className="text-xs">Production Details</Label>
          <Textarea
            id="originDetails"
            name="originDetails"
            placeholder="e.g. Harvested on August 15, 2026. Grown using organic compost. No chemical pesticides used."
            value={form.originDetails}
            onChange={handleChange}
            rows={3}
          />
        </div>
      </div>
      {/* ===== END TRACEABILITY SECTION ===== */}

      <NutritionFields value={nutrition} onChange={setNutrition} />

      <div className="space-y-2">
        <Label htmlFor="image">Product Image</Label>
        <Input
          id="image"
          type="file"
          accept="image/*"
          onChange={(e) => setImage(e.target.files[0])}
        />
      </div>

      <Button type="submit" className="w-full bg-agri-700 hover:bg-agri-800">
        {buttonText}
      </Button>
    </form>
  )
}

export default ProductForm