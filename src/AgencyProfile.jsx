import { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";

function AgencyProfile() {
    const [profileData, setProfileData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [authEmail, setAuthEmail] = useState('');

    useEffect(() => {
        const fetchAgencyProfile = async () => {
            try {
                setLoading(true);
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) {
                    setLoading(false);
                    return;
                }
                setAuthEmail(user.email || '');

                // Fetch profile data from profiles table
                const { data, error } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', user.id)
                    .single();

                // Also fetch employee row for agency users; some fields (contact_number)
                // may be stored in employees rather than profiles.
                let employeeRow = null;
                try {
                    const byAuth = await supabase
                        .from('employees')
                        .select('contact_number, role')
                        .eq('auth_user_id', user.id)
                        .maybeSingle();
                    employeeRow = byAuth.data || null;

                    if (!employeeRow && user.email) {
                        const byEmail = await supabase
                            .from('employees')
                            .select('contact_number, role')
                            .eq('email', user.email)
                            .maybeSingle();
                        employeeRow = byEmail.data || null;
                    }
                } catch (e) {
                    // ignore employee lookup errors
                }

                if (error) {
                    console.error('Error fetching agency profile:', error);
                    setProfileData(null);
                } else if (data) {
                    setProfileData({
                        ...data,
                        // Prefer employees table values when present
                        contact_number: employeeRow?.contact_number ?? data.contact_number,
                        role: data.role ?? employeeRow?.role,
                    });
                } else {
                    console.warn('No agency profile found for user:', user.id);
                    setProfileData(null);
                }
            } catch (err) {
                console.error('Error:', err);
                setProfileData(null);
            } finally {
                setLoading(false);
            }
        };

        fetchAgencyProfile();
    }, []);

    const formatDate = (dateStr) => {
        if (!dateStr) return 'Not specified';
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    };

    const getInitials = (firstName, lastName) => {
        const firstInitial = firstName ? firstName[0].toUpperCase() : '';
        const lastInitial = lastName ? lastName[0].toUpperCase() : '';
        return firstInitial + lastInitial || 'AG';
    };

    const displayValue = (value) => {
        if (value === null || value === undefined) return 'Not specified';
        const str = String(value).trim();
        return str ? str : 'Not specified';
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#800000] mx-auto"></div>
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
        <div className="w-full py-8">
            <div className="max-w-4xl mx-auto px-6">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">My Profile</h1>
                    <p className="text-gray-600 mt-2">View your agency profile information</p>
                </div>

                {/* Profile Card Header */}
                <div className="bg-white rounded-xl shadow-sm border-l-4 border-l-[#800000] border border-gray-200 p-6 mb-6">
                    <div className="flex items-center gap-6">
                        {/* Avatar & Identity Section */}
                        <div className="flex items-center gap-4 flex-1">
                            <div className="w-20 h-20 bg-gradient-to-br from-[#800000] to-[#990000] rounded-xl flex items-center justify-center text-white text-2xl font-bold flex-shrink-0 shadow-lg">
                                {getInitials(profileData.first_name, profileData.last_name)}
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900 mb-1">
                                    {profileData.first_name} {profileData.last_name}
                                </h2>
                                <div className="flex items-center gap-2">
                                    <span className="text-sm text-gray-600 font-medium">
                                        {profileData.agency_name ? profileData.agency_name : (profileData.role || 'Agency User')}
                                    </span>
                                    
                                </div>
                            </div>
                        </div>
                        
                        {/* Status Section */}
                        <div className="flex flex-col gap-2">
                            <div className="flex items-center gap-2 justify-center">
                                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                                <span className="text-sm font-semibold text-gray-700">Active</span>
                            </div>
                            <span className="px-4 py-2 rounded-lg font-semibold text-sm text-center bg-[#800000] text-white">
                                Agency
                            </span>
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
                                        {profileData.first_name} {profileData.middle_name || ''} {profileData.last_name}
                                    </span>
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-sm text-gray-500 mb-1">Email</span>
                                    <span className="text-gray-800 font-medium">{displayValue(profileData.email || authEmail)}</span>
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-sm text-gray-500 mb-1">Contact Number</span>
                                    <span className="text-gray-800 font-medium">{displayValue(profileData.contact_number)}</span>
                                </div>
                            </div>
                            <div className="space-y-4">
                                <div className="flex flex-col">
                                    <span className="text-sm text-gray-500 mb-1">Role</span>
                                    <span className="text-gray-800 font-medium">{displayValue(profileData.role)}</span>
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-sm text-gray-500 mb-1">Account Created</span>
                                    <span className="text-gray-800 font-medium">{formatDate(profileData.created_at)}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Additional Information */}
                {(profileData.address || profileData.birthday || profileData.sex) && (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-6">
                        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4 border-b border-gray-200">
                            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                Additional Information
                            </h3>
                        </div>
                        <div className="p-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {profileData.address && (
                                    <div className="flex flex-col">
                                        <span className="text-sm text-gray-500 mb-1">Address</span>
                                        <span className="text-gray-800 font-medium">{profileData.address}</span>
                                    </div>
                                )}
                                {profileData.birthday && (
                                    <div className="flex flex-col">
                                        <span className="text-sm text-gray-500 mb-1">Birthday</span>
                                        <span className="text-gray-800 font-medium">{formatDate(profileData.birthday)}</span>
                                    </div>
                                )}
                                {profileData.sex && (
                                    <div className="flex flex-col">
                                        <span className="text-sm text-gray-500 mb-1">Sex</span>
                                        <span className="text-gray-800 font-medium">{profileData.sex}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default AgencyProfile;

