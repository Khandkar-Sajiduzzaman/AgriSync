import { Outlet } from "react-router-dom";
import Navbar from "../components/common/Navbar";

function MainLayout({ onLogout }) {
  return (
    <>
      <Navbar onLogout={onLogout} />

      <main
        style={{
          minHeight: "calc(100vh - 80px)",
          background: "#F4F8F2",
          padding: "30px",
        }}
      >
        <Outlet />
      </main>
    </>
  );
}

export default MainLayout;