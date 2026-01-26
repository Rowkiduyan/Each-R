import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { useEmployeeUser } from "./layouts/EmployeeLayout";
import { supabase } from "./supabaseClient";

const normalizeWs = (v) => {
    if (v === null || v === undefined) return "";
    return String(v).replace(/\s+/g, " ").trim();
};

const safeJsonParse = (v) => {
    if (!v) return null;
    if (typeof v === "object") return v;
    if (typeof v !== "string") return null;
    try {
        return JSON.parse(v);
    } catch {
        return null;
    }
};

const extractApplicationFormSource = (payloadObj) => {
    const p = payloadObj && typeof payloadObj === "object" ? payloadObj : {};
    const formObj = p.form && typeof p.form === "object" ? p.form : {};
    const applicantObj = p.applicant && typeof p.applicant === "object" ? p.applicant : {};
    return { ...formObj, ...applicantObj, ...p };
};

// Mirrors the HR-side behavior (see Employees.jsx): support either a single address string
// or compose from common address parts.
const formatFullAddressOneLine = (data) => {
    if (!data || typeof data !== "object") return "";

    const oneLine =
        data.fullAddress ||
        data.full_address ||
        data.currentAddress ||
        data.current_address ||
        data.presentAddress ||
        data.present_address ||
        data.address ||
        data.current_address_text ||
        null;

    const oneLineStr = normalizeWs(oneLine);
    if (oneLineStr) return oneLineStr;

    const parts = [
        data.unitHouseNumber,
        data.unitHouseNo,
        data.unit_house_number,
        data.house_number,
        data.houseNumber,
        data.unit,
        data.street,
        data.streetAddress,
        data.subdivision,
        data.village,
        data.subdivision_village,
        data.barangay,
        data.city,
        data.province,
        data.zip,
        data.postalCode,
        data.postal_code,
    ]
        .map(normalizeWs)
        .filter(Boolean);

    return parts.join(", ");
};

