import { useEffect, useState } from "react"
import { useParams } from "react-router-dom"
import { getProduct } from "../api/productApi"
import { getWishlist, toggleWishlist, getFollowedFarmers, toggleFollowFarmer } from "../api/userApi"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Heart, UserPlus, Mail, Package, Tag } from "lucide-react"
import { toast } from "sonner"

function ProductDetails() {
  const { id } = useParams()
  const [product, setProduct] = useState(null)
  const [isWishlisted, setIsWishlisted] = useState(false)
  const [isFollowing, setIsFollowing] = useState(false)

  const role = JSON.parse(localStorage.getItem("user"))?.role

  useEffect(() => {
    loadProduct()
  }, [])

  const loadProduct = async () => {
    const data = await getProduct(id)
    setProduct(data)

    if (role === "buyer") {
      const wishlist = await getWishlist().catch(() => [])
      setIsWishlisted(wishlist.some((p) => p._id === id))

      const following = await getFollowedFarmers().catch(() => [])
      setIsFollowing(following.some((f) => f._id === data.farmer?._id))
    }
  }

  const handleToggleWishlist = async () => {
    await toggleWishlist(id)
    setIsWishlisted((prev) => !prev)
    toast.success(isWishlisted ? "Removed from wishlist" : "Added to wishlist")
  }

  const handleToggleFollow = async () => {
    await toggleFollowFarmer(product.farmer._id)
    setIsFollowing((prev) => !prev)
    toast.success(isFollowing ? "Unfollowed farmer" : "Now following farmer")
  }

  if (!product) return <p className="text-stone-500 p-8">Loading...</p>

  return (
    <div className="max-w-4xl mx-auto">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="aspect-square bg-stone-100 rounded-xl overflow-hidden">
          {product.images?.length > 0 ? (
            <img
              src={`http://localhost:5000${product.images[0]}`}
              alt={product.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-stone-400">
              No Image
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div>
            <Badge className="mb-2 bg-agri-100 text-agri-800 hover:bg-agri-200">
              <Tag className="w-3 h-3 mr-1" />
              {product.category}
            </Badge>
            <h1 className="text-3xl font-bold text-agri-900">{product.name}</h1>
            <p className="text-2xl font-semibold text-agri-700 mt-1">৳{product.price}</p>
          </div>

          <p className="text-stone-600 leading-relaxed">{product.description}</p>

          <div className="flex items-center gap-2 text-stone-600">
            <Package className="w-4 h-4" />
            <span>{product.stock} in stock</span>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-stone-500">Farmer</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="font-semibold">{product.farmer?.name}</p>
              <p className="text-sm text-stone-500 flex items-center gap-2">
                <Mail className="w-4 h-4" /> {product.farmer?.email}
              </p>
            </CardContent>
          </Card>

          {role === "buyer" && (
            <div className="flex gap-3">
              <Button
                variant={isWishlisted ? "default" : "outline"}
                onClick={handleToggleWishlist}
                className={isWishlisted ? "bg-red-600 hover:bg-red-700" : ""}
              >
                <Heart className={`w-4 h-4 mr-2 ${isWishlisted ? "fill-white" : ""}`} />
                {isWishlisted ? "Saved" : "Save"}
              </Button>
              <Button
                variant={isFollowing ? "default" : "outline"}
                onClick={handleToggleFollow}
              >
                <UserPlus className="w-4 h-4 mr-2" />
                {isFollowing ? "Following" : "Follow"}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ProductDetails