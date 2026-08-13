import { useState, useEffect } from "react";
import { getProfile, updateProfile, uploadProfileImage } from "../api/userApi";

function ProfilePage() {
  const [profile, setProfile] = useState(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", address: "", bio: "" });
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const data = await getProfile();
      setProfile(data);
      setForm({
        name: data.name || "",
        phone: data.phone || "",
        address: data.address || "",
        bio: data.bio || "",
      });
    } catch (err) {
      setStatus(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      const updated = await updateProfile(form);
      setProfile(updated);
      setEditing(false);
      setStatus("Profile updated successfully");
      setTimeout(() => setStatus(""), 3000);
    } catch (err) {
      setStatus(err.message);
    }
  };

  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
        if (file.size > 2 * 1024 * 1024) {
      setStatus("Image must be smaller than 2MB");
      return;
    }
    try {
      const { profileImage } = await uploadProfileImage(file);
      setProfile((prev) => ({ ...prev, profileImage }));
      setStatus("Image updated");
      setTimeout(() => setStatus(""), 3000);
    } catch (err) {
      setStatus(err.message);
    }
  };

  // Shared input style — matches Browse Products exactly
  const inputStyle = {
    width: "100%",
    padding: "12px 14px",
    fontSize: "15px",
    border: "2px solid #bdbdbd",
    borderRadius: "10px",
    backgroundColor: "#ffffff",
    color: "#333333",
    boxSizing: "border-box",
    outline: "none",
    marginBottom: "14px",
  };

  if (loading) {
    return (
      <div className="page-container">
        <p style={{ textAlign: "center", padding: "40px", color: "#666" }}>Loading profile...</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="page-container">
        <p style={{ textAlign: "center", padding: "40px", color: "#666" }}>Could not load profile.</p>
      </div>
    );
  }

  return (
    <div className="page-container">
      <h2 style={{ marginBottom: "24px", fontSize: "28px", color: "#1B5E20" }}>
        My Profile
      </h2>

      {/* White card container — matches Browse Products */}
      <div
        style={{
          backgroundColor: "#ffffff",
          borderRadius: "16px",
          padding: "28px",
          boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
          border: "1px solid #e0e0e0",
          maxWidth: "500px",
        }}
      >
        {/* Avatar + Photo Upload */}
        <div style={{ display: "flex", alignItems: "center", gap: "20px", marginBottom: "28px" }}>
          {profile.profileImage ? (
            <img
              src={`http://localhost:5000${profile.profileImage}`}
              alt="Profile"
              width={80}
              height={80}
              style={{
                borderRadius: "50%",
                objectFit: "cover",
                border: "3px solid #2E7D32",
              }}
            />
          ) : (
            <div
              style={{
                width: 80,
                height: 80,
                borderRadius: "50%",
                background: "#E8F5E9",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "28px",
                color: "#2E7D32",
                fontWeight: "700",
              }}
            >
              {profile.name?.charAt(0)?.toUpperCase() || "?"}
            </div>
          )}

          <div>
            <label
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "8px 16px",
                backgroundColor: "#E8F5E9",
                color: "#2E7D32",
                borderRadius: "8px",
                fontSize: "14px",
                fontWeight: "600",
                cursor: "pointer",
                border: "1px solid #A5D6A7",
              }}
            >
              📷 Change Photo
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                style={{ display: "none" }}
              />
            </label>
          </div>
        </div>

        {!editing ? (
          /* VIEW MODE */
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            <ProfileRow label="Name" value={profile.name} />
            <ProfileRow label="Email" value={profile.email} />
            <ProfileRow label="Role" value={profile.role} />
            <ProfileRow label="Phone" value={profile.phone || "-"} />
            <ProfileRow label="Address" value={profile.address || "-"} />
            <ProfileRow label="Bio" value={profile.bio || "-"} />

            <button
              onClick={() => setEditing(true)}
              style={{
                backgroundColor: "#2E7D32",
                color: "#ffffff",
                border: "none",
                padding: "12px 24px",
                borderRadius: "10px",
                fontSize: "15px",
                fontWeight: "600",
                cursor: "pointer",
                marginTop: "10px",
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                width: "fit-content",
              }}
            >
              ✏️ Edit Profile
            </button>
          </div>
        ) : (
          /* EDIT MODE */
          <form onSubmit={handleSave}>
            <label
              style={{
                display: "block",
                fontSize: "14px",
                fontWeight: "600",
                color: "#333333",
                marginBottom: "6px",
              }}
            >
              Full Name
            </label>
            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="Your name"
              required
              style={inputStyle}
            />

            <label
              style={{
                display: "block",
                fontSize: "14px",
                fontWeight: "600",
                color: "#333333",
                marginBottom: "6px",
              }}
            >
              Phone Number
            </label>
            <input
              name="phone"
              value={form.phone}
              onChange={handleChange}
              placeholder="e.g. 01712345678"
              style={inputStyle}
            />

            <label
              style={{
                display: "block",
                fontSize: "14px",
                fontWeight: "600",
                color: "#333333",
                marginBottom: "6px",
              }}
            >
              Address
            </label>
            <input
              name="address"
              value={form.address}
              onChange={handleChange}
              placeholder="Your address"
              style={inputStyle}
            />

            <label
              style={{
                display: "block",
                fontSize: "14px",
                fontWeight: "600",
                color: "#333333",
                marginBottom: "6px",
              }}
            >
              Bio
            </label>
            <textarea
              name="bio"
              value={form.bio}
              onChange={handleChange}
              placeholder="Tell us about yourself..."
              rows={4}
              style={{
                ...inputStyle,
                resize: "vertical",
                minHeight: "80px",
              }}
            />

            <div style={{ display: "flex", gap: "12px", marginTop: "8px" }}>
              <button
                type="submit"
                style={{
                  backgroundColor: "#2E7D32",
                  color: "#ffffff",
                  border: "none",
                  padding: "12px 24px",
                  borderRadius: "10px",
                  fontSize: "15px",
                  fontWeight: "600",
                  cursor: "pointer",
                }}
              >
                Save Changes
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditing(false);
                  setStatus("");
                  setForm({
                    name: profile.name || "",
                    phone: profile.phone || "",
                    address: profile.address || "",
                    bio: profile.bio || "",
                  });
                }}
                style={{
                  backgroundColor: "#ffffff",
                  color: "#2E7D32",
                  border: "2px solid #2E7D32",
                  padding: "12px 20px",
                  borderRadius: "10px",
                  fontSize: "15px",
                  fontWeight: "600",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {status && (
          <p
            style={{
              marginTop: "16px",
              padding: "10px 16px",
              backgroundColor: "#E8F5E9",
              color: "#1B5E20",
              borderRadius: "8px",
              fontSize: "14px",
              fontWeight: "500",
            }}
          >
            {status}
          </p>
        )}
      </div>
    </div>
  );
}

/* Reusable row for view mode */
function ProfileRow({ label, value }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        padding: "10px 0",
        borderBottom: "1px solid #f0f0f0",
      }}
    >
      <span
        style={{
          fontSize: "14px",
          fontWeight: "600",
          color: "#666666",
          minWidth: "100px",
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontSize: "15px",
          color: "#333333",
          textAlign: "right",
          wordBreak: "break-word",
        }}
      >
        {value}
      </span>
    </div>
  );
}

export default ProfilePage;