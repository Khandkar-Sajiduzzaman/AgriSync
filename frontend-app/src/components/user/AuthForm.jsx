import { useState } from "react"
import { registerUser, loginUser } from "../../api/userApi"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"

function AuthForm({ onAuthSuccess }) {
  const [mode, setMode] = useState("login")
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "buyer",
    vehicleType: "",
    licenseNumber: "",
  })
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleRoleChange = (value) => {
    setForm({ ...form, role: value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const data =
        mode === "register"
          ? await registerUser(form)
          : await loginUser(form)

      localStorage.setItem("token", data.token)
      localStorage.setItem("user", JSON.stringify(data))
      onAuthSuccess(data)
      toast.success(mode === "register" ? "Account created!" : "Welcome back!")
    } catch (err) {
      setError(err.message)
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* LEFT BRAND PANEL */}
      <div className="relative flex-1 min-w-[320px] bg-gradient-to-br from-agri-900 via-agri-800 to-agri-700 text-white flex flex-col justify-between p-10 md:p-12 overflow-hidden">
        {/* Decorative circles */}
        <div className="absolute -top-20 -right-20 w-64 h-64 bg-agri-600/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-agri-500/10 rounded-full blur-3xl" />

        <div className="relative z-10">
          {/* Logo icon */}
          <div className="w-16 h-16 bg-agri-700/50 rounded-2xl flex items-center justify-center mb-6 border border-agri-600/30">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              className="w-8 h-8 text-agri-300"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" />
              <path d="M8 14s1.5 2 4 2 4-2 4-2" />
              <path d="M9 9h.01M15 9h.01" />
            </svg>
          </div>
        </div>

        <div className="relative z-10 max-w-sm">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 tracking-tight">
            AgriSync
          </h1>
          <p className="text-lg text-agri-200/80 leading-relaxed">
            Your ticket to a healthy ecosystem of nutrition and affordability.
          </p>
        </div>

        {/* Field lines decoration */}
        <div className="absolute bottom-0 left-0 right-0 h-24 opacity-10">
          <div className="h-full w-full" style={{
            background: "repeating-linear-gradient(100deg, #e8b94a 0px, #e8b94a 2px, transparent 2px, transparent 26px)"
          }} />
        </div>
      </div>

      {/* RIGHT FORM PANEL */}
      <div className="flex-1 bg-cream-50 flex items-center justify-center p-6 md:p-12">
        <div className="w-full max-w-sm space-y-6">
          <div className="text-center md:text-left">
            <h2 className="text-2xl font-bold text-agri-900">
              {mode === "register" ? "Create your profile" : "Welcome back"}
            </h2>
            <p className="text-stone-500 mt-1 text-sm">
              {mode === "register"
                ? "Join as a farmer, buyer, delivery partner, or admin."
                : "Log in to your AgriSync account."}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "register" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="name">Full name</Label>
                  <Input
                    id="name"
                    name="name"
                    placeholder="Enter your name"
                    value={form.name}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="role">I am a</Label>
                  <Select value={form.role} onValueChange={handleRoleChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                     <SelectContent position="popper" className="z-50">
                      <SelectItem value="buyer">Buyer</SelectItem>
                      <SelectItem value="farmer">Farmer</SelectItem>
                      <SelectItem value="delivery_man">Delivery Man</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Extra fields for Delivery Man */}
                {form.role === "delivery_man" && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="vehicleType">Vehicle Type</Label>
                      <Input
                        id="vehicleType"
                        name="vehicleType"
                        placeholder="e.g. Motorcycle, Van, Truck"
                        value={form.vehicleType || ""}
                        onChange={handleChange}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="licenseNumber">License Number</Label>
                      <Input
                        id="licenseNumber"
                        name="licenseNumber"
                        placeholder="e.g. DL-123456"
                        value={form.licenseNumber || ""}
                        onChange={handleChange}
                      />
                    </div>
                  </>
                )}
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={handleChange}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="••••••••"
                value={form.password}
                onChange={handleChange}
                required
              />
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
                {error}
              </p>
            )}

            <Button
              type="submit"
              className="w-full bg-agri-800 hover:bg-agri-900 text-white"
              disabled={loading}
            >
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {loading
                ? "Please wait..."
                : mode === "register"
                ? "Sign up"
                : "Log in"}
            </Button>
          </form>

          <p className="text-center text-sm text-stone-500">
            {mode === "register"
              ? "Already have an account?"
              : "Need an account?"}{" "}
            <button
              type="button"
              onClick={() => {
                setMode(mode === "register" ? "login" : "register")
                setError("")
              }}
              className="text-agri-700 hover:text-agri-900 font-medium underline underline-offset-2"
            >
              {mode === "register" ? "Log in" : "Sign up"}
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}

export default AuthForm