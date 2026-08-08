import { Link } from "react-router-dom"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Eye, Pencil, Trash2, Heart } from "lucide-react"

function ProductCard({
  product,
  onDelete,
  showActions = true,
  isWishlisted,
  onToggleWishlist,
}) {
  const imageUrl = product.images?.[0]
    ? `http://localhost:5000${product.images[0]}`
    : null

  return (
    <Card className="overflow-hidden flex flex-col h-full">
      <div className="aspect-[4/3] bg-stone-100 relative">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={product.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-stone-400 text-sm">
            No Image
          </div>
        )}
        <Badge className="absolute top-2 right-2 bg-agri-700 text-white">
          ৳{product.price}
        </Badge>
      </div>

      <CardHeader className="pb-2">
        <CardTitle className="text-lg leading-tight">{product.name}</CardTitle>
        <p className="text-sm text-stone-500">
          {product.category || product.legacyCategory || "Uncategorized"}
        </p>
      </CardHeader>

      <CardContent className="pb-2 flex-1">
        <p className="text-sm text-stone-600">Stock: {product.stock} available</p>
      </CardContent>

      <CardFooter className="flex flex-wrap gap-2 pt-0">
        <Link to={`/products/${product._id}`} className="flex-1">
          <Button variant="outline" size="sm" className="w-full">
            <Eye className="w-4 h-4 mr-1" /> View
          </Button>
        </Link>

        {showActions && (
          <>
            <Link to={`/products/${product._id}/edit`}>
              <Button variant="ghost" size="sm">
                <Pencil className="w-4 h-4" />
              </Button>
            </Link>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => onDelete(product._id)}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </>
        )}

        {onToggleWishlist && (
          <Button
            variant={isWishlisted ? "default" : "outline"}
            size="sm"
            onClick={() => onToggleWishlist(product._id)}
            className={isWishlisted ? "bg-red-600 hover:bg-red-700" : ""}
          >
            <Heart className={`w-4 h-4 ${isWishlisted ? "fill-white" : ""}`} />
          </Button>
        )}
      </CardFooter>
    </Card>
  )
}

export default ProductCard