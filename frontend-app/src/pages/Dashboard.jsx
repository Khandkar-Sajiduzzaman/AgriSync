import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { getProducts } from "../api/productApi"
import ProductCard from "../components/product/ProductCard"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { MapPin, User, Search, PlusCircle, PackageOpen, Heart } from "lucide-react"
import { FaTruck } from "react-icons/fa"

function Dashboard() {
  const user = JSON.parse(localStorage.getItem("user"))
  const role = user?.role
  const [products, setProducts] = useState([])

  useEffect(() => {
    loadProducts()
  }, [])

  const loadProducts = async () => {
    try {
      const response = await getProducts({ page: 1, limit: 6 })
      setProducts(response.data || [])
    } catch (err) {
      console.log(err)
    }
  }

  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="bg-gradient-to-br from-agri-700 to-agri-500 rounded-2xl p-8 md:p-12 text-white shadow-lg">
        <h1 className="text-3xl md:text-5xl font-bold mb-4">
          Welcome back, {user?.name || "User"} 👋
        </h1>
        <p className="text-lg text-agri-100 max-w-xl">
          {role === "delivery_man"
            ? "Keep the delivery chain moving. Toggle location sharing and manage your active deliveries."
            : "Fresh vegetables, fruits and farm products delivered directly from trusted local farmers."}
        </p>
        {role === "buyer" && (
          <Link to="/products/browse" className="inline-block mt-6">
            <Button className="bg-white text-agri-800 hover:bg-cream-100 font-semibold px-6">
              <Search className="w-4 h-4 mr-2" /> Browse Products
            </Button>
          </Link>
        )}
        {role === "delivery_man" && (
          <Link to="/delivery" className="inline-block mt-6">
            <Button className="bg-white text-agri-800 hover:bg-cream-100 font-semibold px-6">
              <FaTruck className="w-4 h-4 mr-2" /> Go to Deliveries
            </Button>
          </Link>
        )}
      </div>

      {/* Featured Products — only for buyers and farmers */}
      {role !== "delivery_man" && (
        <section>
          <h2 className="text-2xl font-bold text-agri-800 mb-4">Featured Products</h2>
          {products.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center text-stone-500">
                No products available yet.
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {products.map((product) => (
                <ProductCard key={product._id} product={product} showActions={false} />
              ))}
            </div>
          )}
        </section>
      )}

      {/* Delivery Man — quick stats instead of products */}
      {role === "delivery_man" && (
        <section>
          <h2 className="text-2xl font-bold text-agri-800 mb-4">Today's Overview</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-6 text-center">
                <p className="text-3xl font-bold text-agri-700">0</p>
                <p className="text-stone-500 text-sm">Active Deliveries</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 text-center">
                <p className="text-3xl font-bold text-agri-700">0</p>
                <p className="text-stone-500 text-sm">Completed Today</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 text-center">
                <p className="text-3xl font-bold text-agri-700">৳0</p>
                <p className="text-stone-500 text-sm">Total Delivered</p>
              </CardContent>
            </Card>
          </div>
        </section>
      )}

      {/* Bottom Grid */}
      <div className="grid grid-cols-1 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-agri-700">
              <MapPin className="w-5 h-5" /> Delivery Zones
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="border-2 border-dashed border-agri-300 rounded-xl p-12 text-center bg-agri-50">
              <span className="text-4xl">🗺️</span>
              <h3 className="font-semibold text-agri-800 mt-2">Coming Soon</h3>
              <p className="text-stone-600 text-sm mt-1 max-w-sm mx-auto">
                Farmers will soon define delivery zones and buyers will see availability.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-agri-700">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Link to="/profile">
              <Button variant="outline">
                <User className="w-4 h-4 mr-2" /> My Profile
              </Button>
            </Link>
            {role === "buyer" && (
              <>
                <Link to="/products/browse">
                  <Button variant="outline">
                    <Search className="w-4 h-4 mr-2" /> Browse
                  </Button>
                </Link>
                <Link to="/wishlist">
                  <Button variant="outline">
                    <Heart className="w-4 h-4 mr-2" /> Wishlist
                  </Button>
                </Link>
              </>
            )}
            {role === "farmer" && (
              <>
                <Link to="/products/add">
                  <Button variant="outline">
                    <PlusCircle className="w-4 h-4 mr-2" /> Add Product
                  </Button>
                </Link>
                <Link to="/products/my">
                  <Button variant="outline">
                    <PackageOpen className="w-4 h-4 mr-2" /> My Products
                  </Button>
                </Link>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default Dashboard