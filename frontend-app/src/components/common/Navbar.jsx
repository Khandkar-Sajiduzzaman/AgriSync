import { Link, useLocation } from "react-router-dom"
import { useState } from "react"
import {
  Home,
  User,
  PackageOpen,
  PlusCircle,
  Search,
  Heart,
  LogOut,
  Leaf,
  Menu,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"

function Navbar({ onLogout }) {
  const location = useLocation()
  const [open, setOpen] = useState(false)
  const user = JSON.parse(localStorage.getItem("user"))
  const role = user?.role

  const isActive = (path) => location.pathname === path

  const navItems = [
    { path: "/", label: "Dashboard", icon: Home },
    { path: "/profile", label: "Profile", icon: User },
    ...(role === "farmer"
      ? [
          { path: "/products/add", label: "Add Product", icon: PlusCircle },
          { path: "/products/my", label: "My Products", icon: PackageOpen },
        ]
      : []),
    ...(role === "buyer"
      ? [
          { path: "/products/browse", label: "Browse", icon: Search },
          { path: "/wishlist", label: "Wishlist", icon: Heart },
        ]
      : []),
  ]

  const NavLinks = ({ mobile = false }) => (
    <>
      {navItems.map(({ path, label, icon: Icon }) => (
        <Link
          key={path}
          to={path}
          onClick={() => mobile && setOpen(false)}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
            isActive(path)
              ? "bg-agri-800 text-white"
              : "text-white/90 hover:bg-agri-600"
          } ${mobile ? "w-full" : ""}`}
        >
          <Icon className="w-4 h-4" />
          {label}
        </Link>
      ))}
      <Button
        variant="destructive"
        size="sm"
        onClick={onLogout}
        className={mobile ? "w-full mt-2" : ""}
      >
        <LogOut className="w-4 h-4 mr-1" /> Logout
      </Button>
    </>
  )

  return (
    <nav className="bg-agri-700 text-white sticky top-0 z-50 shadow-md">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2">
          <Leaf className="w-7 h-7 text-agri-300" />
          <div className="leading-tight">
            <span className="font-bold text-lg tracking-tight">AgriSync</span>
            <span className="block text-[10px] text-agri-200 -mt-1">
              Fresh From Farmers
            </span>
          </div>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-1">
          <NavLinks />
        </div>

        {/* Mobile Menu */}
        <div className="md:hidden">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="text-white">
                <Menu className="w-6 h-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="bg-agri-700 border-agri-600 w-64">
              <div className="flex flex-col gap-2 mt-6">
                <NavLinks mobile />
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </nav>
  )
}

export default Navbar