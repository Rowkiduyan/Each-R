import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { useEmployeeUser } from "./layouts/EmployeeLayout";
import { supabase } from "./supabaseClient";

function EmpProfile() {
    const { userId, userEmail, employeeUser } = useEmployeeUser();
    const [profileData, setProfileData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchEmployeeProfile = async () => {
            if (!userEmail) return;

            try {
                setLoading(true);
                const { data, error } = await supabase
                    .from('employees')
                    .select('*')
                    .eq('email', userEmail)
                    .maybeSingle();

                if (error) {
                    console.error('Error fetching employee profile:', error);
                    setProfileData(null);
                } else if (data) {
                    setProfileData({
                        ...data,
                        employment_status: data.employment_status || 'regular' // Temporary dummy data
                    });
                } else {
                    console.warn('No employee profile found for email:', userEmail);
                    setProfileData(null);
                }
            } catch (err) {
                console.error('Error:', err);
                setProfileData(null);
            } finally {
                setLoading(false);
            }
        };

        fetchEmployeeProfile();
    }, [userEmail]);

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
                                <span className="text-sm text-gray-500 mb-1">Contact Number</span>
                                <span className="text-gray-800 font-medium">{profileData.contact_number || 'Not specified'}</span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-sm text-gray-500 mb-1">Email</span>
                                <span className="text-gray-800 font-medium">{profileData.email || 'Not specified'}</span>
                            </div>
                        </div>
                        <div className="space-y-4">
                            <div className="flex flex-col">
                                <span className="text-sm text-gray-500 mb-1">Sex</span>
                                <span className="text-gray-800 font-medium">{profileData.sex || 'Not specified'}</span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-sm text-gray-500 mb-1">Birthday</span>
                                <span className="text-gray-800 font-medium">{formatDate(profileData.birthday)}</span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-sm text-gray-500 mb-1">Age</span>
                                <span className="text-gray-800 font-medium">{calculateAge(profileData.birthday)} years old</span>
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
                                <span className="text-sm text-gray-500 mb-1">Employment Start Date</span>
                                <span className="text-gray-800 font-medium">{formatDate(profileData.date_hired)}</span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-sm text-gray-500 mb-1">Resume</span>
                                {profileData.resume_url ? (
                                    <a href={profileData.resume_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                        View Resume
                                    </a>
                                ) : (
                                    <span className="text-gray-500">Not uploaded</span>
                                )}
                            </div>
                            <div className="flex flex-col">
                                <span className="text-sm text-gray-500 mb-1">Application Form</span>
                                {profileData.application_form_url ? (
                                    <a href={profileData.application_form_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                        </svg>
                                        View Application
                                    </a>
                                ) : (
                                    <span className="text-gray-500">Not uploaded</span>
                                )}
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
                        {profileData.educational_attainment && (
                            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full font-medium">
                                        {profileData.educational_level || 'Education'}
                                    </span>
                                    <h4 className="font-semibold text-gray-800">{profileData.educational_attainment}</h4>
                                </div>
                                {profileData.secondary_institution && (
                                    <p className="text-sm text-gray-600">{profileData.secondary_institution}</p>
                                )}
                                {profileData.secondary_year_graduated && (
                                    <p className="text-sm text-gray-500 mt-1">Graduated: {profileData.secondary_year_graduated}</p>
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
                        {!profileData.educational_attainment && !profileData.specialized_training_institution && (
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