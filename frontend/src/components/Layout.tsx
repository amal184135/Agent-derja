import { Outlet, useNavigate } from "react-router-dom";
import Sidebar from "./Sidebar";

export default function Layout() {
  const navigate = useNavigate();

  const handleNavigate = (key: "chat" | "history" | "profile") => {
    navigate(`/${key}`);
  };

  const handleLogout = () => {
    navigate("/login");
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <Sidebar onNavigate={handleNavigate} onLogout={handleLogout} />
      <main style={{ flex: 1, padding: "24px" }}>
        <Outlet />
      </main>
    </div>
  );
}