import { Navigate } from "react-router-dom";
import { useUserRoles } from "./useUserRoles";


export default function RequireRole({ role, children }) {
  const { role: userRole, loading } = useUserRoles();

  if (loading) return <p>Loading...</p>;

  console.log("🔍 Checking role:", userRole, "vs required:", role);

  // Normalize both roles to lowercase for case-insensitive comparison
  const normalizedUserRole = userRole?.toLowerCase();
  
  // Handle both single role and array of roles
  const allowedRoles = Array.isArray(role) ? role : [role];
  const normalizedAllowedRoles = allowedRoles.map(r => r?.toLowerCase());

  // if user doesn't match any of the required roles, redirect
  if (!normalizedAllowedRoles.includes(normalizedUserRole)) {
    console.warn("❌ Role mismatch:", normalizedUserRole, "not in", normalizedAllowedRoles);
    return <Navigate to="/not-authorized" replace />;
  }

  console.log("✅ Role check passed!");
  return children;
}
