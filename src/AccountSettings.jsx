import { useState, useEffect, useRef } from "react";
import { supabase } from "./supabaseClient";

function AccountSettings() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploadingPicture, setUploadingPicture] = useState(false);
    const [successMessage, setSuccessMessage] = useState("");
    const [errorMessage, setErrorMessage] = useState("");
    const [profilePictureUrl, setProfilePictureUrl] = useState(null);
    const [profilePictureFile, setProfilePictureFile] = useState(null);
    const [userId, setUserId] = useState(null);
    const [userEmail, setUserEmail] = useState("");
    const [userRole, setUserRole] = useState(null);
    const [passwordStrength, setPasswordStrength] = useState("");
    const fileInputRef = useRef(null);
    
    const [formData, setFormData] = useState({
        email: "",
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
    });

    const calculatePasswordStrength = (password) => {
        let criteriaCount = 0;
        if (/[A-Z]/.test(password)) criteriaCount++;
        if (/[a-z]/.test(password)) criteriaCount++;
        if (/[0-9]/.test(password)) criteriaCount++;
        if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) criteriaCount++;
        if (password.length >= 6) criteriaCount++;
        
        if (criteriaCount < 3) return 'weak';
        if (criteriaCount < 5) return 'fair';
        return 'strong';
    };

    useEffect(() => {
        const fetchUserData = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    setUserId(user.id);
                    setUserEmail(user.email || "");
                    setFormData(prev => ({ ...prev, email: user.email || "" }));
                    fetchProfilePicture(user.id);
                    
                    // Fetch user role from profiles table
                    const { data: profile, error } = await supabase
                        .from('profiles')
                        .select('role')
                        .eq('id', user.id)
                        .single();
                    
                    if (!error && profile?.role) {
                        setUserRole(profile.role);
                    }
                }
            } catch (err) {
                console.error('Error fetching user data:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchUserData();
    }, []);

    const fetchProfilePicture = async (uid) => {
        if (!uid) return;
        
        try {
            // Check profiles table for profile_picture
            const { data: profile, error } = await supabase
                .from('profiles')
                .select('profile_picture')
                .eq('id', uid)
                .single();

            if (!error && profile?.profile_picture) {
                const { data } = supabase.storage
                    .from('profile-pictures')
                    .getPublicUrl(profile.profile_picture);
                setProfilePictureUrl(data.publicUrl);
            }
        } catch (err) {
            console.error('Error fetching profile picture:', err);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
        
        // Calculate password strength for new password field
        if (name === 'newPassword') {
            setPasswordStrength(calculatePasswordStrength(value));
        }
        
        // Clear messages when user starts typing
        if (successMessage) setSuccessMessage("");
        if (errorMessage) setErrorMessage("");
    };

    const handlePictureChange = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            setErrorMessage("Please select an image file.");
            return;
        }

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            setErrorMessage("Image size must be less than 5MB.");
            return;
        }

        setProfilePictureFile(file);
        setErrorMessage("");
        setSuccessMessage("");

        // Create preview URL
        const reader = new FileReader();
        reader.onloadend = () => {
            setProfilePictureUrl(reader.result);
        };
        reader.readAsDataURL(file);
    };

    const handleUploadPicture = async () => {
        if (!profilePictureFile || !userId) {
            setErrorMessage("Please select an image to upload.");
            return;
        }

        setUploadingPicture(true);
        setErrorMessage("");
        setSuccessMessage("");

        try {
            // Sanitize file name
            const sanitizedFileName = profilePictureFile.name.replace(/\s+/g, '_');
            const filePath = `${userId}/${Date.now()}-${sanitizedFileName}`;

            // Upload to Supabase storage
            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('profile-pictures')
                .upload(filePath, profilePictureFile, {
                    upsert: true,
                });

            if (uploadError) {
                setErrorMessage("Failed to upload profile picture: " + uploadError.message);
                setUploadingPicture(false);
                return;
            }

            // Update profile with picture path
            const { error: updateError } = await supabase
                .from('profiles')
                .update({ profile_picture: uploadData.path })
                .eq('id', userId);

            if (updateError) {
                setErrorMessage("Failed to update profile: " + updateError.message);
                setUploadingPicture(false);
                return;
            }

            // Get public URL for display
            const { data: urlData } = supabase.storage
                .from('profile-pictures')
                .getPublicUrl(uploadData.path);
            
            setProfilePictureUrl(urlData.publicUrl);
            setProfilePictureFile(null);
            setSuccessMessage("Profile picture updated successfully!");
            
            // Reset file input
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        } catch (err) {
            setErrorMessage("An error occurred while uploading profile picture.");
            console.error(err);
        } finally {
            setUploadingPicture(false);
        }
    };

    const handleUpdateEmail = async (e) => {
        e.preventDefault();
        setSaving(true);
        setErrorMessage("");
        setSuccessMessage("");

        try {
            // Update email in Supabase Auth
            const { error } = await supabase.auth.updateUser({
                email: formData.email
            });

            if (error) {
                setErrorMessage("Failed to update email: " + error.message);
                setSaving(false);
                return;
            }

            setSuccessMessage("Email update request sent. Please check your new email for confirmation.");
            setFormData(prev => ({ ...prev, currentPassword: "", newPassword: "", confirmPassword: "" }));
        } catch (err) {
            setErrorMessage("An error occurred while updating email.");
            console.error(err);
        } finally {
            setSaving(false);
        }
    };

    const handleUpdatePassword = async (e) => {
        e.preventDefault();
        setSaving(true);
        setErrorMessage("");
        setSuccessMessage("");

        // Validation
        if (!formData.currentPassword) {
            setErrorMessage("Please enter your current password.");
            setSaving(false);
            return;
        }

        if (!formData.newPassword) {
            setErrorMessage("Please enter a new password.");
            setSaving(false);
            return;
        }

        if (formData.newPassword.length < 6) {
            setErrorMessage("Password must be at least 6 characters long.");
            setSaving(false);
            return;
        }

        if (!/[A-Z]/.test(formData.newPassword)) {
            setErrorMessage("Password must contain at least one uppercase letter.");
            setSaving(false);
            return;
        }

        if (!/[a-z]/.test(formData.newPassword)) {
            setErrorMessage("Password must contain at least one lowercase letter.");
            setSaving(false);
            return;
        }

        if (!/[0-9]/.test(formData.newPassword)) {
            setErrorMessage("Password must contain at least one number.");
            setSaving(false);
            return;
        }

        if (!/[!@#$%^&*(),.?":{}|<>]/.test(formData.newPassword)) {
            setErrorMessage("Password must contain at least one special character.");
            setSaving(false);
            return;
        }

        if (formData.newPassword !== formData.confirmPassword) {
            setErrorMessage("New passwords do not match.");
            setSaving(false);
            return;
        }

        try {
            // Update password in Supabase Auth
            const { error } = await supabase.auth.updateUser({
                password: formData.newPassword
            });

            if (error) {
                setErrorMessage("Failed to update password: " + error.message);
                setSaving(false);
                return;
            }

            setSuccessMessage("Password updated successfully!");
            setFormData(prev => ({ ...prev, currentPassword: "", newPassword: "", confirmPassword: "" }));
        } catch (err) {
            setErrorMessage("An error occurred while updating password.");
            console.error(err);
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
            </div>
        );
    }

    return (
        <div className="w-full py-8">
            <div className="max-w-4xl mx-auto px-6">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">Account Settings</h1>
                    <p className="text-gray-600 mt-2">Manage your account information and security settings</p>
                </div>

                {/* Success Message */}
                {successMessage && (
                    <div className="mb-6 bg-green-50 border-l-4 border-green-500 p-4 rounded-lg flex items-start gap-3">
                        <svg className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <p className="text-green-700 text-sm">{successMessage}</p>
                    </div>
                )}

                {/* Error Message */}
                {errorMessage && (
                    <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded-lg flex items-start gap-3">
                        <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <p className="text-red-700 text-sm">{errorMessage}</p>
                    </div>
                )}

                <div className="space-y-6">
                    {/* Profile Picture Card */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="bg-gradient-to-r from-pink-50 to-rose-50 px-6 py-4 border-b border-gray-200">
                            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                                <svg className="w-5 h-5 text-pink-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                                Profile Picture
                            </h2>
                        </div>
                        <div className="p-6">
                            <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
                                {/* Current/Preview Picture */}
                                <div className="flex-shrink-0">
                                    <div className="w-32 h-32 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center border-4 border-gray-300">
                                        {profilePictureUrl ? (
                                            <img
                                                src={profilePictureUrl}
                                                alt="Profile"
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <svg className="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                            </svg>
                                        )}
                                    </div>
                                </div>

                                {/* Upload Controls */}
                                <div className="flex-1 space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Upload New Picture
                                        </label>
                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            accept="image/*"
                                            onChange={handlePictureChange}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 text-sm"
                                        />
                                        <p className="mt-2 text-sm text-gray-500">
                                            Accepted formats: JPG, PNG, GIF. Maximum file size: 5MB.
                                        </p>
                                    </div>
                                    <div className="flex gap-3">
                                        <button
                                            type="button"
                                            onClick={handleUploadPicture}
                                            disabled={!profilePictureFile || uploadingPicture}
                                            className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed font-medium flex items-center gap-2"
                                        >
                                            {uploadingPicture ? (
                                                <>
                                                    <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                    </svg>
                                                    Uploading...
                                                </>
                                            ) : (
                                                "Upload Picture"
                                            )}
                                        </button>
                                        {profilePictureFile && (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setProfilePictureFile(null);
                                                    if (fileInputRef.current) {
                                                        fileInputRef.current.value = '';
                                                    }
                                                    fetchProfilePicture(userId); // Reset to original
                                                }}
                                                className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                                            >
                                                Cancel
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Email Settings Card - Only for Applicants */}
                    {userRole === "Applicant" && (
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4 border-b border-gray-200">
                                <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                    </svg>
                                    Email Address
                                </h2>
                            </div>
                            <div className="p-6">
                                <form onSubmit={handleUpdateEmail}>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Email Address
                                            </label>
                                            <input
                                                type="email"
                                                name="email"
                                                value={formData.email}
                                                onChange={handleInputChange}
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                                                required
                                            />
                                            <p className="mt-2 text-sm text-gray-500">
                                                You will receive a confirmation email at your new address to verify the change.
                                            </p>
                                        </div>
                                        <div className="flex justify-end">
                                            <button
                                                type="submit"
                                                disabled={saving}
                                                className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed font-medium flex items-center gap-2"
                                            >
                                                {saving ? (
                                                    <>
                                                        <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                        </svg>
                                                        Updating...
                                                    </>
                                                ) : (
                                                    "Update Email"
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}

                    {/* Password Settings Card */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="bg-gradient-to-r from-green-50 to-emerald-50 px-6 py-4 border-b border-gray-200">
                            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                </svg>
                                Change Password
                            </h2>
                        </div>
                        <div className="p-6">
                            <form onSubmit={handleUpdatePassword}>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Current Password
                                        </label>
                                        <input
                                            type="password"
                                            name="currentPassword"
                                            value={formData.currentPassword}
                                            onChange={handleInputChange}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                                            placeholder="Enter your current password"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            New Password
                                        </label>
                                        <input
                                            type="password"
                                            name="newPassword"
                                            value={formData.newPassword}
                                            onChange={handleInputChange}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                                            placeholder="Enter your new password"
                                            minLength={6}
                                        />
                                        {formData.newPassword && (
                                            <div className="mt-2">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <div className={`flex-1 h-1.5 rounded-full ${
                                                        passwordStrength === 'weak' ? 'bg-red-500' : 
                                                        passwordStrength === 'fair' ? 'bg-yellow-500' : 
                                                        passwordStrength === 'strong' ? 'bg-green-500' : 'bg-gray-200'
                                                    }`}></div>
                                                    <div className={`flex-1 h-1.5 rounded-full ${
                                                        passwordStrength === 'fair' ? 'bg-yellow-500' : 
                                                        passwordStrength === 'strong' ? 'bg-green-500' : 'bg-gray-200'
                                                    }`}></div>
                                                    <div className={`flex-1 h-1.5 rounded-full ${
                                                        passwordStrength === 'strong' ? 'bg-green-500' : 'bg-gray-200'
                                                    }`}></div>
                                                </div>
                                                <p className={`text-xs mb-2 ${
                                                    passwordStrength === 'weak' ? 'text-red-600' : 
                                                    passwordStrength === 'fair' ? 'text-yellow-600' : 
                                                    passwordStrength === 'strong' ? 'text-green-600' : 'text-gray-500'
                                                }`}>
                                                    {passwordStrength === 'weak' && 'Weak password'}
                                                    {passwordStrength === 'fair' && 'Fair password'}
                                                    {passwordStrength === 'strong' && 'Strong password'}
                                                    {!passwordStrength && 'Password requirements:'}
                                                </p>
                                                <ul className="text-xs space-y-1">
                                                    <li className={`flex items-center gap-1 ${
                                                        /[A-Z]/.test(formData.newPassword) ? 'text-green-600' : 'text-gray-500'
                                                    }`}>
                                                        {/[A-Z]/.test(formData.newPassword) ? '✓' : '○'} One uppercase letter
                                                    </li>
                                                    <li className={`flex items-center gap-1 ${
                                                        /[a-z]/.test(formData.newPassword) ? 'text-green-600' : 'text-gray-500'
                                                    }`}>
                                                        {/[a-z]/.test(formData.newPassword) ? '✓' : '○'} One lowercase letter
                                                    </li>
                                                    <li className={`flex items-center gap-1 ${
                                                        /[0-9]/.test(formData.newPassword) ? 'text-green-600' : 'text-gray-500'
                                                    }`}>
                                                        {/[0-9]/.test(formData.newPassword) ? '✓' : '○'} One number
                                                    </li>
                                                    <li className={`flex items-center gap-1 ${
                                                        /[!@#$%^&*(),.?":{}|<>]/.test(formData.newPassword) ? 'text-green-600' : 'text-gray-500'
                                                    }`}>
                                                        {/[!@#$%^&*(),.?":{}|<>]/.test(formData.newPassword) ? '✓' : '○'} One special character
                                                    </li>
                                                    <li className={`flex items-center gap-1 ${
                                                        formData.newPassword.length >= 6 ? 'text-green-600' : 'text-gray-500'
                                                    }`}>
                                                        {formData.newPassword.length >= 6 ? '✓' : '○'} At least 6 characters
                                                    </li>
                                                </ul>
                                            </div>
                                        )}
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Confirm New Password
                                        </label>
                                        <input
                                            type="password"
                                            name="confirmPassword"
                                            value={formData.confirmPassword}
                                            onChange={handleInputChange}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                                            placeholder="Confirm your new password"
                                            minLength={6}
                                        />
                                    </div>
                                    <div className="flex justify-end">
                                        <button
                                            type="submit"
                                            disabled={saving}
                                            className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed font-medium flex items-center gap-2"
                                        >
                                            {saving ? (
                                                <>
                                                    <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                    </svg>
                                                    Updating...
                                                </>
                                            ) : (
                                                "Update Password"
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </form>
                        </div>
                    </div>

                    {/* Security Information Card */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="bg-gradient-to-r from-purple-50 to-pink-50 px-6 py-4 border-b border-gray-200">
                            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                                <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                </svg>
                                Security Information
                            </h2>
                        </div>
                        <div className="p-6">
                            <div className="space-y-4">
                                <div className="flex items-start gap-3">
                                    <svg className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <div>
                                        <h3 className="font-medium text-gray-900 mb-1">Password Security</h3>
                                        <p className="text-sm text-gray-600">
                                            Use a strong, unique password that you don't use for other accounts. We recommend using a combination of letters, numbers, and special characters.
                                        </p>
                                    </div>
                                </div>
                                {userRole === "Applicant" && (
                                    <div className="flex items-start gap-3">
                                        <svg className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                        </svg>
                                        <div>
                                            <h3 className="font-medium text-gray-900 mb-1">Email Verification</h3>
                                            <p className="text-sm text-gray-600">
                                                When you change your email address, you'll receive a confirmation email at your new address. Please verify it to complete the change.
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default AccountSettings;

