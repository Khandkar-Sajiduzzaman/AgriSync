import { Outlet } from "react-router-dom"
import Navbar from "../components/common/Navbar"

function MainLayout({ onLogout }) {
  return (
    <>
      <Navbar onLogout={onLogout} />
      <main className="flex-1 bg-cream-50">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <Outlet />
        </div>
      </main>
    </>
  )
}

export default MainLayout