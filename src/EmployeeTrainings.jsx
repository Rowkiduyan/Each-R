import { Link } from "react-router-dom";
import React, { useState, useEffect } from "react";
import { useEmployeeUser } from "./layouts/EmployeeLayout";
import { supabase } from './supabaseClient';
import { generateCertificatePDF } from './utils/certificateGenerator';

function EmployeeTrainings() {
    const { userId, userEmail, employeeUser } = useEmployeeUser();
    const [loading, setLoading] = useState(true);
    const [upcoming, setUpcoming] = useState([]);
    const [pendingAttendance, setPendingAttendance] = useState([]);
    const [completed, setCompleted] = useState([]);
    const [selectedTraining, setSelectedTraining] = useState(null);
    const [showDetails, setShowDetails] = useState(false);
    const [activeTab, setActiveTab] = useState("upcoming");
    const [searchQuery, setSearchQuery] = useState("");
    const [currentEmployeeData, setCurrentEmployeeData] = useState(null);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [successMessage, setSuccessMessage] = useState({ title: '', description: '' });
    const [isUploading, setIsUploading] = useState(false);
    
    // Training certificate upload state
    const [showTrainingCertUpload, setShowTrainingCertUpload] = useState(false);
    const [trainingCertFile, setTrainingCertFile] = useState(null);
    const [trainingForCert, setTrainingForCert] = useState(null);
    
    // Generated certificates from HR
    const [generatedCertificates, setGeneratedCertificates] = useState({});
    const [showCertificateModal, setShowCertificateModal] = useState(false);
    const [currentCertificateUrl, setCurrentCertificateUrl] = useState(null);

    // Get employee's possible name formats for matching
    const getEmployeeNameVariations = () => {
        const empData = currentEmployeeData || employeeUser;
        if (!empData) return [];
        const { fname, lname, mname } = empData;
        
        const variations = [];
        
        // Format: "Last, First Middle" (same as HrTrainings)
        const lastFirst = [lname, fname].filter(Boolean).join(", ");
        const full = [lastFirst, mname].filter(Boolean).join(" ").trim();
        if (full) variations.push(full);
        
        // Format: "Last, First" (without middle name)
        if (lastFirst) variations.push(lastFirst.trim());
        
        // Format: "First Middle Last"
        const firstMiddleLast = [fname, mname, lname].filter(Boolean).join(" ").trim();
        if (firstMiddleLast) variations.push(firstMiddleLast);
        
        // Format: "First Last"
        const firstLast = [fname, lname].filter(Boolean).join(" ").trim();
        if (firstLast) variations.push(firstLast);
        
        // Normalize all variations (trim and lowercase for comparison)
        return variations.map(v => v.trim()).filter(Boolean);
    };

    // Get employee's attendance status and certificate from training
    const getEmployeeAttendanceStatus = (training) => {
        if (!training.attendance) return { isPresent: null, certificateUrl: null, employeeName: null };
        
        const nameVariations = getEmployeeNameVariations();
        
        // Find which name variation matches in attendance
        for (const name of nameVariations) {
            const attendanceData = training.attendance[name];
            if (attendanceData !== undefined && attendanceData !== null) {
                // Check if it's an object (with certificate) or boolean
                if (typeof attendanceData === 'object' && attendanceData !== null) {
                    return {
                        isPresent: attendanceData.status === true || attendanceData === true,
                        certificateUrl: attendanceData.certificate_url || null,
                        employeeName: name
                    };
                } else {
                    return {
                        isPresent: attendanceData === true,
                        certificateUrl: null,
                        employeeName: name
                    };
                }
            }
        }
        
        return { isPresent: null, certificateUrl: null, employeeName: null };
    };

    // Fetch employee data if not available from context
    useEffect(() => {
        const loadEmployeeData = async () => {
            if (employeeUser) {
                fetchTrainings();
                return;
            }

            // If employeeUser is not available, try to fetch from database using email
            if (userEmail) {
                try {
                    const { data, error } = await supabase
                        .from('employees')
                        .select('fname, lname, mname, email')
                        .eq('email', userEmail)
                        .maybeSingle();

                    if (!error && data) {
                        // Employee data found, fetch trainings
                        fetchTrainings();
                    } else {
                        setLoading(false);
                    }
                } catch (err) {
                    console.error('Error loading employee data:', err);
                    setLoading(false);
                }
            } else {
                setLoading(false);
            }
        };

        loadEmployeeData();
    }, [employeeUser, userEmail]);

    // Fetch HR-generated certificates for an employee
    const fetchGeneratedCertificates = async (nameVars = null) => {
        try {
            // Use passed name variations or calculate them
            const nameVariations = nameVars || getEmployeeNameVariations();
            
            if (nameVariations.length === 0) {
                console.log('No name variations available, skipping certificate fetch');
                return;
            }
            
            console.log('Fetching certificates for:', { userId, nameVariations });
            
            // Query by employee_name since employee_id may be null for agency employees
            const { data, error } = await supabase
                .from('generated_certificates')
                .select('training_id, certificate_url, certificate_path, employee_name')
                .in('employee_name', nameVariations);
            
            if (error) {
                console.error('Error fetching certificates:', error);
                throw error;
            }
            
            console.log('Fetched certificates:', data);
            console.log('Searched for names:', nameVariations);
            
            // Map by training_id for easy lookup
            const certMap = {};
            data?.forEach(cert => {
                certMap[cert.training_id] = cert;
            });
            
            setGeneratedCertificates(certMap);
        } catch (error) {
            console.error('Error fetching generated certificates:', error);
        }
    };

    const fetchTrainings = async () => {
        // Get employee data - either from context or fetch it
        let empData = employeeUser;
        
        if (!empData && userEmail) {
            try {
                const { data, error } = await supabase
                    .from('employees')
                    .select('fname, lname, mname, email')
                    .eq('email', userEmail)
                    .maybeSingle();
                
                if (error || !data) {
                    console.error('Error fetching employee data:', error);
                    setLoading(false);
                    return;
                }
                empData = data;
            } catch (err) {
                console.error('Error fetching employee data:', err);
                setLoading(false);
                return;
            }
        }

        if (!empData) {
            setLoading(false);
            return;
        }

        // Store employee data for use throughout component
        setCurrentEmployeeData(empData);
        
        // Calculate name variations with current employee data
        const { fname, lname, mname } = empData;
        const nameVariations = [];
        
        const lastFirst = [lname, fname].filter(Boolean).join(", ");
        const full = [lastFirst, mname].filter(Boolean).join(" ").trim();
        if (full) nameVariations.push(full);
        
        if (lastFirst) nameVariations.push(lastFirst.trim());
        
        const firstMiddleLast = [fname, mname, lname].filter(Boolean).join(" ").trim();
        if (firstMiddleLast) nameVariations.push(firstMiddleLast);
        
        const firstLast = [fname, lname].filter(Boolean).join(" ").trim();
        if (firstLast) nameVariations.push(firstLast);
        
        const normalizedVariations = nameVariations.map(n => n.trim()).filter(Boolean);
        
        if (normalizedVariations.length === 0) {
            setLoading(false);
            return;
        }

        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('trainings')
                .select('*')
                .order('start_at', { ascending: true });

            if (error) {
                console.error('Error fetching trainings:', error);
                setLoading(false);
                return;
            }

            // Normalize name variations for comparison (trim and lowercase)
            const normalizedVariationsForMatch = normalizedVariations.map(n => n.trim().toLowerCase());

            // Filter trainings where this employee is in attendees
            // Try multiple name format matches
            const myTrainings = (data || []).filter((training) => {
                const attendees = training.attendees || [];
                return attendees.some(att => {
                    const attendeeName = typeof att === "string" ? att : att.name || "";
                    const normalizedAttendeeName = attendeeName.trim().toLowerCase();
                    
                    // Check if any name variation matches
                    return normalizedVariationsForMatch.some(variation => 
                        normalizedAttendeeName === variation
                    );
                });
            });

            // Normalize and separate upcoming, pending attendance, and completed trainings
            const now = new Date();
            const upcomingTrainings = [];
            const pendingAttendanceTrainings = [];
            const completedTrainings = [];

            myTrainings.forEach((training) => {
                const start = training.start_at ? new Date(training.start_at) : null;
                const end = training.end_at ? new Date(training.end_at) : null;
                const normalized = {
                    ...training,
                    date: start ? start.toISOString().slice(0, 10) : "",
                    time: start ? start.toISOString().slice(11, 16) : "",
                };

                if (start) {
                    // Use end_at if available, otherwise default to end of training day
                    const trainingEnd = end || new Date(
                        start.getFullYear(),
                        start.getMonth(),
                        start.getDate(),
                        23, 59, 59, 999
                    );

                    // Check if training has ended (end_at has passed)
                    if (trainingEnd < now) {
                        const hasAttendance =
                            training.attendance &&
                            Object.keys(training.attendance || {}).length > 0;

                        if (hasAttendance) {
                            // Past training with recorded attendance → History
                            completedTrainings.push(normalized);
                        } else {
                            // Past training without attendance yet → Pending Attendance
                            pendingAttendanceTrainings.push(normalized);
                        }
                    } else {
                        // Training is happening now or in the future → Upcoming
                        // But we need to check again after sorting to move past ones to pending
                        upcomingTrainings.push(normalized);
                    }
                } else {
                    // No start date, treat as upcoming
                    upcomingTrainings.push(normalized);
                }
            });

            // After initial categorization, check upcoming trainings again
            // Move any that have passed their end_at to pending attendance
            const stillUpcoming = [];
            upcomingTrainings.forEach((training) => {
                const end = training.end_at ? new Date(training.end_at) : null;
                if (end && end < now) {
                    // Training has ended, move to pending attendance
                    const hasAttendance =
                        training.attendance &&
                        Object.keys(training.attendance || {}).length > 0;
                    
                    if (hasAttendance) {
                        completedTrainings.push(training);
                    } else {
                        pendingAttendanceTrainings.push(training);
                    }
                } else {
                    stillUpcoming.push(training);
                }
            });

            // Sort upcoming in ascending order by date (soonest first)
            stillUpcoming.sort((a, b) => {
                const dateA = a.start_at ? new Date(a.start_at) : new Date(0);
                const dateB = b.start_at ? new Date(b.start_at) : new Date(0);
                return dateA - dateB;
            });

            // Sort pending attendance in descending order by date (most recent first)
            pendingAttendanceTrainings.sort((a, b) => {
                const dateA = a.start_at ? new Date(a.start_at) : new Date(0);
                const dateB = b.start_at ? new Date(b.start_at) : new Date(0);
                return dateB - dateA;
            });

            // Sort completed in descending order by date (most recent first)
            completedTrainings.sort((a, b) => {
                const dateA = a.start_at ? new Date(a.start_at) : new Date(0);
                const dateB = b.start_at ? new Date(b.start_at) : new Date(0);
                return dateB - dateA;
            });

            setUpcoming(stillUpcoming);
            setPendingAttendance(pendingAttendanceTrainings);
            setCompleted(completedTrainings);
            
            // Fetch generated certificates with the name variations we calculated
            await fetchGeneratedCertificates(normalizedVariations);
        } catch (error) {
            console.error('Error fetching trainings:', error);
        } finally {
            setLoading(false);
        }
    };

    // Format date
    const formatDate = (dateStr) => {
        if (!dateStr) return 'Not set';
        try {
            const date = new Date(dateStr);
            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        } catch {
            return dateStr;
        }
    };

    // Format time to 12-hour with AM/PM (handles both time strings and timestamps)
    const formatTime = (timeStrOrTimestamp) => {
        if (!timeStrOrTimestamp) return 'Not set';
        try {
            // Check if it's a timestamp (ISO string or Date object)
            if (typeof timeStrOrTimestamp === 'string' && (timeStrOrTimestamp.includes('T') || timeStrOrTimestamp.includes('-'))) {
                const date = new Date(timeStrOrTimestamp);
                const hours = date.getHours();
                const minutes = date.getMinutes();
                const ampm = hours >= 12 ? 'PM' : 'AM';
                const displayHour = hours % 12 || 12;
                const displayMinutes = minutes.toString().padStart(2, '0');
                return `${displayHour}:${displayMinutes} ${ampm}`;
            }
            // Otherwise treat as time string (HH:MM format)
            const [hours, minutes] = timeStrOrTimestamp.split(':');
            const hour = parseInt(hours, 10);
            const ampm = hour >= 12 ? 'PM' : 'AM';
            const hour12 = hour % 12 || 12;
            return `${hour12}:${minutes} ${ampm}`;
        } catch {
            return timeStrOrTimestamp;
        }
    };

    // Format end time from end_at timestamp
    const formatEndTime = (endAtTimestamp) => {
        if (!endAtTimestamp) return "N/A";
        try {
            const date = new Date(endAtTimestamp);
            const hours = date.getHours();
            const minutes = date.getMinutes();
            const ampm = hours >= 12 ? 'PM' : 'AM';
            const displayHour = hours % 12 || 12;
            const displayMinutes = minutes.toString().padStart(2, '0');
            return `${displayHour}:${displayMinutes} ${ampm}`;
        } catch {
            return "N/A";
        }
    };

    // Calculate duration between start and end time
    const calculateDuration = (startAt, endAt) => {
        if (!startAt || !endAt) return "N/A";
        try {
            const start = new Date(startAt);
            const end = new Date(endAt);
            const diffMs = end - start;
            const hours = Math.floor(diffMs / (1000 * 60 * 60));
            const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
            
            if (hours > 0 && minutes > 0) {
                return `${hours} hour${hours > 1 ? 's' : ''} ${minutes} minute${minutes > 1 ? 's' : ''}`;
            } else if (hours > 0) {
                return `${hours} hour${hours > 1 ? 's' : ''}`;
            } else {
                return `${minutes} minute${minutes > 1 ? 's' : ''}`;
            }
        } catch {
            return "N/A";
        }
    };

    // Check if training is happening now (current time is between start_at and end_at)
    const isHappeningToday = (training) => {
        if (!training.start_at) return false;
        try {
            const start = new Date(training.start_at);
            const end = training.end_at ? new Date(training.end_at) : null;
            const now = new Date();
            
            // Check if same date (year, month, day)
            const isSameDate = start.getFullYear() === now.getFullYear() &&
                             start.getMonth() === now.getMonth() &&
                             start.getDate() === now.getDate();
            
            if (!isSameDate) return false;
            
            // If end_at is available, check if current time is between start and end
            if (end) {
                return now >= start && now <= end;
            }
            
            // If no end_at, only check if it's the same date
            return isSameDate;
        } catch {
            return false;
        }
    };

    // View training details
    const viewDetails = (training) => {
        setSelectedTraining(training);
        setShowDetails(true);
    };

    // Calculate completion rate
    const getCompletionRate = () => {
        const total = completed.length + upcoming.length + pendingAttendance.length;
        if (total === 0) return 0;
        return Math.round((completed.length / total) * 100);
    };

    // Calculate training hours this month
    const getHoursThisMonth = () => {
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        
        let totalMinutes = 0;
        completed.forEach(training => {
            if (training.start_at && training.end_at) {
                const start = new Date(training.start_at);
                if (start.getMonth() === currentMonth && start.getFullYear() === currentYear) {
                    const end = new Date(training.end_at);
                    const minutes = (end - start) / (1000 * 60);
                    if (minutes > 0) totalMinutes += minutes;
                }
            }
        });
        return Math.round(totalMinutes / 60 * 10) / 10;
    };

    // Calculate days until next training
    const getDaysUntilNext = () => {
        if (upcoming.length === 0) return null;
        const sortedUpcoming = [...upcoming].sort((a, b) => {
            const dateA = new Date(a.start_at || a.date);
            const dateB = new Date(b.start_at || b.date);
            return dateA - dateB;
        });
        const nextTraining = sortedUpcoming[0];
        const nextDate = new Date(nextTraining.start_at || nextTraining.date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        nextDate.setHours(0, 0, 0, 0);
        const diffTime = nextDate - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return { days: diffDays, training: nextTraining };
    };

    // Stats
    const completionRate = getCompletionRate();
    const hoursThisMonth = getHoursThisMonth();
    const nextTrainingInfo = getDaysUntilNext();
    const stats = {
        completionRate,
        hoursThisMonth,
        nextTrainingInfo,
    };

    // Search-filtered lists
    const normalizeForSearch = (t) => {
        const haystack = [t.title, t.venue]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();
        return haystack;
    };

    const filteredUpcoming = upcoming.filter((t) => {
        if (!searchQuery) return true;
        return normalizeForSearch(t).includes(searchQuery.toLowerCase());
    });

    const filteredPendingAttendance = pendingAttendance.filter((t) => {
        if (!searchQuery) return true;
        return normalizeForSearch(t).includes(searchQuery.toLowerCase());
    });

    const filteredCompleted = completed.filter((t) => {
        if (!searchQuery) return true;
        return normalizeForSearch(t).includes(searchQuery.toLowerCase());
    });

    // View certificate - open PDF in new tab
    const handleViewCertificate = (certificateUrl, e) => {
        if (e) {
            e.stopPropagation();
        }
        if (certificateUrl) {
            window.open(certificateUrl, '_blank', 'noopener,noreferrer');
        }
    };

    // Handle training certificate upload
    const handleTrainingCertUpload = async () => {
        if (!trainingCertFile || !trainingForCert) {
            alert("Please select a certificate file.");
            return;
        }

        if (!userId) {
            alert('User ID not available. Please try again.');
            return;
        }

        if (isUploading) {
            return; // Prevent double submission
        }

        setIsUploading(true);

        try {
            // Get employee name for attendance update
            const attendanceStatus = getEmployeeAttendanceStatus(trainingForCert);
            if (!attendanceStatus.employeeName) {
                throw new Error('Could not find your name in attendance records');
            }

            // Check if certificate already exists for this training and employee
            const { data: existingCertificates, error: fetchError } = await supabase
                .from('certificates')
                .select('*')
                .eq('employee_id', userId)
                .eq('training_id', trainingForCert.id);

            if (fetchError) {
                console.error('Error fetching existing certificates:', fetchError);
            }

            // Delete old certificate from storage and database if it exists
            if (existingCertificates && existingCertificates.length > 0) {
                for (const oldCert of existingCertificates) {
                    // Extract file path from URL
                    const oldUrl = oldCert.certificate_url;
                    if (oldUrl) {
                        // Get the file name from the URL
                        const urlParts = oldUrl.split('/');
                        const oldFileName = urlParts[urlParts.length - 1];
                        
                        // Delete from storage
                        const { error: deleteStorageError } = await supabase.storage
                            .from('certificates')
                            .remove([oldFileName]);

                        if (deleteStorageError) {
                            console.error('Error deleting old file from storage:', deleteStorageError);
                        }
                    }

                    // Delete from certificates table
                    const { error: deleteCertError } = await supabase
                        .from('certificates')
                        .delete()
                        .eq('id', oldCert.id);

                    if (deleteCertError) {
                        console.error('Error deleting old certificate record:', deleteCertError);
                    }
                }
            }

            // Generate unique filename
            const timestamp = Date.now();
            const fileExt = trainingCertFile.name.split('.').pop();
            const fileName = `training_${trainingForCert.id}_${userId}_${timestamp}_${Math.random().toString(36).substring(7)}.${fileExt}`;
            const filePath = `${fileName}`;

            // Upload file to Supabase storage (certificates bucket)
            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('certificates')
                .upload(filePath, trainingCertFile);

            if (uploadError) {
                console.error('Upload error:', uploadError);
                throw new Error(`Failed to upload certificate: ${uploadError.message}`);
            }

            // Get public URL
            const { data: { publicUrl } } = supabase.storage
                .from('certificates')
                .getPublicUrl(filePath);

            // Insert into certificates table
            const { data: certificateData, error: certificateError } = await supabase
                .from('certificates')
                .insert({
                    employee_id: userId,
                    training_id: trainingForCert.id,
                    certificate_url: publicUrl
                })
                .select()
                .single();

            if (certificateError) {
                console.error('Certificate table error:', certificateError);
                throw new Error(`Failed to save certificate record: ${certificateError.message}`);
            }

            // Update attendance in training record
            const currentAttendance = trainingForCert.attendance || {};
            currentAttendance[attendanceStatus.employeeName] = {
                status: true,
                certificate_url: publicUrl
            };

            const { error: updateError } = await supabase
                .from('trainings')
                .update({ attendance: currentAttendance })
                .eq('id', trainingForCert.id);

            if (updateError) {
                throw new Error(`Failed to update attendance: ${updateError.message}`);
            }

            // Refresh trainings
            await fetchTrainings();
            
            setShowTrainingCertUpload(false);
            setTrainingCertFile(null);
            setTrainingForCert(null);
            setSuccessMessage({
                title: 'Certificate Uploaded',
                description: 'Your training certificate has been successfully uploaded and saved.'
            });
            setShowSuccessModal(true);
        } catch (error) {
            console.error('Error uploading certificate:', error);
            alert(`Error uploading certificate: ${error.message}`);
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <>
            {/* Content */}
            <div className="w-full py-8">
                {/* Page Header */}
                <div className="mb-8">
                    <h1 className="text-2xl font-bold text-gray-800">Trainings & Orientation</h1>
                    <p className="text-gray-500 mt-1">View your assigned schedules and upload external certificates</p>
                </div>

                {/* Main Content Card with Tabs (Upcoming / History) */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-">
                    {/* Tabs */}
                    <div className="border-b border-gray-200">
                        <div className="flex">
                            <button
                                onClick={() => setActiveTab('upcoming')}
                                className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                                    activeTab === 'upcoming'
                                        ? 'border-red-600 text-red-600 bg-red-50/50'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                                }`}
                            >
                                <div className="flex items-center gap-2">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                    Upcoming Schedules
                                    <span className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full">{upcoming.length}</span>
                                </div>
                            </button>
                            <button
                                onClick={() => setActiveTab('pending')}
                                className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                                    activeTab === 'pending'
                                        ? 'border-red-600 text-red-600 bg-red-50/50'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                                }`}
                            >
                                <div className="flex items-center gap-2">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    Pending Attendance
                                    <span className="bg-orange-100 text-orange-700 text-xs px-2 py-0.5 rounded-full">{pendingAttendance.length}</span>
                                </div>
                            </button>
                            <button
                                onClick={() => setActiveTab('history')}
                                className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                                    activeTab === 'history'
                                        ? 'border-red-600 text-red-600 bg-red-50/50'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                                }`}
                            >
                                <div className="flex items-center gap-2">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    History
                                    <span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full">{completed.length}</span>
                                </div>
                            </button>
                        </div>
                    </div>

                    {/* Search bar */}
                    <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
                        <div className="relative flex-1">
                            <svg
                                className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                            <input
                                type="text"
                                placeholder="Search by training title or venue..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 bg-white"
                            />
                        </div>
                    </div>

                    {/* Tab content */}
                    {loading ? (
                        <div className="px-6 py-12 text-center text-gray-500 h-[500px] flex items-center justify-center">
                            <p>Loading trainings...</p>
                        </div>
                    ) : activeTab === 'upcoming' ? (
                        filteredUpcoming.length === 0 ? (
                            <div className="px-6 py-12 text-center text-gray-500 h-[500px] flex flex-col items-center justify-center">
                                <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <p className="font-medium">No upcoming schedules</p>
                                <p className="text-sm mt-1">You have no upcoming training schedules assigned.</p>
                            </div>
                        ) : (
                            <div className="relative h-[500px] overflow-y-auto no-scrollbar p-4 space-y-3">
                                {filteredUpcoming.map((training) => (
                                    <div
                                        key={training.id}
                                        className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md hover:border-blue-300 transition-all cursor-pointer group"
                                        onClick={() => viewDetails(training)}
                                    >
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex items-start gap-4 flex-1">
                                                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center text-white shadow-md flex-shrink-0">
                                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                                    </svg>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <h3 className="text-base font-bold text-gray-900 group-hover:text-blue-600 transition-colors">{training.title}</h3>
                                                        {isHappeningToday(training) && (
                                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 text-xs font-semibold rounded-full">
                                                                <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                                                                Happening Now
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600">
                                                        <span className="font-medium">{formatDate(training.date)}</span>
                                                        <span className="text-gray-300">•</span>
                                                        <span>{formatTime(training.start_at)} - {formatEndTime(training.end_at)}</span>
                                                        <span className="text-gray-300">•</span>
                                                        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-700">
                                                            {training.schedule_type === 'online' ? 'Online' : 'Onsite'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )
                    ) : activeTab === 'pending' ? (
                        filteredPendingAttendance.length === 0 ? (
                            <div className="px-6 py-12 text-center text-gray-500 h-[500px] flex flex-col items-center justify-center">
                                <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <p className="font-medium">No pending attendance</p>
                                <p className="text-sm mt-1">All completed trainings have been marked by HR.</p>
                            </div>
                        ) : (
                            <div className="relative h-[500px] overflow-y-auto no-scrollbar p-4 space-y-3">
                                {filteredPendingAttendance.map((training) => (
                                    <div
                                        key={training.id}
                                        className="bg-white border border-orange-200 rounded-xl p-5 hover:shadow-md hover:border-orange-300 transition-all cursor-pointer group"
                                        onClick={() => viewDetails(training)}
                                    >
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex items-start gap-4 flex-1">
                                                <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center text-white shadow-md flex-shrink-0">
                                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                    </svg>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h3 className="text-base font-bold text-gray-900 mb-2 group-hover:text-orange-600 transition-colors">{training.title}</h3>
                                                    <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600">
                                                        <span className="font-medium">{formatDate(training.date)}</span>
                                                        <span className="text-gray-300">•</span>
                                                        <span>{formatTime(training.start_at)} - {formatEndTime(training.end_at)}</span>
                                                        <span className="text-gray-300">•</span>
                                                        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-700">
                                                            {training.schedule_type === 'online' ? 'Online' : 'Onsite'}
                                                        </span>
                                                        <span className="text-gray-300">•</span>
                                                        <span className="text-xs font-semibold text-orange-600 bg-orange-100 px-2 py-0.5 rounded-full">Pending HR Confirmation</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )
                    ) : filteredCompleted.length === 0 ? (
                        <div className="px-6 py-12 text-center text-gray-500 h-[500px] flex flex-col items-center justify-center">
                            <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <p className="font-medium">No completed schedules</p>
                            <p className="text-sm mt-1">Completed schedules will appear here.</p>
                        </div>
                    ) : (
                        <div className="relative h-[500px] overflow-y-auto no-scrollbar p-4 space-y-4">
                            {filteredCompleted.map((training) => (
                                <div
                                    key={training.id}
                                    className="bg-gradient-to-br from-white to-gray-50 border border-gray-200 rounded-xl p-6 hover:shadow-lg hover:border-green-400 transition-all group cursor-pointer"
                                    onClick={() => viewDetails(training)}
                                >
                                    <div className="flex gap-5">
                                        <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center text-white shadow-lg flex-shrink-0 group-hover:scale-105 transition-transform">
                                            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between gap-3 mb-3">
                                                <div className="flex-1">
                                                    <h3 className="text-lg font-bold text-gray-900 group-hover:text-green-600 transition-colors mb-1">{training.title}</h3>
                                                    {training.venue && (
                                                        <p className="text-sm text-gray-600 flex items-center gap-1.5">
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                                            </svg>
                                                            {training.venue}
                                                        </p>
                                                    )}
                                                </div>
                                                {training.attendance && (() => {
                                                    const attendanceStatus = getEmployeeAttendanceStatus(training);
                                                    if (attendanceStatus.isPresent === null) return null;
                                                    
                                                    return (
                                                        <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold text-xs flex-shrink-0 ${
                                                            attendanceStatus.isPresent 
                                                                ? 'bg-green-100 border border-green-300 text-green-700' 
                                                                : 'bg-red-100 border border-red-300 text-red-700'
                                                        }`}>
                                                            {attendanceStatus.isPresent ? (
                                                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                                </svg>
                                                            ) : (
                                                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                                </svg>
                                                            )}
                                                            <span>{attendanceStatus.isPresent ? 'Present' : 'Absent'}</span>
                                                        </div>
                                                    );
                                                })()}
                                            </div>
                                            
                                            <div className="flex flex-wrap items-center gap-2.5 text-sm mt-3">
                                                <div className="flex items-center gap-1.5 text-gray-700">
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                    </svg>
                                                    <span className="font-medium">{formatDate(training.date)}</span>
                                                </div>
                                                <span className="text-gray-300">•</span>
                                                <div className="flex items-center gap-1.5 text-gray-700">
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                    </svg>
                                                    <span>{formatTime(training.start_at)} - {formatEndTime(training.end_at)}</span>
                                                </div>
                                                <span className="text-gray-300">•</span>
                                                <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-200 text-gray-700">
                                                    {training.schedule_type === 'online' ? '🌐 Online' : '📍 Onsite'}
                                                </span>
                                            </div>
                                            
                                            {training.attendance && (() => {
                                                const attendanceStatus = getEmployeeAttendanceStatus(training);
                                                
                                                if (attendanceStatus.isPresent === true) {
                                                    const hrCertificate = generatedCertificates[training.id];
                                                    
                                                    return hrCertificate ? (
                                                        <button
                                                            onClick={(e) => handleViewCertificate(hrCertificate.certificate_url, e)}
                                                            className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all text-sm font-medium shadow-sm hover:shadow-md"
                                                        >
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                            </svg>
                                                            View Certificate
                                                        </button>
                                                    ) : null;
                                                }
                                                return null;
                                            })()}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Training Details Modal */}
            {showDetails && selectedTraining && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center px-4 z-50" onClick={() => setShowDetails(false)}>
                    <div className="bg-white rounded-xl w-full max-w-6xl shadow-xl flex flex-col max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
                        {/* Header - Fixed */}
                        <div className="px-6 py-4 border-b border-gray-200 flex-shrink-0 bg-gradient-to-r from-blue-50 to-indigo-50 relative">
                            <h2 className="text-center font-bold text-xl text-gray-800">Schedule Details</h2>
                            <p className="text-center text-xs text-gray-500 mt-1">Complete information about this schedule</p>
                            <button 
                                onClick={() => setShowDetails(false)} 
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full p-2 transition-all"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        
                        {/* Content - Scrollable */}
                        <div className="flex-1 overflow-y-auto px-6 py-5">
                            <div className="space-y-4">
                                
                                {/* Training Image - At Top */}
                                {selectedTraining.image_url && (
                                    <div className="bg-gray-50 rounded-lg p-3">
                                        <div className="rounded border border-gray-200 bg-white p-2">
                                            <img 
                                                src={selectedTraining.image_url} 
                                                alt={selectedTraining.title}
                                                className="w-full h-auto max-h-48 object-contain rounded"
                                                onError={(e) => {
                                                    e.target.style.display = 'none';
                                                }}
                                            />
                                        </div>
                                    </div>
                                )}

                                {/* Training Title & Description */}
                                <div className="bg-gray-50 rounded-lg p-4">
                                    <div className="space-y-3">
                                        <div>
                                            <p className="text-xs text-gray-500 font-medium mb-1">Title</p>
                                            <p className="text-base text-gray-900 font-semibold">{selectedTraining.title}</p>
                                        </div>
                                        
                                        {selectedTraining.description && (
                                            <div className="pt-2 border-t border-gray-200">
                                                <p className="text-xs text-gray-500 font-medium mb-1">Description</p>
                                                <p className="text-sm text-gray-900 whitespace-pre-line leading-relaxed">{selectedTraining.description}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Schedule Details */}
                                <div className="bg-gray-50 rounded-lg p-4">
                                    <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wide mb-3">Schedule Details</h3>
                                    <div className="space-y-3">
                                        <div>
                                            <p className="text-xs text-gray-500 font-medium mb-1">Date</p>
                                            <p className="text-sm text-gray-900 font-semibold">
                                                {selectedTraining.start_at && selectedTraining.end_at && new Date(selectedTraining.end_at).toDateString() !== new Date(selectedTraining.start_at).toDateString()
                                                    ? `${new Date(selectedTraining.start_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} - ${new Date(selectedTraining.end_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
                                                    : selectedTraining.start_at ? new Date(selectedTraining.start_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : formatDate(selectedTraining.date)
                                                }
                                            </p>
                                        </div>
                                        
                                        <div>
                                            <p className="text-xs text-gray-500 font-medium mb-1">Time</p>
                                            <p className="text-sm text-gray-900 font-semibold">{formatTime(selectedTraining.start_at)} - {formatEndTime(selectedTraining.end_at)}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Location & Type */}
                                <div className="bg-gray-50 rounded-lg p-4">
                                    <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wide mb-3">Location & Type</h3>
                                    <div className="space-y-3">
                                        <div>
                                            <p className="text-xs text-gray-500 font-medium mb-1">Schedule Type</p>
                                            <span className={`inline-block px-2 py-1 rounded-full text-xs font-semibold ${selectedTraining.schedule_type === 'online' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                                                {selectedTraining.schedule_type === 'online' ? 'Online' : 'Onsite'}
                                            </span>
                                        </div>
                                        
                                        {selectedTraining.venue && (
                                            <div className="pt-2 border-t border-gray-200">
                                                <p className="text-xs text-gray-500 font-medium mb-1">{selectedTraining.schedule_type === 'online' ? 'Meeting Link' : 'Venue'}</p>
                                                {selectedTraining.schedule_type === 'online' ? (
                                                    <a 
                                                        href={selectedTraining.venue} 
                                                        target="_blank" 
                                                        rel="noopener noreferrer"
                                                        className="text-sm text-blue-600 hover:text-blue-700 hover:underline inline-block break-all font-medium"
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        {selectedTraining.venue}
                                                    </a>
                                                ) : (
                                                    <p className="text-sm text-gray-900 font-semibold">{selectedTraining.venue}</p>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* My Attendance Status */}
                                {selectedTraining.attendance && (() => {
                                    const attendanceStatus = getEmployeeAttendanceStatus(selectedTraining);
                                    if (attendanceStatus.isPresent === null) return null;
                                    
                                    return (
                                        <div className="bg-gray-50 rounded-lg p-4">
                                            <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wide mb-3">My Attendance Status</h3>
                                            <div className={`p-4 rounded-lg border-2 ${
                                                attendanceStatus.isPresent
                                                    ? 'bg-green-50 border-green-300'
                                                    : 'bg-red-50 border-red-300'
                                            }`}>
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                                                        attendanceStatus.isPresent
                                                            ? 'bg-green-500'
                                                            : 'bg-red-500'
                                                    }`}>
                                                        {attendanceStatus.isPresent ? (
                                                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                                            </svg>
                                                        ) : (
                                                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                                                            </svg>
                                                        )}
                                                    </div>
                                                    <div>
                                                        <p className={`text-lg font-bold ${
                                                            attendanceStatus.isPresent
                                                                ? 'text-green-700'
                                                                : 'text-red-700'
                                                        }`}>
                                                            {attendanceStatus.isPresent ? 'Present' : 'Absent'}
                                                        </p>
                                                        <p className={`text-sm ${
                                                            attendanceStatus.isPresent
                                                                ? 'text-green-600'
                                                                : 'text-red-600'
                                                        }`}>
                                                            {attendanceStatus.isPresent
                                                                ? 'You attended this training'
                                                                : 'You did not attend this training'
                                                            }
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })()}
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="border-t border-gray-100 px-6 py-3 bg-gray-50 flex justify-end flex-shrink-0">
                            <button
                                onClick={() => setShowDetails(false)}
                                className="px-5 py-2 rounded-lg bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors font-semibold text-sm shadow-sm"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Success Modal */}
            {showSuccessModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center px-4 z-50" onClick={() => setShowSuccessModal(false)}>
                    <div className="bg-white rounded-xl w-full max-w-md shadow-2xl" onClick={(e) => e.stopPropagation()}>
                        {/* Header */}
                        <div className="px-6 py-4 border-b border-gray-200">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-gray-900">{successMessage.title}</h2>
                                    <p className="text-sm text-gray-500 mt-0.5">Operation completed</p>
                                </div>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="px-6 py-4">
                            <p className="text-sm text-gray-700">
                                {successMessage.description}
                            </p>
                        </div>

                        {/* Footer */}
                        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end">
                            <button
                                onClick={() => setShowSuccessModal(false)}
                                className="px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors font-medium text-sm"
                            >
                                OK
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Training Certificate Upload Modal */}
            {showTrainingCertUpload && trainingForCert && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center px-4 z-50" onClick={() => {
                    setShowTrainingCertUpload(false);
                    setTrainingCertFile(null);
                    setTrainingForCert(null);
                }}>
                    <div className="bg-white rounded-xl w-full max-w-2xl shadow-2xl" onClick={(e) => e.stopPropagation()}>
                        {/* Header */}
                        <div className="px-6 py-4 border-b border-gray-200">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h2 className="text-xl font-bold text-gray-900">Upload Training Certificate</h2>
                                    <p className="text-sm text-gray-500 mt-1">Upload certificate for: {trainingForCert.title}</p>
                                </div>
                                <button 
                                    onClick={() => {
                                        setShowTrainingCertUpload(false);
                                        setTrainingCertFile(null);
                                        setTrainingForCert(null);
                                    }}
                                    className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full p-2 transition-all"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="p-6">
                            {/* Instructions */}
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                                <div className="flex items-start gap-3">
                                    <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <div>
                                        <h3 className="text-sm font-semibold text-blue-900 mb-1">Upload Guidelines</h3>
                                        <ul className="text-sm text-blue-800 space-y-1">
                                            <li>• Accepted formats: <span className="font-medium">PDF, JPG, JPEG, PNG</span></li>
                                            <li>• Maximum file size: <span className="font-medium">10 MB</span></li>
                                            <li>• This certificate will be linked to your attendance record</li>
                                            {trainingForCert && getEmployeeAttendanceStatus(trainingForCert).certificateUrl && (
                                                <li className="text-orange-800 font-medium">• Uploading a new file will replace the existing certificate</li>
                                            )}
                                        </ul>
                                    </div>
                                </div>
                            </div>

                            {/* File Upload Area */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Certificate <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="file"
                                    onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                            const maxSize = 10 * 1024 * 1024; // 10MB
                                            const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
                                            
                                            if (!allowedTypes.includes(file.type)) {
                                                alert('Only PDF, JPG, JPEG, and PNG files are allowed');
                                                e.target.value = '';
                                                return;
                                            }
                                            
                                            if (file.size > maxSize) {
                                                alert('File size must be less than 10MB');
                                                e.target.value = '';
                                                return;
                                            }
                                            
                                            setTrainingCertFile(file);
                                        }
                                    }}
                                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                                    accept=".pdf,.jpg,.jpeg,.png"
                                />
                                {trainingCertFile && (
                                    <div className="mt-3 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                                </svg>
                                                <div>
                                                    <p className="text-sm font-medium text-gray-900">{trainingCertFile.name}</p>
                                                    <p className="text-xs text-gray-500">{(trainingCertFile.size / 1024 / 1024).toFixed(2)} MB</p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => setTrainingCertFile(null)}
                                                className="text-red-600 hover:text-red-800 hover:bg-red-50 rounded-full p-1 transition-colors"
                                            >
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                </svg>
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3">
                            <button
                                onClick={() => {
                                    setShowTrainingCertUpload(false);
                                    setTrainingCertFile(null);
                                    setTrainingForCert(null);
                                }}
                                className="px-4 py-2 rounded-lg bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors font-medium text-sm"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleTrainingCertUpload}
                                disabled={!trainingCertFile || isUploading}
                                className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors font-medium text-sm disabled:bg-gray-300 disabled:cursor-not-allowed"
                            >
                                {isUploading ? 'Uploading...' : 'Upload Certificate'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            

        </>
    );
}

export default EmployeeTrainings;