function EmpProfile() {
    const { userId, userEmail, employeeUser } = useEmployeeUser();
    const [profileData, setProfileData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchEmployeeProfile = async () => {
            if (!userEmail) return;

            try {
                setLoading(true);
                
                // Fetch employee data
                // Prefer auth_user_id when available, but fall back to email for older rows.
                let employeeData = null;
                let employeeError = null;

                if (userId) {
                    const res = await supabase
                        .from('employees')
                        .select('*')
                        .eq('auth_user_id', userId)
                        .maybeSingle();
                    employeeData = res.data;
                    employeeError = res.error;
                }

                if (!employeeData && !employeeError) {
                    const res = await supabase
                        .from('employees')
                        .select('*')
                        .eq('email', userEmail)
                        .maybeSingle();
                    employeeData = res.data;
                    employeeError = res.error;
                }

                if (employeeError) {
                    console.error('Error fetching employee profile:', employeeError);
                    setProfileData(null);
                    setLoading(false);
                    return;
                }

                if (!employeeData) {
                    console.warn('No employee profile found for email:', userEmail);
                    setProfileData(null);
                    setLoading(false);
                    return;
                }

                // Fetch applicant data to get personal information (address, sex, birthday, marital status)
                // In some datasets applicants are linked via applicants.employee_id, in others by applicants.id (auth uid).
                // Try a few strategies to avoid showing "Not specified" when data exists.
                let applicantData = null;
                let applicantError = null;

                // Fetch the latest application payload for this user (this is what HR uses as its source of truth).
                let applicationSource = null;
                const emailCandidates = Array.from(
                    new Set(
                        [
                            userEmail,
                            employeeData?.email,
                            employeeData?.personal_email,
                            employeeUser?.email,
                        ]
                            .filter(Boolean)
                            .flatMap((e) => {
                                const s = String(e).trim();
                                return s ? [s, s.toLowerCase()] : [];
                            })
                    )
                );

                // Approach 0: find applicantId by email, then get application by user_id = applicantId
                // (Employee accounts may use work email, while application used personal email.)
                try {
                    if (emailCandidates.length > 0) {
                        const { data: applicantRow, error: applicantIdErr } = await supabase
                            .from("applicants")
                            .select("id,email")
                            .in("email", emailCandidates)
                            .limit(1)
                            .maybeSingle();
                        if (!applicantIdErr && applicantRow?.id) {
                            const { data: appRow, error: appErr } = await supabase
                                .from("applications")
                                .select("id,payload,created_at,user_id,status")
                                .eq("user_id", applicantRow.id)
                                .order("created_at", { ascending: false })
                                .limit(1)
                                .maybeSingle();
                            if (!appErr && appRow?.payload) {
                                const payloadObj = safeJsonParse(appRow.payload);
                                applicationSource = extractApplicationFormSource(payloadObj);
                            }
                        }
                    }
                } catch (e) {
                    console.warn("Could not resolve applicantId/application by email:", e);
                }

                if (userId) {
                    const { data: appRow, error: appErr } = await supabase
                        .from("applications")
                        .select("id,payload,created_at,user_id,status")
                        .eq("user_id", userId)
                        .order("created_at", { ascending: false })
                        .limit(1)
                        .maybeSingle();
                    if (appErr) {
                        console.warn("Could not load application by user_id:", appErr);
                    } else if (appRow?.payload) {
                        const payloadObj = safeJsonParse(appRow.payload);
                        applicationSource = extractApplicationFormSource(payloadObj);
                    }
                }

                if (!applicationSource && emailCandidates.length > 0) {
                    for (const e of emailCandidates) {
                        const { data: appRow, error: appErr } = await supabase
                            .from("applications")
                            .select("id,payload,created_at,user_id,status")
                            .eq("payload->>email", e)
                            .order("created_at", { ascending: false })
                            .limit(1)
                            .maybeSingle();
                        if (!appErr && appRow?.payload) {
                            const payloadObj = safeJsonParse(appRow.payload);
                            applicationSource = extractApplicationFormSource(payloadObj);
                            break;
                        }

                        const { data: appRow2, error: appErr2 } = await supabase
                            .from("applications")
                            .select("id,payload,created_at,user_id,status")
                            .eq("payload->form->>email", e)
                            .order("created_at", { ascending: false })
                            .limit(1)
                            .maybeSingle();
                        if (!appErr2 && appRow2?.payload) {
                            const payloadObj = safeJsonParse(appRow2.payload);
                            applicationSource = extractApplicationFormSource(payloadObj);
                            break;
                        }

                        const { data: appRow3, error: appErr3 } = await supabase
                            .from("applications")
                            .select("id,payload,created_at,user_id,status")
                            .eq("payload->applicant->>email", e)
                            .order("created_at", { ascending: false })
                            .limit(1)
                            .maybeSingle();
                        if (!appErr3 && appRow3?.payload) {
                            const payloadObj = safeJsonParse(appRow3.payload);
                            applicationSource = extractApplicationFormSource(payloadObj);
                            break;
                        }
                    }
                }

                // Approach 3: match among nearby applications by name + date proximity (mirrors HR fallback).
                if (!applicationSource && (employeeData?.hired_at || employeeData?.date_hired)) {
                    try {
                        const hiredAt = employeeData.hired_at || employeeData.date_hired;
                        const start = new Date(new Date(hiredAt).getTime() - 90 * 24 * 60 * 60 * 1000).toISOString();
                        const end = new Date(new Date(hiredAt).getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();

                        const employeeFname = String(employeeData?.fname || "").toLowerCase().trim();
                        const employeeLname = String(employeeData?.lname || "").toLowerCase().trim();
                        const normalizedEmpName = String(employeeData?.name || "")
                            .toLowerCase()
                            .replace(/\s+/g, " ")
                            .trim();

                        const { data: hiredApps, error: hiredAppsError } = await supabase
                            .from("applications")
                            .select("id,payload,created_at,status")
                            .gte("created_at", start)
                            .lte("created_at", end)
                            .order("created_at", { ascending: false })
                            .limit(500);

                        if (!hiredAppsError && hiredApps && hiredApps.length > 0) {
                            const matches = hiredApps.filter((app) => {
                                if (!app.payload) return false;
                                const payloadObj = safeJsonParse(app.payload);
                                const src = extractApplicationFormSource(payloadObj);

                                const appEmail = String(src?.email || "").trim().toLowerCase();
                                if (appEmail && emailCandidates.map((x) => x.toLowerCase()).includes(appEmail)) {
                                    return true;
                                }

                                const appFname = String(src?.firstName || src?.fname || src?.first_name || "")
                                    .toLowerCase()
                                    .trim();
                                const appLname = String(src?.lastName || src?.lname || src?.last_name || "")
                                    .toLowerCase()
                                    .trim();
                                const appFullName = String(src?.fullName || src?.name || "")
                                    .toLowerCase()
                                    .replace(/\s+/g, " ")
                                    .trim();

                                if (employeeFname && employeeLname && appFname && appLname) {
                                    return employeeFname === appFname && employeeLname === appLname;
                                }
                                if (normalizedEmpName && appFullName) {
                                    return normalizedEmpName === appFullName;
                                }
                                return false;
                            });

                            if (matches.length > 0) {
                                const payloadObj = safeJsonParse(matches[0].payload);
                                applicationSource = extractApplicationFormSource(payloadObj);
                            }
                        }
                    } catch (e) {
                        console.warn("Could not match hired application by name/date:", e);
                    }
                }

                // Keep this list aligned with the actual `applicants` table columns.
                // Selecting a non-existent column causes Supabase/PostgREST to return 400.
                const applicantSelect =
                    'email,address,sex,birthday,marital_status,' +
                    'unit_house_number,street,barangay,city,province,zip,postal_code,' +
                    'educational_attainment,institution_name,year_graduated,education_program';

                // 1) Preferred: applicants.employee_id -> employees.id
                {
                    const res = await supabase
                        .from('applicants')
                        .select(applicantSelect)
                        .eq('employee_id', employeeData.id)
                        .maybeSingle();
                    applicantData = res.data;
                    applicantError = res.error;
                }

                // 2) Fallback: applicants.id -> auth uid
                if (!applicantData && !applicantError && userId) {
                    const res = await supabase
                        .from('applicants')
                        .select(applicantSelect)
                        .eq('id', userId)
                        .maybeSingle();
                    applicantData = res.data;
                    applicantError = res.error;
                }

                // 3) Fallback: applicants.email -> employee email
                if (!applicantData && !applicantError && userEmail) {
                    const res = await supabase
                        .from('applicants')
                        .select(applicantSelect)
                        .eq('email', userEmail)
                        .maybeSingle();
                    applicantData = res.data;
                    applicantError = res.error;
                }

                // 4) Fallback: applicants.email -> any known email candidates (work/personal)
                if (!applicantData && !applicantError && emailCandidates.length > 0) {
                    const res = await supabase
                        .from('applicants')
                        .select(applicantSelect)
                        .in('email', emailCandidates)
                        .limit(1)
                        .maybeSingle();
                    applicantData = res.data;
                    applicantError = res.error;
                }

                if (applicantError) {
                    console.error('Error fetching applicant data:', applicantError);
                }

                // Merge employee and applicant data
                const computedAddress =
                    formatFullAddressOneLine(applicationSource) ||
                    formatFullAddressOneLine(applicantData);

                const computedSex =
                    applicationSource?.sex ||
                    applicationSource?.gender ||
                    applicationSource?.Sex ||
                    applicantData?.sex ||
                    employeeData.sex ||
                    "Not specified";

                const computedMaritalStatus =
                    applicationSource?.marital_status ||
                    applicationSource?.maritalStatus ||
                    applicationSource?.marital ||
                    applicantData?.marital_status ||
                    employeeData.marital_status ||
                    "Not specified";

                const computedBirthday =
                    applicationSource?.birthday ||
                    applicationSource?.birthdate ||
                    applicationSource?.birth_date ||
                    applicantData?.birthday ||
                    employeeData.birthday ||
                    null;

                const computedEducationalAttainment =
                    applicationSource?.educational_attainment ||
                    applicationSource?.educationalAttainment ||
                    applicationSource?.education_attainment ||
                    applicantData?.educational_attainment ||
                    null;

                const computedInstitutionName =
                    applicationSource?.institution_name ||
                    applicationSource?.institutionName ||
                    applicantData?.institution_name ||
                    null;

                const computedYearGraduated =
                    applicationSource?.year_graduated ||
                    applicationSource?.yearGraduated ||
                    applicantData?.year_graduated ||
                    null;

                const computedEducationProgram =
                    applicationSource?.education_program ||
                    applicationSource?.educationProgram ||
                    applicantData?.education_program ||
                    null;

                setProfileData({
                    ...employeeData,
                    // Use applicant data for personal information if available
                    email: applicationSource?.email || applicantData?.email || employeeData.email,
                    address: computedAddress || employeeData.address || 'Not specified',
                    sex: computedSex,
                    birthday: computedBirthday,
                    marital_status: computedMaritalStatus,
                    educational_attainment: computedEducationalAttainment,
                    institution_name: computedInstitutionName,
                    year_graduated: computedYearGraduated,
                    education_program: computedEducationProgram,
                    employment_status: employeeData.status || 'regular',
                    // Some data uses hired_at; keep date_hired compatible for display
                    date_hired: employeeData.date_hired || employeeData.hired_at || null,
                });
            } catch (err) {
                console.error('Error:', err);
                setProfileData(null);
            } finally {
                setLoading(false);
            }
        };

        fetchEmployeeProfile();
    }, [userEmail, userId]);

    const formatDate = (dateStr) => {
        if (!dateStr) return 'Not specified';
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    };

    const calculateAge = (birthday) => {
        if (!birthday) return 'N/A';
        const birthDate = new Date(birthday);
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        return age;
    };

    const getInitials = (fname, lname) => {
        const firstInitial = fname ? fname[0].toUpperCase() : '';
        const lastInitial = lname ? lname[0].toUpperCase() : '';
        return firstInitial + lastInitial || 'EM';
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading profile...</p>
                </div>
            </div>
        );
    }

    if (!profileData) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <p className="text-gray-600">Profile data not found</p>
                </div>
            </div>
        );
    }

    return (
    <>
        <div className="min-h-screen bg-gray-50">
            <div className="w-full py-8">
                {/* Employee Card Header - Option 3 */}
                <div className="bg-white rounded-xl shadow-sm border-l-4 border-l-red-500 border border-gray-200 p-6 mb-6">
                    <div className="flex items-center gap-6">
                        {/* Avatar & Identity Section */}
                        <div className="flex items-center gap-4 flex-1">
                            <div className="w-20 h-20 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center text-white text-2xl font-bold flex-shrink-0 shadow-lg">
                                {getInitials(profileData.fname, profileData.lname)}
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900 mb-1">
                                    {profileData.fname} {profileData.mname ? profileData.mname + ' ' : ''}{profileData.lname}
                                </h2>
                                <div className="flex items-center gap-2">
                                    <span className="text-sm text-gray-600 font-medium">{profileData.position || 'Employee'}</span>
                                    <span className="text-gray-400">|</span>
                                    <span className="text-sm text-gray-600 font-medium">{profileData.department || 'Department'}</span>
                                </div>
                            </div>
                        </div>
                        
                        {/* Status Section */}
                        <div className="flex flex-col gap-2">
                            <div className="flex items-center gap-2 justify-center">
                                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                                <span className="text-sm font-semibold text-gray-700">Active</span>
                            </div>
                            {profileData.employment_status && (
                                <span className={`px-4 py-2 rounded-lg font-semibold text-sm text-center ${
                                    profileData.employment_status.toLowerCase() === 'regular' 
                                        ? 'bg-blue-600 text-white' 
                                        : 'bg-purple-600 text-white'
                                }`}>
                                    {profileData.employment_status === 'regular' ? 'Regular' : 'Probation'}
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Personal Information */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-6">
                    <div className="bg-gradient-to-r from-red-50 to-orange-50 px-6 py-4 border-b border-gray-200">
                        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                            <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            Personal Information
                        </h3>
                    </div>
                    <div className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <div className="flex flex-col">
                                <span className="text-sm text-gray-500 mb-1">Full Name</span>
                                <span className="text-gray-800 font-medium">
                                    {profileData.lname}, {profileData.fname} {profileData.mname || ''}
                                </span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-sm text-gray-500 mb-1">Address</span>
                                <span className="text-gray-800 font-medium">{profileData.address || 'Not specified'}</span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-sm text-gray-500 mb-1">Sex</span>
                                <span className="text-gray-800 font-medium">{profileData.sex || 'Not specified'}</span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-sm text-gray-500 mb-1">Birthdate</span>
                                <span className="text-gray-800 font-medium">{formatDate(profileData.birthday)}</span>
                            </div>
                        </div>
                        <div className="space-y-4">
                            <div className="flex flex-col">
                                <span className="text-sm text-gray-500 mb-1">Contact Number</span>
                                <span className="text-gray-800 font-medium">{profileData.contact_number || 'Not specified'}</span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-sm text-gray-500 mb-1">Age</span>
                                <span className="text-gray-800 font-medium">{calculateAge(profileData.birthday)} years old</span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-sm text-gray-500 mb-1">Personal Email</span>
                                <span className="text-gray-800 font-medium">{profileData.email || 'Not specified'}</span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-sm text-gray-500 mb-1">Marital Status</span>
                                <span className="text-gray-800 font-medium">{profileData.marital_status || 'Not specified'}</span>
                            </div>
                        </div>
                    </div>
                    </div>
                </div>

                {/* Employment Information */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-6">
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4 border-b border-gray-200">
                        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                            Employment Information
                        </h3>
                    </div>
                    <div className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <div className="flex flex-col">
                                <span className="text-sm text-gray-500 mb-1">Company Email</span>
                                <span className="text-gray-800 font-medium">{profileData.company_email || userEmail || 'Not specified'}</span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-sm text-gray-500 mb-1">Employment Start Date</span>
                                <span className="text-gray-800 font-medium">{formatDate(profileData.date_hired)}</span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-sm text-gray-500 mb-1">Position</span>
                                <span className="text-gray-800 font-medium">{profileData.position || 'Not specified'}</span>
                            </div>
                        </div>
                        <div className="space-y-4">
                            <div className="flex flex-col">
                                <span className="text-sm text-gray-500 mb-1">Department</span>
                                <span className="text-gray-800 font-medium">{profileData.department || 'Not specified'}</span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-sm text-gray-500 mb-1">Employment Type</span>
                                <span className="text-gray-800 font-medium">
                                    {profileData.employment_status === 'regular' ? 'Regular' : 'Under Probation'}
                                </span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-sm text-gray-500 mb-1">Depot</span>
                                <span className="text-gray-800 font-medium">{profileData.depot || 'Not specified'}</span>
                            </div>
                        </div>
                        </div>
                    </div>
                </div>

                {/* Educational Background */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-6">
                    <div className="bg-gradient-to-r from-green-50 to-emerald-50 px-6 py-4 border-b border-gray-200">
                        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                            <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222" />
                            </svg>
                            Educational Background
                        </h3>
                    </div>
                    <div className="p-6">
                        <div className="space-y-4">
                        {(profileData.educational_attainment || profileData.institution_name || profileData.education_program) && (
                            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full font-medium">
                                        Education
                                    </span>
                                    <h4 className="font-semibold text-gray-800">{profileData.educational_attainment || 'Not specified'}</h4>
                                </div>
                                {profileData.education_program && (
                                    <p className="text-sm text-gray-700 font-medium">{profileData.education_program}</p>
                                )}
                                {profileData.institution_name && (
                                    <p className="text-sm text-gray-600">{profileData.institution_name}</p>
                                )}
                                {profileData.year_graduated && (
                                    <p className="text-sm text-gray-500 mt-1">Graduated: {profileData.year_graduated}</p>
                                )}
                            </div>
                        )}
                        {profileData.specialized_training_institution && (
                            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded-full font-medium">Specialized Training</span>
                                    <h4 className="font-semibold text-gray-800">Vocational Course</h4>
                                </div>
                                <p className="text-sm text-gray-600">{profileData.specialized_training_institution}</p>
                                {profileData.specialized_year_graduated && (
                                    <p className="text-sm text-gray-500 mt-1">Graduated: {profileData.specialized_year_graduated}</p>
                                )}
                            </div>
                        )}
                        {!profileData.educational_attainment && !profileData.institution_name && !profileData.education_program && !profileData.specialized_training_institution && (
                            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 text-center">
                                <p className="text-sm text-gray-500">No educational information available</p>
                            </div>
                        )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </>
    );
} export default EmpProfile;