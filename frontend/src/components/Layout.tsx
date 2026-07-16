import { Outlet, useNavigate } from "react-router-dom";
import Sidebar from "./Sidebar";

export default function Layout() {
  const navigate = useNavigate();

  const handleNewChat = () => {
    // TODO: brancher la logique de réinitialisation du chat (ex: clear messages)
    navigate("/chat");
  };

  const handleHistoryClick = () => {
    navigate("/history");
  };

  const handleProfileClick = () => {
    navigate("/profile");
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <Sidebar
        onNewChat={handleNewChat}
        onHistoryClick={handleHistoryClick}
        onProfileClick={handleProfileClick}
      />
      <main style={{ flex: 1, padding: "24px" }}>
        <Outlet />
      </main>
    </div>
  );
}