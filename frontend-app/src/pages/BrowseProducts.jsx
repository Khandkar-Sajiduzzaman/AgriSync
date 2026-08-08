import { useState, useEffect } from "react"
import { getProducts } from "../api/productApi"
import { getWishlist, toggleWishlist } from "../api/userApi"
import ProductCard from "../components/product/ProductCard"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Search, RotateCcw } from "lucide-react"

function BrowseProducts() {
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [search, setSearch] = useState("")
  const [category, setCategory] = useState("")
  const [minPrice, setMinPrice] = useState("")
  const [maxPrice, setMaxPrice] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [wishlistIds, setWishlistIds] = useState([])

  const role = JSON.parse(localStorage.getItem("user"))?.role

  const fetchProducts = async (filters) => {
    setLoading(true)
    setError("")
    try {
      const data = await getProducts(filters)
      setProducts(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProducts({})
    getProducts().then((all) => {
      const cats = all
        .map((p) => p.category || p.legacyCategory)
        .filter((c) => c && c.trim() !== "")
      setCategories([...new Set(cats)])
    }).catch(() => {})

    if (role === "buyer") {
      getWishlist()
        .then((items) => setWishlistIds(items.map((p) => p._id)))
        .catch(() => {})
    }
  }, [])

  const handleSubmit = (e) => {
    e.preventDefault()
    fetchProducts({ search, category, minPrice, maxPrice })
  }

  const handleReset = () => {
    setSearch("")
    setCategory("")
    setMinPrice("")
    setMaxPrice("")
    fetchProducts({})
  }

  const handleToggleWishlist = async (productId) => {
    try {
      await toggleWishlist(productId)
      setWishlistIds((prev) =>
        prev.includes(productId) ? prev.filter((id) => id !== productId) : [...prev, productId]
      )
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-agri-800">Browse Products</h1>

      <form
        onSubmit={handleSubmit}
        className="relative z-10 flex flex-wrap gap-3 items-end bg-white p-4 rounded-xl shadow-sm border border-stone-200"
      >
        <div className="flex-1 min-w-[200px]">
          <Input
            type="text"
            placeholder="Search by name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All categories</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Input
          type="number"
          placeholder="Min price"
          value={minPrice}
          onChange={(e) => setMinPrice(e.target.value)}
          className="w-[120px]"
          min="0"
        />

        <Input
          type="number"
          placeholder="Max price"
          value={maxPrice}
          onChange={(e) => setMaxPrice(e.target.value)}
          className="w-[120px]"
          min="0"
        />

        <Button type="submit">
          <Search className="w-4 h-4 mr-1" /> Search
        </Button>
        <Button type="button" variant="outline" onClick={handleReset}>
          <RotateCcw className="w-4 h-4 mr-1" /> Reset
        </Button>
      </form>

      {loading && <p className="text-stone-500">Loading products...</p>}
      {error && <p className="text-red-600">{error}</p>}

      {!loading && !error && products.length === 0 && (
        <p className="text-stone-500">No products match your filters.</p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {products.map((product) => (
          <ProductCard
            key={product._id}
            product={product}
            showActions={false}
            isWishlisted={wishlistIds.includes(product._id)}
            onToggleWishlist={role === "buyer" ? handleToggleWishlist : undefined}
          />
        ))}
      </div>
    </div>
  )
}

export default BrowseProducts