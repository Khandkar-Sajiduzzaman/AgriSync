// Redesigned login/signup page - split layout with a branded green
// panel (farmer silhouette + wordmark + tagline) and a cream form panel.

import { useState } from "react";
import { registerUser, loginUser } from "../api/userApi";
import "./AuthForm.css";

function AuthForm({ onAuthSuccess }) {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "buyer",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const data =
        mode === "register"
          ? await registerUser(form)
          : await loginUser(form);

      // Save authentication data
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data));

      onAuthSuccess(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-screen">
      {/* LEFT BRAND PANEL */}
      <div className="auth-brand">
        <svg
          className="auth-brand__mark"
          viewBox="0 0 220 220"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          {/* rising sun */}
          <circle
            cx="60"
            cy="55"
            r="34"
            fill="var(--agri-gold)"
            opacity="0.9"
          />

          {/* wheat stalks */}
          <g
            stroke="var(--agri-gold)"
            strokeWidth="3"
            strokeLinecap="round"
            opacity="0.55"
          >
            <path d="M20 150 Q15 110 30 75" fill="none" />
            <path d="M40 158 Q38 115 50 80" fill="none" />
            <path d="M95 158 Q100 115 92 80" fill="none" />
            <path d="M112 152 Q120 112 108 78" fill="none" />
          </g>

          {/* hat */}
          <path
            d="M35 96 Q66 68 97 96 Q90 92 66 92 Q42 92 35 96 Z"
            fill="var(--agri-cream)"
          />
          <ellipse cx="66" cy="97" rx="16" ry="5" fill="var(--agri-cream)" />

          {/* head */}
          <circle cx="66" cy="104" r="10" fill="var(--agri-cream)" />

          {/* body */}
          <path
            d="M50 122 Q66 112 82 122 L88 168 Q66 178 44 168 Z"
            fill="var(--agri-cream)"
          />

          {/* arm */}
          <path
            d="M82 128 Q100 132 104 150"
            stroke="var(--agri-cream)"
            strokeWidth="7"
            fill="none"
            strokeLinecap="round"
          />

          {/* basket */}
          <ellipse
            cx="107"
            cy="156"
            rx="13"
            ry="10"
            fill="var(--agri-cream)"
          />

          <path
            d="M97 154 L117 154 M99 160 L115 160"
            stroke="var(--agri-forest)"
            strokeWidth="1.5"
            opacity="0.4"
          />
        </svg>

        <div className="auth-brand__text">
          <span className="auth-brand__wordmark">AgriSync</span>

          <p className="auth-brand__tagline">
            Your ticket to a healthy ecosystem of nutrition and affordability.
          </p>
        </div>

        <div className="auth-brand__field-line" aria-hidden="true"></div>
      </div>

      {/* RIGHT FORM PANEL */}
      <div className="auth-formside">
        <div className="auth-card">
          <h2 className="auth-card__heading">
            {mode === "register"
              ? "Create your profile"
              : "Welcome back"}
          </h2>

          <p className="auth-card__subheading">
            {mode === "register"
              ? "Join as a farmer or a buyer to get started."
              : "Log in to your AgriSync account."}
          </p>

          <form onSubmit={handleSubmit} className="auth-form">
            {mode === "register" && (
              <>
                <label className="auth-label">
                  Full name
                  <input
                    className="auth-input"
                    name="name"
                    placeholder="Enter your name"
                    value={form.name}
                    onChange={handleChange}
                    required
                  />
                </label>

                <label className="auth-label">
                  I am a
                  <select
                    className="auth-input"
                    name="role"
                    value={form.role}
                    onChange={handleChange}
                  >
                    <option value="buyer">Buyer</option>
                    <option value="farmer">Farmer</option>
                  </select>
                </label>
              </>
            )}

            <label className="auth-label">
              Email
              <input
                className="auth-input"
                name="email"
                type="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={handleChange}
                required
              />
            </label>

            <label className="auth-label">
              Password
              <input
                className="auth-input"
                name="password"
                type="password"
                placeholder="••••••••"
                value={form.password}
                onChange={handleChange}
                required
              />
            </label>

            {error && <p className="auth-error">{error}</p>}

            <button
              className="auth-submit"
              type="submit"
              disabled={loading}
            >
              {loading
                ? "Please wait..."
                : mode === "register"
                ? "Sign up"
                : "Log in"}
            </button>
          </form>

          <button
            className="auth-switch"
            onClick={() =>
              setMode(mode === "register" ? "login" : "register")
            }
          >
            {mode === "register"
              ? "Already have an account? Log in"
              : "Need an account? Sign up"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default AuthForm;