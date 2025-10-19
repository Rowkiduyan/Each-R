import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

export default function useUserRole() {
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getUserRole = async () => {
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        const { data, error } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();

        if (error) console.error(error);
        else setRole(data.role);
      }
      setLoading(false);
    };
    getUserRole();
  }, []);

  return { role, loading };
}
