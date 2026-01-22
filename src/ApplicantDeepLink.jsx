import React, { useEffect, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "./supabaseClient";

export default function ApplicantDeepLink() {
  const location = useLocation();
  const navigate = useNavigate();

  const target = useMemo(() => {
    const params = new URLSearchParams(location.search || "");

    // Highest priority: explicit redirectTo (supports prebuilt deep-links)
    const redirectTo = params.get("redirectTo") || params.get("redirect") || "";
    if (redirectTo) return redirectTo;

    // Email CTA format: applicationId + action
    const applicationId = params.get("applicationId") || "";
    const action = params.get("action") || "";
    if (applicationId && action) {
      return `/applicant/applications?applicationId=${encodeURIComponent(applicationId)}&action=${encodeURIComponent(action)}`;
    }

    // Fallback
    return "/applicant/applications";
  }, [location.search]);

  useEffect(() => {
    // Store as a backup so we survive any reloads / lost query params.
    try {
      sessionStorage.setItem("applicant:redirectTo", target);
    } catch {
      // ignore
    }

    const go = async () => {
      const { data } = await supabase.auth.getSession();
      const session = data?.session;

      if (session?.user) {
        navigate(target, { replace: true });
        return;
      }

      navigate(`/applicant/login?redirectTo=${encodeURIComponent(target)}`, {
        replace: true,
        state: { redirectTo: target },
      });
    };

    go();
  }, [navigate, target]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-gray-700 text-sm">Redirecting…</div>
    </div>
  );
}
