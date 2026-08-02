// This component loads the logged-in user's profile when it first
// mounts (useEffect), and lets them edit + save it.

import { useState, useEffect } from "react";
import { getProfile, updateProfile, uploadProfileImage } from "../api/userApi";

function ProfilePage() {
  const [profile, setProfile] = useState(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", address: "", bio: "" });
  const [status, setStatus] = useState("");

  // useEffect with an empty [] dependency array runs once, right after
  // the component first renders - similar to code that runs at the top
  // of a PHP page on load, before any HTML is echoed.
  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const data = await getProfile();
      setProfile(data);
      setForm({
        name: data.name,
        phone: data.phone,
        address: data.address,
        bio: data.bio,
      });
    } catch (err) {
      setStatus(err.message);
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
      setStatus("Profile updated");
    } catch (err) {
      setStatus(err.message);
    }
  };

  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const { profileImage } = await uploadProfileImage(file);
      setProfile({ ...profile, profileImage });
    } catch (err) {
      setStatus(err.message);
    }
  };

  if (!profile) return <p>Loading profile...</p>;

  return (
    <div style={{ maxWidth: 400, margin: "40px auto" }}>
      <h2>My Profile</h2>

      {profile.profileImage && (
        <img
          src={`http://localhost:5000${profile.profileImage}`}
          alt="Profile"
          width={100}
          height={100}
          style={{ borderRadius: "50%", objectFit: "cover" }}
        />
      )}
      <br />
      <input type="file" accept="image/*" onChange={handleImageChange} />

      {!editing ? (
        <div>
          <p><strong>Name:</strong> {profile.name}</p>
          <p><strong>Email:</strong> {profile.email}</p>
          <p><strong>Role:</strong> {profile.role}</p>
          <p><strong>Phone:</strong> {profile.phone || "-"}</p>
          <p><strong>Address:</strong> {profile.address || "-"}</p>
          <p><strong>Bio:</strong> {profile.bio || "-"}</p>
          <button onClick={() => setEditing(true)}>Edit Profile</button>
        </div>
      ) : (
        <form onSubmit={handleSave}>
          <input name="name" value={form.name} onChange={handleChange} placeholder="Name" />
          <br />
          <input name="phone" value={form.phone} onChange={handleChange} placeholder="Phone" />
          <br />
          <input name="address" value={form.address} onChange={handleChange} placeholder="Address" />
          <br />
          <textarea name="bio" value={form.bio} onChange={handleChange} placeholder="Bio" />
          <br />
          <button type="submit">Save</button>
          <button type="button" onClick={() => setEditing(false)}>Cancel</button>
        </form>
      )}

      {status && <p>{status}</p>}
    </div>
  );
}

export default ProfilePage;
