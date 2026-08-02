// This ties everything together: show the login/signup form until
// there's a token saved, then show the profile page.

import { useState, useEffect } from "react";
import AuthForm from "./components/AuthForm";
import ProfilePage from "./pages/ProfilePage";

function App() {
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    if (localStorage.getItem("token")) setLoggedIn(true);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    setLoggedIn(false);
  };

  return (
    <div>
      {loggedIn ? (
        <>
          <ProfilePage />
          <div style={{ textAlign: "center" }}>
            <button onClick={handleLogout}>Log out</button>
          </div>
        </>
      ) : (
        <AuthForm onAuthSuccess={() => setLoggedIn(true)} />
      )}
    </div>
  );
}

export default App;
