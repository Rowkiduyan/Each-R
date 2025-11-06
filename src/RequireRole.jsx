import { Navigate } from "react-router-dom";
import { useUserRoles } from "./useUserRoles";


export default function RequireRole({ role, children }) {
  const { role: userRole, loading } = useUserRoles();

  if (loading) return <p>Loading...</p>;

  console.log("🔍 Checking role:", userRole, "vs required:", role);

  // if user doesn't match the required role, redirect
  if (userRole !== role) {
    return <Navigate to="/not-authorized" replace />;
  }

  return children;
}
