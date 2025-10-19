import { Navigate } from "react-router-dom";
import useUserRole from "./hooks/useUserRole";

export default function RequireRole({ role: requiredRole, children }) {
  const { role, loading } = useUserRole();

  if (loading) return <p>Loading...</p>;

  if (role !== requiredRole) {
    return <Navigate to="/not-authorized" replace />;
  }

  return children;
}
