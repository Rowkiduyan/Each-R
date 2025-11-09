import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";

export function useUserRoles() {
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getUserRole = async () => {
      // Get current user session
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        // Fetch user's role from "profiles" table
        const { data, error } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();

        if (!error && data) setRole(data.role);
        if (!error && data) {
            console.log("✅ Role fetched from Supabase:", data.role);
            setRole(data.role);
          }
      }
      setLoading(false);
    };

    getUserRole();
  }, []);

  return { role, loading };
}
