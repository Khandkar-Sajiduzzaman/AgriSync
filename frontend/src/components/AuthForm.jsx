// A React "component" is a self-contained chunk of HTML + logic,
// similar to a PHP include that also manages its own form state.
// useState replaces the $_POST-then-reload cycle: the page never
// reloads, state just updates in memory and React re-renders.

import { useState } from "react";
import { registerUser, loginUser } from "../api/userApi";

function AuthForm({ onAuthSuccess }) {
  const [mode, setMode] = useState("login"); // "login" or "register"
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "buyer",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // one handler for every input field, keyed by the input's "name" attribute
  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault(); // stop the browser's default full-page form submit
    setError("");
    setLoading(true);

    try {
      const data =
        mode === "register" ? await registerUser(form) : await loginUser(form);

      localStorage.setItem("token", data.token); // save the JWT for future requests
      onAuthSuccess(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 360, margin: "40px auto" }}>
      <h2>{mode === "register" ? "Create your AgriSync profile" : "Log in"}</h2>

      <form onSubmit={handleSubmit}>
        {mode === "register" && (
          <>
            <input
              name="name"
              placeholder="Full name"
              value={form.name}
              onChange={handleChange}
              required
            />
            <br />
            <select name="role" value={form.role} onChange={handleChange}>
              <option value="buyer">Buyer</option>
              <option value="farmer">Farmer</option>
            </select>
            <br />
          </>
        )}

        <input
          name="email"
          type="email"
          placeholder="Email"
          value={form.email}
          onChange={handleChange}
          required
        />
        <br />
        <input
          name="password"
          type="password"
          placeholder="Password"
          value={form.password}
          onChange={handleChange}
          required
        />
        <br />

        {error && <p style={{ color: "red" }}>{error}</p>}

        <button type="submit" disabled={loading}>
          {loading ? "Please wait..." : mode === "register" ? "Sign up" : "Log in"}
        </button>
      </form>

      <button onClick={() => setMode(mode === "register" ? "login" : "register")}>
        {mode === "register" ? "Already have an account? Log in" : "Need an account? Sign up"}
      </button>
    </div>
  );
}

export default AuthForm;
