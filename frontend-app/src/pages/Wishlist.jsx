import { useEffect, useState } from "react"
import { getWishlist, getFollowedFarmers, toggleWishlist, toggleFollowFarmer } from "../api/userApi"
import ProductCard from "../components/product/ProductCard"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { UserX } from "lucide-react"

function Wishlist() {
  const [products, setProducts] = useState([])
  const [farmers, setFarmers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    load()
  }, [])

  const load = async () => {
    setLoading(true)
    const [wishlist, followed] = await Promise.all([
      getWishlist().catch(() => []),
      getFollowedFarmers().catch(() => []),
    ])
    setProducts(wishlist)
    setFarmers(followed)
    setLoading(false)
  }

  const handleRemove = async (productId) => {
    // Optimistic: remove from UI immediately
    setProducts((prev) => prev.filter((p) => p._id !== productId))
    toast.success("Removed from wishlist")
    try {
      await toggleWishlist(productId)
    } catch (err) {
      toast.error("Failed to remove. Refreshing...")
      load() // Revert by reloading on error
    }
  }

  const handleUnfollow = async (farmerId) => {
    await toggleFollowFarmer(farmerId)
    setFarmers((prev) => prev.filter((f) => f._id !== farmerId))
    toast.success("Unfollowed farmer")
  }

  if (loading) return <p className="text-stone-500 p-8">Loading...</p>

  return (
    <div className="space-y-8">
      <section>
        <h1 className="text-3xl font-bold text-agri-800 mb-4">My Wishlist</h1>
        {products.length === 0 ? (
          <p className="text-stone-500">No saved products yet.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
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
      </section>

      <section>
        <h1 className="text-3xl font-bold text-agri-800 mb-4">Favorite Farmers</h1>
        {farmers.length === 0 ? (
          <p className="text-stone-500">You're not following any farmers yet.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {farmers.map((farmer) => (
              <Card key={farmer._id}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="font-semibold">{farmer.name}</p>
                    <p className="text-sm text-stone-500">{farmer.email}</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => handleUnfollow(farmer._id)}>
                    <UserX className="w-4 h-4 mr-1" /> Unfollow
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

export default Wishlist