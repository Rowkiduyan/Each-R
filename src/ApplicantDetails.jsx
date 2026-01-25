// src/ApplicantDetails.jsx
import React, { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { supabase } from "./supabaseClient";
import { validateNoSunday, validateOfficeHours } from "./utils/dateTimeRules";

/**
 * scheduleInterviewClient
 * Helper that invokes your Supabase Edge Function (name: "dynamic-task").
 * It returns { ok: true, data } or { ok: false, error }.
 */
async function scheduleInterviewClient(applicationId, interview) {
  try {
    const functionName = "schedule-interview-with-notification";
    const { data, error } = await supabase.functions.invoke(functionName, {
      body: { applicationId, interview },
    });

    if (error) throw error;
    return { ok: true, data };
  } catch (err) {
    console.error("scheduleInterviewClient error:", err);
    return { ok: false, error: err };
  }
}

/**
 * createEmployeeAuthAccount
 * Creates or updates auth account for new employee
 */
async function createEmployeeAuthAccount({ employeeEmail, employeePassword, firstName, lastName }) {
  try {
    const functionName = "create-employee-auth";
    const { data, error } = await supabase.functions.invoke(functionName, {
      body: { email: employeeEmail, password: employeePassword, firstName, lastName },
    });

    if (error) throw error;
    return { ok: true, data };
  } catch (err) {
    console.error("createEmployeeAuthAccount error:", err);
    return { ok: false, error: err };
  }
}

/**
 * sendEmployeeAccountEmail
 * Sends credentials email to newly hired employee
 */
async function sendEmployeeAccountEmail(employeeData) {
  try {
    const functionName = "send-employee-credentials";
    const { data, error } = await supabase.functions.invoke(functionName, {
      body: employeeData,
    });

    if (error) throw error;
    return { ok: true, data };
  } catch (err) {
    console.error("sendEmployeeAccountEmail error:", err);
    return { ok: false, error: err };
  }
}

/**
 * generateEmployeePassword
 * Creates password in format: FirstInitialLastName + YYYYMMDD
 * Example: Charles Roque, birthday 2006-02-04 → CRoque20060204
 */
function generateEmployeePassword(firstName, lastName, birthday) {
  const firstInitial = firstName ? firstName.charAt(0).toUpperCase() : "E";
  const lastPart = lastName ? lastName.charAt(0).toUpperCase() + lastName.slice(1).toLowerCase() : "Employee";
  let birthdayPart = "";

  if (birthday) {
    const date = new Date(birthday);
    if (!isNaN(date.getTime())) {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      birthdayPart = `${year}${month}${day}`;
    }
  }

  return `${firstInitial}${lastPart}${birthdayPart}`;
}

function ApplicantDetails() {
  const display = (v) => {
    if (v === null || v === undefined) return "None";
    if (typeof v === 'string') {
      const s = v.trim();
      if (!s || s === '—' || s === '--' || s.toLowerCase() === 'n/a') return "None";
      return s;
    }
    return v;
  };
  const { id } = useParams(); // application.id
  const navigate = useNavigate();
  const location = useLocation();

  const [activeTab, setActiveTab] = useState("Application");
  const [showAction, setShowAction] = useState(false);
  const [showInterviewForm, setShowInterviewForm] = useState(false);
  const [showRejectionForm, setShowRejectionForm] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [loading, setLoading] = useState(true);
  const [scheduling, setScheduling] = useState(false);

  const [interviewDetails, setInterviewDetails] = useState({
    date: "",
    time: "",
    location: "",
    interviewer: "",
  });

  const [rejectionRemarks, setRejectionRemarks] = useState("");
  const [isRejected, setIsRejected] = useState(false);
  const [assessmentResult, setAssessmentResult] = useState(null); // "pass" or "reject"
  const [requirementsResult, setRequirementsResult] = useState(null); // "pass" or "reject"

  const [interviewFile, setInterviewFile] = useState(null);
  const [assessmentFile, setAssessmentFile] = useState(null);

  // Agreements files
  const [agreementsFiles, setAgreementsFiles] = useState([
    { name: "Employee Appointment Letter", file: "applicantfile.pdf (9/26/25)" },
  ]);

  const [agreementsResult, setAgreementsResult] = useState(null); // "hire" or "reject"
  const [hired, setHired] = useState(false);

  const steps = ["Application", "Assessment", "Requirements", "Agreements"];

  // IDs & Docs (local-only status controls)
  const [ids, setIds] = useState([
    { label: "SSS No.", value: "123123123", status: "Submitted" },
    { label: "PhilHealth No.", value: "123123123", status: "Validated", date: "9/26/25" },
    { label: "PagIBIG No.", value: "123123123", status: "Submitted" },
    { label: "TIN No.", value: "123123123", status: "Submitted" },
  ]);

  const [docs, setDocs] = useState([
    { name: "PSA Birth Certificate", file: "psabirthcert.pdf (9/26/25)", status: "Validated" },
    { name: "Photocopy of Drivers License", file: "file.pdf (9/26/25)", status: "Submitted" },
    { name: "Photocopy of SSS ID", file: "file.pdf (9/26/25)", status: "Re-submit" },
    { name: "NBI Clearance", file: "file.pdf (9/26/25)", status: "Submitted" },
    { name: "Police Clearance", file: "file.pdf (9/26/25)", status: "Submitted" },
    { name: "Drive Test", file: "file.pdf (9/26/26)", status: "Submitted" },
  ]);

  // Applicant object we render
  const passedApplicant = location.state?.applicant || null;
  const [applicant, setApplicant] = useState(
    passedApplicant || {
      id,
      name: "Juan Dela Cruz",
      position: "Delivery Rider",
      depot: "Pasig Depot",
      dateApplied: "—",
      email: "juan@example.com",
      phone: "09123456789",
      department: "Logistics",
      employmentStatus: "Unemployed",
      startDate: "—",
      resume: "—",
      address: "—",
      sex: "—",
      birthday: "—",
      age: "—",
      maritalStatus: "—",
      agency: false,
    }
  );

  // store resolved agency display name (e.g., "Acme Agency")
  const [agencyName, setAgencyName] = useState(null);

  // Small role-check for debugging (keeps as you had it)
  useEffect(() => {
    (async () => {
      try {
        const { data, error } = await supabase.auth.getUser();
        if (error) {
          console.log("[ROLE CHECK] getUser error:", error.message);
          return;
        }
        console.log("[ROLE CHECK] app_metadata.role =", data?.user?.app_metadata?.role);
        console.log("[ROLE CHECK] user_metadata.role =", data?.user?.user_metadata?.role);

        const { data: sess } = await supabase.auth.getSession();
        console.log("[ROLE CHECK] jwt claim role =", sess?.session?.user?.role);
      } catch (err) {
        console.warn("[ROLE CHECK] unexpected:", err);
      }
    })();
  }, []);

  // -------------------------
  // Effect A: Load the application (only depends on id)
  // -------------------------
  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("applications")
          .select(
            `
            id,
            created_at,
            status,
            payload,
            interview_date,
            interview_time,
            interview_location,
            interviewer,
            job_posts:job_posts ( id, title, depot )
          `
          )
          .eq("id", id)
          .single();

        if (error) {
          console.error("Load application error:", error);
          if (!cancelled) setLoading(false);
          return;
        }

        // Normalize payload
        let p = data.payload;
        if (typeof p === "string") {
          try {
            p = JSON.parse(p);
          } catch {
            p = {};
          }
        }
        const form = p?.form || p || {};

        // Build applicant object
        const fullName = [
          form.firstName || "",
          form.middleName || "",
          form.lastName || "",
        ]
          .join(" ")
          .replace(/\s+/g, " ")
          .trim();

        const appObj = {
          id: data.id,
          name: fullName || "Unnamed Applicant",
          firstName: form.firstName || "",
          middleName: form.middleName || "",
          lastName: form.lastName || "",
          position: data.job_posts?.title ?? form.appliedPosition ?? "—",
          depot: data.job_posts?.depot ?? form.city ?? "—",
          dateApplied: new Date(data.created_at).toLocaleDateString("en-US", {
            month: "short",
            day: "2-digit",
            year: "numeric",
          }),
          email: form.email || "—",
          phone: form.contact || "—",
          department: form.department || "—",
          employmentStatus: form.employed || "—",
          startDate: form.startDate || "—",
          resume: form.resumeName || "—",
          address:
            [form.street, form.barangay, form.city, form.zip].filter(Boolean).join(", ") ||
            "—",
          sex: form.sex || "—",
          birthday: form.birthday || "—",
          age: "—",
          maritalStatus: form.maritalStatus || "—",
          // if payload explicitly has agency flag, use it
          agency: !!form.agency,
        };

        if (!cancelled) {
          setApplicant(appObj);
          // Load existing interview details if available
          if (data.interview_date || data.interview_time || data.interview_location) {
            setInterviewDetails({
              date: data.interview_date || "",
              time: data.interview_time || "",
              location: data.interview_location || "",
              interviewer: data.interviewer || "",
            });
          }
        }
      } catch (err) {
        console.error("Unexpected load application error:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [id]);

  // -------------------------
  // Effect B: Resolve endorsement/agency separately (depends on applicant's identifying fields)
  // -------------------------
  useEffect(() => {
    let cancelled = false;

    const resolveEndorsement = async () => {
      const emailToFind = (applicant?.email || "").trim();
      const nameToFind = (applicant?.name || "").trim();

      if (!emailToFind && !nameToFind) return;

      console.debug("[endorsement-resolve] trying lookup", { emailToFind, nameToFind });

      try {
        let endorsementRow = null;

        // try by email first - check applications with endorsed=true
        if (emailToFind && emailToFind !== "—") {
          const { data: reData, error: reErr } = await supabase
            .from("applications")
            .select("id, payload, endorsed, created_at")
            .eq("endorsed", true)
            .or(`payload->applicant->>email.eq.${emailToFind}, payload->form->>email.eq.${emailToFind}, payload->>email.eq.${emailToFind}`)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          if (reErr) {
            console.warn("[endorsement-resolve] lookup by email error:", reErr);
          } else {
            endorsementRow = reData || null;
            console.debug("[endorsement-resolve] found by email:", endorsementRow);
          }
        }

        // fallback: check recent endorsed applications and compare names (best-effort)
        if (!endorsementRow && nameToFind) {
          const { data: reData2, error: reErr2 } = await supabase
            .from("applications")
            .select("id, payload, endorsed, created_at")
            .eq("endorsed", true)
            .order("created_at", { ascending: false })
            .limit(50);

          if (reErr2) {
            console.warn("[endorsement-resolve] listing recent endorsements error:", reErr2);
          } else if (Array.isArray(reData2)) {
            endorsementRow =
              reData2.find((r) => {
                const payload = typeof r.payload === "string" ? JSON.parse(r.payload) : r.payload;
                const app = payload?.applicant || payload?.form || payload || {};
                const rname = `${app.firstName || app.fname || ""} ${app.lastName || app.lname || ""}`.trim();
                return rname && nameToFind && rname.toLowerCase() === nameToFind.toLowerCase();
              }) || null;

            console.debug("[endorsement-resolve] found by name match:", endorsementRow);
          }
        }

        if (endorsementRow && !cancelled) {
          // mark agency flag on applicant
          setApplicant((prev) => ({ ...prev, agency: true }));

          // Extract agency info from payload
          const payload = typeof endorsementRow.payload === "string" 
            ? JSON.parse(endorsementRow.payload) 
            : endorsementRow.payload;
          const meta = payload?.meta || {};
          
          // prefer explicit agency_name from payload
          let resolved = payload?.agency_name || null;

          // try profile lookup if profile id present in meta
          if (!resolved && meta.endorsed_by_profile_id) {
            const { data: prof, error: profErr } = await supabase
              .from("profiles")
              .select("id, first_name, last_name, company_name")
              .eq("id", meta.endorsed_by_profile_id)
              .limit(1)
              .maybeSingle();

            if (!profErr && prof) {
              resolved = prof.company_name || `${prof.first_name || ""} ${prof.last_name || ""}`.trim();
            }
          }

          // fallback to payload applicant name
          if (!resolved) {
            const app = payload?.applicant || payload?.form || payload || {};
            const fallbackName = `${app.firstName || app.fname || ""} ${app.lastName || app.lname || ""}`.trim();
            if (fallbackName) resolved = fallbackName;
          }

          if (resolved) setAgencyName(resolved);
        } else {
          console.debug("[endorsement-resolve] no endorsement found for applicant");
        }
      } catch (err) {
        console.error("[endorsement-resolve] unexpected error:", err);
      }
    };

    resolveEndorsement();

    return () => {
      cancelled = true;
    };
  }, [applicant?.email, applicant?.name]);

  // ---- Try multiple RPC parameter names / function names to be resilient ----
  // Order matters: try the param names you already created on DB.
  const rpcCandidates = [
    { fn: "move_applicant_to_employee", param: "p_application_id" },
    { fn: "move_applicant_to_employee", param: "p_app_id" },
    { fn: "move_applicant_to_employee", param: "p_applicant_id" }, // some earlier variants
    { fn: "hire_applicant", param: "p_application_id" },
    { fn: "hire_applicant", param: "p_app_id" },
    { fn: "hire_applicant_v2", param: "p_app_id" },
  ];

  // Return a best-effort attempt: which candidate worked and the rpc response.
  async function tryRpcMoveToEmployee(appId) {
    // attempt the candidates in sequence
    for (const c of rpcCandidates) {
      try {
        const params = {};
        params[c.param] = appId;
        console.debug("[rpc-try] calling", c.fn, params);
        const { data, error } = await supabase.rpc(c.fn, params);

        if (error) {
          // log and continue trying other candidates unless it's a non-existant function HTTP 404 style
          console.warn("[rpc-try] rpc returned error for", c, error);
          // sometimes PostgREST returns PGRST202 meaning function signature not found in schema cache
          // keep trying next candidate
          continue;
        }

        // data came back - return which candidate worked and the returned payload
        return { ok: true, candidate: c, data };
      } catch (err) {
        console.warn("[rpc-try] unexpected exception calling", c, err);
        // try next
      }
    }

    return { ok: false, error: "no_candidate_matched" };
  }

  // ---- Actions wired to Supabase ----
  const markAsHired = async () => {
    if (!window.confirm("Mark this applicant as Hired?")) return;

    setLoading(true);
    try {
      // Ensure payload has name fields required by RPC
      try {
        const { data: applicationData, error: appErr } = await supabase
          .from("applications")
          .select("id, payload")
          .eq("id", id)
          .maybeSingle();

        if (!appErr && applicationData?.payload) {
          let payloadObj = applicationData.payload;
          if (typeof payloadObj === "string") {
            try {
              payloadObj = JSON.parse(payloadObj);
            } catch {
              payloadObj = {};
            }
          }

          const source = payloadObj.form || payloadObj.applicant || payloadObj || {};
          const resolveNameFromText = (text) => {
            if (!text) return { first: "", last: "", middle: "" };
            const raw = String(text).trim().replace(/\s+/g, " ");
            if (!raw) return { first: "", last: "", middle: "" };
            const parts = raw.split(" ");
            if (parts.length === 1) return { first: parts[0], last: "", middle: "" };
            const first = parts[0];
            const last = parts[parts.length - 1];
            const middle = parts.slice(1, -1).join(" ");
            return { first, last, middle };
          };

          const fallbackNameText =
            source.fullName ||
            source.full_name ||
            source.name ||
            payloadObj.fullName ||
            payloadObj.full_name ||
            payloadObj.name ||
            applicant?.name ||
            null;

          const resolved = resolveNameFromText(fallbackNameText);

          const firstName = source.firstName || source.fname || source.first_name || resolved.first || "";
          const lastName = source.lastName || source.lname || source.last_name || resolved.last || "";
          const middleName = source.middleName || source.mname || source.middle_name || resolved.middle || "";
          const email =
            source.email ||
            payloadObj.email ||
            applicant?.email ||
            "";

          if (firstName || lastName || middleName || email) {
            const updatedPayload = { ...payloadObj };
            const targetKey = updatedPayload.form ? "form" : (updatedPayload.applicant ? "applicant" : "form");
            const target = { ...(updatedPayload[targetKey] || {}) };

            if (firstName) {
              target.firstName = firstName;
              target.first_name = firstName;
              target.fname = firstName;
              updatedPayload.firstName = firstName;
              updatedPayload.first_name = firstName;
              updatedPayload.fname = firstName;
            }
            if (lastName) {
              target.lastName = lastName;
              target.last_name = lastName;
              target.lname = lastName;
              updatedPayload.lastName = lastName;
              updatedPayload.last_name = lastName;
              updatedPayload.lname = lastName;
            }
            if (middleName) {
              target.middleName = middleName;
              target.middle_name = middleName;
              target.mname = middleName;
              updatedPayload.middleName = middleName;
              updatedPayload.middle_name = middleName;
              updatedPayload.mname = middleName;
            }

            if (email) {
              target.email = email;
              updatedPayload.email = email;
            }

            const fullName = [firstName, middleName, lastName].filter(Boolean).join(" ").trim();
            if (fullName) {
              updatedPayload.fullName = fullName;
              updatedPayload.full_name = fullName;
            }

            if (!updatedPayload.form) updatedPayload.form = {};
            if (!updatedPayload.applicant) updatedPayload.applicant = {};

            updatedPayload[targetKey] = target;

            await supabase
              .from("applications")
              .update({ payload: updatedPayload })
              .eq("id", id);
          }
        }
      } catch (payloadUpdateError) {
        console.warn("Failed to backfill name fields in payload:", payloadUpdateError);
      }

      // call the best RPC available
      const rpcResult = await tryRpcMoveToEmployee(id);

      if (!rpcResult.ok) {
        // no candidate matched or all failed
        console.error("RPC attempts failed:", rpcResult);
        alert("❌ Could not find a suitable server function to mark applicant as hired. Check server functions or logs.");
        setLoading(false);
        return;
      }

      // If the RPC returned a JSON object (some implementations return jsonb with 'ok' key)
      const rpcData = rpcResult.data;
      
      // Log the RPC response for debugging
      console.log("RPC Response:", rpcData);
      console.log("Department from RPC:", rpcData?.department);

      // If RPC returned an error-like payload (eg. { ok: false, error: 'missing_email', message: '...' })
      if (rpcData && typeof rpcData === "object" && (rpcData.ok === false || rpcData.error)) {
        const msg = rpcData.message || JSON.stringify(rpcData);
        console.error("RPC returned failure payload:", rpcResult.candidate, rpcData);
        alert("❌ " + msg);
        setLoading(false);
        return;
      }

      // Extract data from RPC response
      const workEmail = rpcData?.email; // croque@roadwise.com
      const firstName = rpcData?.fname || applicant?.name?.split(' ')[0];
      const lastName = rpcData?.lname || applicant?.name?.split(' ').slice(1).join(' ');
      const personalEmail = applicant?.email; // charlesroque0114@gmail.com
      const birthday = applicant?.birthday;

      // Generate employee password
      const employeePassword = generateEmployeePassword(firstName, lastName, birthday);

      // Create auth account for employee
      try {
        const authResult = await createEmployeeAuthAccount({
          employeeEmail: workEmail,
          employeePassword: employeePassword,
          firstName: firstName,
          lastName: lastName,
        });

        if (!authResult.ok) {
          console.error("Failed to create auth account:", authResult.error);
          // Continue anyway - employee record was created
        } else {
          console.log("Auth account created successfully");

          // Send credentials email to personal email
          try {
            const emailResult = await sendEmployeeAccountEmail({
              toEmail: personalEmail,
              employeeEmail: workEmail,
              employeePassword: employeePassword,
              firstName: firstName,
              lastName: lastName,
              fullName: `${firstName} ${lastName}`,
              appBaseUrl: window.location.origin,
              portalUrl: "https://each-r-m4qap.ondigitalocean.app/employee/login",
            });

            if (!emailResult.ok) {
              console.warn("Failed to send credentials email:", emailResult.error);
            } else {
              console.log("Credentials email sent to:", personalEmail);
            }
          } catch (emailErr) {
            console.error("Error sending email:", emailErr);
          }
        }
      } catch (authErr) {
        console.error("Error creating auth account:", authErr);
        // Continue anyway
      }

      // Success path - still update applications.status = 'hired' to keep canonical state
      const { error: updErr } = await supabase
        .from("applications")
        .update({ status: "hired" })
        .eq("id", id);

      if (updErr) {
        console.warn("Update application status failed (non-fatal):", updErr);
      }

      // reflect UI changes
      alert("✅ Marked as employee! Credentials sent to " + personalEmail);
      setAgreementsResult("hire");
      setHired(true);
      setIsRejected(false);
      setShowAction(false);

      navigate("/hr/employees", { replace: true });
    } catch (err) {
      console.error("markAsHired unexpected error:", err);
      alert("Unexpected error while marking as hired. Check console.");
    } finally {
      setLoading(false);
    }
  };

  const rejectApplicant = async () => {
    if (!window.confirm("Reject this applicant?")) return;

    const { error } = await supabase
      .from("applications")
      .update({ status: "rejected" })
      .eq("id", id);

    if (error) {
      console.error("Reject update failed:", error);
      alert("❌ Failed to reject: " + error.message);
      return;
    }

    setAgreementsResult("reject");
    setHired(false);
    setIsRejected(true);
    setShowAction(false);
    alert("Applicant rejected.");
    navigate("/hr/recruitment", { replace: true });
  };

  // ---- Render ----
  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center">
        <div className="text-gray-600">Loading applicant…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-start justify-center py-10">
      <div className="max-w-5xl w-full p-8">
        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          className="mb-6 flex items-center text-blue-600 hover:text-blue-800"
        >
          ← Back to Applicants
        </button>

        {/* Applicant Card */}
        <div className="bg-white shadow-lg rounded-2xl p-8 border relative">
          {/* Application Process Stepper */}
          <div className="flex justify-between items-center mb-6">
            {steps.map((step, index) => {
              let bgClass = "bg-orange-400 text-white";
              if (step === "Application") bgClass = "bg-green-500 text-white";

              if (step === "Assessment") {
                if (assessmentResult === "pass") bgClass = "bg-green-500 text-white";
                else if (assessmentResult === "reject") bgClass = "bg-red-500 text-white";
              }

              if (step === "Requirements") {
                if (requirementsResult === "pass") bgClass = "bg-green-500 text-white";
                else if (requirementsResult === "reject") bgClass = "bg-red-500 text-white";
              }

              if (step === "Agreements") {
                if (agreementsResult === "hire") bgClass = "bg-green-500 text-white";
                else if (agreementsResult === "reject") bgClass = "bg-red-500 text-white";
              }

              const isDisabled = isRejected && step !== "Application";

              return (
                <div
                  key={index}
                  onClick={() => {
                    if (!isDisabled) setActiveTab(step);
                  }}
                  className={`flex-1 text-center py-2 rounded-lg mx-1 ${
                    isDisabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"
                  } ${bgClass}`}
                >
                  {step}
                </div>
              );
            })}
          </div>

          {/* Tabs Content */}
          {activeTab === "Application" && (
            <>
              <h2 className="text-3xl font-bold mb-6 text-gray-800 flex items-center gap-3">
                {applicant.name}
                {applicant.agency && (
                  <span className="inline-block px-2 py-0.5 text-xs bg-blue-100 text-blue-600 rounded-full">
                    🚩 Agency{agencyName ? ` — ${agencyName}` : ""}
                  </span>
                )}
                {isRejected && (
                  <span className="text-red-600 text-lg font-semibold">REJECTED</span>
                )}
                {hired && (
                  <span className="text-green-600 text-lg font-semibold">HIRED</span>
                )}
              </h2>

              <h3 className="text-xl font-semibold mb-3 text-gray-700">Job Details</h3>
              <div className="grid md:grid-cols-2 gap-4 text-gray-700 mb-6">
                <p><strong>Department:</strong> {display(applicant.department)}</p>
                <p><strong>Position Applying For:</strong> {display(applicant.position)}</p>
                <p><strong>Depot:</strong> {display(applicant.depot)}</p>
                <p><strong>Current Employment Status:</strong> {display(applicant.employmentStatus)}</p>
                <p><strong>Available Start Date:</strong> {display(applicant.startDate)}</p>
                <p><strong>Resume:</strong> {display(applicant.resume)}</p>
                <p><strong>Date Applied:</strong> {display(applicant.dateApplied)}</p>
              </div>

              <h3 className="text-xl font-semibold mb-3 text-gray-700">
                Personal Information
              </h3>
              <div className="grid md:grid-cols-2 gap-4 text-gray-700">
                <p><strong>First Name:</strong> {display(applicant.firstName)}</p>
                <p><strong>Last Name:</strong> {display(applicant.lastName)}</p>
                <p><strong>Address:</strong> {display(applicant.address)}</p>
                <p><strong>Contact Number:</strong> {display(applicant.phone)}</p>
                <p><strong>Email:</strong> {display(applicant.email)}</p>
                <p><strong>Sex:</strong> {display(applicant.sex)}</p>
                <p><strong>Birthday:</strong> {display(applicant.birthday)}</p>
                <p><strong>Age:</strong> {display(applicant.age)}</p>
                <p><strong>Marital Status:</strong> {display(applicant.maritalStatus)}</p>
              </div>

              <div className="mt-8">
                <button
                  onClick={() => setShowAction(true)}
                  className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg shadow hover:bg-blue-700 transition"
                >
                  Take Action
                </button>
              </div>
            </>
          )}

          {activeTab === "Assessment" && (
            <div>
              <h2 className="text-2xl font-bold mb-4 text-gray-800">Assessment</h2>

              {interviewDetails.date ? (
                <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 mb-4">
                  <p className="font-semibold mb-2">Interview Confirmed</p>
                  <p><strong>Date:</strong> {interviewDetails.date}</p>
                  <p><strong>Time:</strong> {interviewDetails.time}</p>
                  <p><strong>Location:</strong> {interviewDetails.location}</p>
                  <p><strong>Interviewer:</strong> {interviewDetails.interviewer}</p>
                  <button
                    onClick={() => setShowInterviewForm(true)}
                    className="mt-2 px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    Schedule Another Interview
                  </button>
                </div>
              ) : (
                <p>No interview scheduled yet.</p>
              )}

              <div className="mt-4 space-y-4">
                {/* Upload Interview Details */}
                <div>
                  <label className="block mb-2 font-semibold">Upload Interview Details</label>
                  <label className="inline-block px-3 py-1 bg-blue-600 text-white rounded cursor-pointer hover:bg-blue-700 border">
                    {interviewFile ? interviewFile.name : "Choose File"}
                    <input
                      type="file"
                      onChange={(e) => setInterviewFile(e.target.files[0])}
                      className="hidden"
                    />
                  </label>
                </div>

                {/* Upload Assessment Results */}
                <div>
                  <label className="block mb-2 font-semibold">Upload In-Person Assessment Results</label>
                  <label className="inline-block px-3 py-1 bg-blue-600 text-white rounded cursor-pointer hover:bg-blue-700 border">
                    {assessmentFile ? assessmentFile.name : "Choose File"}
                    <input
                      type="file"
                      onChange={(e) => setAssessmentFile(e.target.files[0])}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              <button
                onClick={() => setShowAction(true)}
                className="absolute bottom-8 right-8 px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg shadow hover:bg-blue-700 transition"
              >
                Take Action
              </button>
            </div>
          )}

          {activeTab === "Requirements" && (
            <div>
              <>
                <h2 className="text-2xl font-bold mb-4 text-gray-800">Requirements</h2>

                {/* IDs Section */}
                <div className="grid grid-cols-2 gap-6 mb-6">
                  {ids.map((idRow, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="w-32 font-medium">{idRow.label}</span>
                      <span>{idRow.value}</span>
                      <select
                        value={idRow.status}
                        onChange={(e) => {
                          const newIds = [...ids];
                          newIds[idx].status = e.target.value;
                          if (e.target.value === "Validated") {
                            newIds[idx].date = new Date().toLocaleDateString();
                          } else {
                            newIds[idx].date = "";
                          }
                          setIds(newIds);
                        }}
                        className={`border rounded px-2 py-1 font-medium ${
                          idRow.status === "Validated"
                            ? "bg-green-100 text-green-700"
                            : idRow.status === "Submitted"
                            ? "bg-orange-100 text-orange-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        <option>Submitted</option>
                        <option>Validated</option>
                        <option>Re-submit</option>
                      </select>
                      {idRow.status === "Validated" && (
                        <span className="ml-2 text-gray-500 text-sm">{idRow.date}</span>
                      )}
                    </div>
                  ))}
                </div>

                {/* Documents Section */}
                <h3 className="text-xl font-bold mb-3">Documents</h3>
                <div className="border rounded-lg overflow-hidden shadow-sm mb-4">
                  <table className="min-w-full border-collapse">
                    <thead className="bg-gray-100 text-gray-700">
                      <tr>
                        <th className="px-4 py-2 border-b text-left font-semibold">Document Name</th>
                        <th className="px-4 py-2 border-b text-left font-semibold">Submission</th>
                        <th className="px-4 py-2 border-b text-left font-semibold">Remarks</th>
                      </tr>
                    </thead>
                    <tbody>
                      {docs.map((doc, idx) => (
                        <tr key={idx} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-2 border-b">{doc.name}</td>
                          <td className="px-4 py-2 border-b">{doc.file}</td>
                          <td className="px-4 py-2 border-b">
                            <select
                              value={doc.status}
                              onChange={(e) => {
                                const newDocs = [...docs];
                                newDocs[idx].status = e.target.value;
                                if (e.target.value === "Validated") {
                                  newDocs[idx].date = new Date().toLocaleDateString();
                                } else {
                                  newDocs[idx].date = "";
                                }
                                setDocs(newDocs);
                              }}
                              className={`border rounded px-2 py-1 font-medium ${
                                doc.status === "Validated"
                                  ? "bg-green-100 text-green-700"
                                  : doc.status === "Submitted"
                                  ? "bg-orange-100 text-orange-700"
                                  : "bg-red-100 text-red-700"
                              }`}
                            >
                              <option>Submitted</option>
                              <option>Validated</option>
                              <option>Re-submit</option>
                            </select>
                            {doc.status === "Validated" && (
                              <span className="ml-2 text-gray-500 text-sm">{doc.date}</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Take Action button */}
                <div className="flex justify-end">
                  <button
                    onClick={() => setShowAction(true)}
                    className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg shadow hover:bg-blue-700 transition"
                  >
                    Take Action
                  </button>
                </div>
              </>
            </div>
          )}

          {activeTab === "Agreements" && (
            <div>
              <h2 className="text-2xl font-bold mb-4 text-gray-800">Agreements</h2>

              <div className="border rounded-lg overflow-hidden shadow-sm mb-4">
                <table className="min-w-full border-collapse">
                  <thead className="bg-gray-100 text-gray-700">
                    <tr>
                      <th className="px-4 py-2 border-b text-left font-semibold">Document Name</th>
                      <th className="px-4 py-2 border-b text-left font-semibold">File</th>
                    </tr>
                  </thead>
                  <tbody>
                    {agreementsFiles.map((doc, idx) => (
                      <tr key={idx} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-2 border-b">{doc.name}</td>
                        <td className="px-4 py-2 border-b">{doc.file}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Upload Another File Section */}
              <div className="mt-4">
                <label className="inline-block px-4 py-2 bg-blue-600 text-white rounded cursor-pointer hover:bg-blue-700">
                  + Upload Another File
                  <input
                    type="file"
                    onChange={(e) => {
                      if (!e.target.files[0]) return;
                      const today = new Date().toLocaleDateString();
                      setAgreementsFiles((prev) => [
                        ...prev,
                        { name: `Additional File`, file: `${e.target.files[0].name} (${today})` },
                      ]);
                    }}
                    className="hidden"
                  />
                </label>
              </div>

              <div className="flex justify-end mt-6">
                <button
                  onClick={() => setShowAction(true)}
                  className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg shadow hover:bg-blue-700 transition"
                >
                  Take Action
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Action Modal */}
        {showAction && (
          <div className="fixed inset-0 flex items-center justify-center bg-black/40">
            <div className="bg-white p-6 rounded-xl shadow-lg w-96">
              <h3 className="text-xl font-bold mb-4 text-gray-800">Select an action</h3>

              <div className="flex justify-center gap-3">
                {activeTab === "Assessment" ? (
                  <>
                    <button
                      onClick={() => {
                        setAssessmentResult("pass");
                        setIsRejected(false);
                        setShowAction(false);
                      }}
                      className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
                    >
                      Proceed
                    </button>
                    <button
                      onClick={() => {
                        setAssessmentResult("reject");
                        setShowAction(false);
                        setShowRejectionForm(true);
                      }}
                      className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
                    >
                      Reject
                    </button>
                  </>
                ) : activeTab === "Requirements" ? (
                  <>
                    <button
                      onClick={() => {
                        setRequirementsResult("pass");
                        setIsRejected(false);
                        setShowAction(false);
                      }}
                      className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
                    >
                      Pass
                    </button>
                    <button
                      onClick={() => {
                        setRequirementsResult("reject");
                        setIsRejected(true);
                        setShowAction(false);
                      }}
                      className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
                    >
                      Reject
                    </button>
                  </>
                ) : activeTab === "Agreements" ? (
                  <>
                    <button
                      onClick={markAsHired}
                      className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
                    >
                      Mark as Hired
                    </button>
                    <button
                      onClick={rejectApplicant}
                      className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
                    >
                      Reject
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => {
                        setShowInterviewForm(true);
                        setShowAction(false);
                      }}
                      className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
                    >
                      Set Interview
                    </button>
                    <button
                      onClick={() => {
                        setShowRejectionForm(true);
                        setShowAction(false);
                      }}
                      className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
                    >
                      Reject
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Interview form */}
        {showInterviewForm && (
          <div className="fixed inset-0 flex items-center justify-center bg-black/40" onClick={() => setShowInterviewForm(false)}>
            <div className="bg-white p-6 rounded-xl shadow-lg w-96" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-lg font-semibold mb-3">Schedule Interview — {applicant.name}</h3>
              <form
                className="flex flex-col gap-3"
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!interviewDetails.date || !interviewDetails.time || !interviewDetails.location) {
                    alert("Please fill date, time and location.");
                    return;
                  }

                  setScheduling(true);
                  try {
                    const r = await scheduleInterviewClient(id, interviewDetails);
                    if (!r.ok) {
                      console.error("Edge function error:", r.error);
                      alert("Failed to schedule interview. Check console and function logs.");
                      return;
                    }
                    setShowInterviewForm(false);
                    alert("Interview scheduled and (if email exists) the applicant was notified.");
                    // Reload the page data to show updated interview info
                    window.location.reload();
                  } catch (err) {
                    console.error("scheduleInterview unexpected error:", err);
                    alert("Unexpected error scheduling interview. See console.");
                  } finally {
                    setScheduling(false);
                  }
                }}
              >
                <div>
                  <label className="text-sm">Date</label>
                  <input
                    type="date"
                    className="w-full border p-2 rounded"
                    value={interviewDetails.date}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (!validateNoSunday(e.target, v)) return;
                      setInterviewDetails({ ...interviewDetails, date: v });
                    }}
                    required
                  />
                </div>
                <div>
                  <label className="text-sm">Time</label>
                  <input
                    type="time"
                    className="w-full border p-2 rounded"
                    value={interviewDetails.time}
                    onChange={(e) => {
                      const t = e.target.value;
                      if (!validateOfficeHours(e.target, t)) return;
                      setInterviewDetails({ ...interviewDetails, time: t });
                    }}
                    min="08:00"
                    max="17:00"
                    required
                  />
                </div>
                <div>
                  <label className="text-sm">Location</label>
                  <input
                    type="text"
                    placeholder="Location"
                    className="w-full border p-2 rounded"
                    value={interviewDetails.location}
                    onChange={(e) =>
                      setInterviewDetails({ ...interviewDetails, location: e.target.value })
                    }
                    required
                  />
                </div>
                <div>
                  <label className="text-sm">Interviewer</label>
                  <input
                    type="text"
                    placeholder="Interviewer"
                    className="w-full border p-2 rounded"
                    value={interviewDetails.interviewer}
                    onChange={(e) =>
                      setInterviewDetails({ ...interviewDetails, interviewer: e.target.value })
                    }
                  />
                </div>
                <div className="flex justify-end gap-2 mt-4">
                  <button
                    type="button"
                    onClick={() => setShowInterviewForm(false)}
                    className="px-4 py-2 bg-gray-200 rounded"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={scheduling}
                    className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                  >
                    {scheduling ? "Scheduling..." : "Schedule & Email"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Interview summary */}
        {showSummary && (
          <div className="fixed inset-0 flex items-center justify-center bg-black/40">
            <div className="bg-white p-6 rounded-xl shadow-lg w-96">
              <h3 className="text-lg font-bold mb-4 text-gray-800">Interview Summary</h3>
              <div className="space-y-2 text-gray-700">
                <p><strong>Date:</strong> {interviewDetails.date}</p>
                <p><strong>Time:</strong> {interviewDetails.time}</p>
                <p><strong>Location:</strong> {interviewDetails.location}</p>
                <p><strong>Interviewer:</strong> {interviewDetails.interviewer}</p>
              </div>
              <button
                onClick={() => setShowSummary(false)}
                className="mt-4 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Done
              </button>
            </div>
          </div>
        )}

        {/* Rejection remarks */}
        {showRejectionForm && (
          <div className="fixed inset-0 flex items-center justify-center bg-black/40">
            <div className="bg-white p-6 rounded-xl shadow-lg w-96">
              <h3 className="text-lg font-bold mb-2 text-gray-800">Rejection Remarks</h3>
              <p className="text-sm text-gray-600 mb-4">
                Please share your feedback for rejecting this applicant.
              </p>
              <textarea
                rows="4"
                className="border p-2 rounded w-full"
                placeholder="Enter remarks..."
                value={rejectionRemarks}
                onChange={(e) => setRejectionRemarks(e.target.value)}
              />
              <div className="flex justify-end gap-3 mt-3">
                <button
                  onClick={() => setShowRejectionForm(false)}
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setIsRejected(true);
                    setShowRejectionForm(false);
                    setRejectionRemarks("");
                    rejectApplicant();
                  }}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  Submit
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ApplicantDetails;
