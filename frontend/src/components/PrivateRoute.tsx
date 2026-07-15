import { Navigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

export default function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { token, loading } = useAuth();

  if (loading) return <div>Chargement...</div>;
  if (!token) return <Navigate to="/login" replace />;

  return <>{children}</>;
}