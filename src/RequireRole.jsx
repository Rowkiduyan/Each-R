import { Navigate } from "react-router-dom";
import { useUserRoles } from "./useUserRoles";


export default function RequireRole({ role, children }) {
  const { role: userRole, loading } = useUserRoles();

  if (loading) return <p>Loading...</p>;

  console.log("🔍 Checking role:", userRole, "vs required:", role);

  // Normalize both roles to lowercase for case-insensitive comparison
  const normalizedUserRole = userRole?.toLowerCase();
  const normalizedRequiredRole = role?.toLowerCase();

  // if user doesn't match the required role, redirect
  if (normalizedUserRole !== normalizedRequiredRole) {
    console.warn("❌ Role mismatch:", normalizedUserRole, "!=", normalizedRequiredRole);
    return <Navigate to="/not-authorized" replace />;
  }

  console.log("✅ Role check passed!");
  return children;
}
