import { useState, useEffect } from "react"
import { getProfile, updateProfile, uploadProfileImage } from "../api/userApi"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { toast } from "sonner"
import { Camera, Save, X, Pencil } from "lucide-react"

function ProfilePage() {
  const [profile, setProfile] = useState(null)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ name: "", phone: "", address: "", bio: "" })

  useEffect(() => {
    loadProfile()
  }, [])

  const loadProfile = async () => {
    try {
      const data = await getProfile()
      setProfile(data)
      setForm({
        name: data.name || "",
        phone: data.phone || "",
        address: data.address || "",
        bio: data.bio || "",
      })
    } catch (err) {
      toast.error(err.message)
    }
  }

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSave = async (e) => {
    e.preventDefault()
    try {
      const updated = await updateProfile(form)
      setProfile(updated)
      setEditing(false)
      toast.success("Profile updated successfully")
    } catch (err) {
      toast.error(err.message)
    }
  }

  const handleImageChange = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    try {
      const { profileImage } = await uploadProfileImage(file)
      setProfile({ ...profile, profileImage })
      toast.success("Profile image updated")
    } catch (err) {
      toast.error(err.message)
    }
  }

  if (!profile) return <p className="text-stone-500 p-8">Loading profile...</p>

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold text-agri-800">My Profile</h1>

      <Card>
        <CardContent className="p-6 space-y-6">
          {/* Avatar */}
          <div className="flex items-center gap-4">
            <Avatar className="w-20 h-20">
              <AvatarImage src={profile.profileImage ? `http://localhost:5000${profile.profileImage}` : undefined} />
              <AvatarFallback className="bg-agri-100 text-agri-800 text-xl">
                {profile.name?.charAt(0)?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <Label htmlFor="avatar" className="cursor-pointer">
                <div className="flex items-center gap-2 text-sm text-agri-700 hover:text-agri-800">
                  <Camera className="w-4 h-4" /> Change Photo
                </div>
              </Label>
              <Input
                id="avatar"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageChange}
              />
            </div>
          </div>

          {!editing ? (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-4 text-sm">
                <span className="text-stone-500">Name</span>
                <span className="col-span-2 font-medium">{profile.name}</span>
              </div>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <span className="text-stone-500">Email</span>
                <span className="col-span-2 font-medium">{profile.email}</span>
              </div>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <span className="text-stone-500">Role</span>
                <span className="col-span-2 font-medium capitalize">{profile.role}</span>
              </div>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <span className="text-stone-500">Phone</span>
                <span className="col-span-2 font-medium">{profile.phone || "-"}</span>
              </div>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <span className="text-stone-500">Address</span>
                <span className="col-span-2 font-medium">{profile.address || "-"}</span>
              </div>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <span className="text-stone-500">Bio</span>
                <span className="col-span-2 font-medium">{profile.bio || "-"}</span>
              </div>
              <Button onClick={() => setEditing(true)} className="mt-4">
                <Pencil className="w-4 h-4 mr-2" /> Edit Profile
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSave} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input id="name" name="name" value={form.name} onChange={handleChange} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" name="phone" value={form.phone} onChange={handleChange} placeholder="Phone number" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Input id="address" name="address" value={form.address} onChange={handleChange} placeholder="Your address" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea id="bio" name="bio" value={form.bio} onChange={handleChange} placeholder="Tell us about yourself" rows={3} />
              </div>
              <div className="flex gap-3">
                <Button type="submit">
                  <Save className="w-4 h-4 mr-2" /> Save
                </Button>
                <Button type="button" variant="outline" onClick={() => setEditing(false)}>
                  <X className="w-4 h-4 mr-2" /> Cancel
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default ProfilePage