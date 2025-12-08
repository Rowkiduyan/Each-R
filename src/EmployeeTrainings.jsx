import { Link } from "react-router-dom";
import React, { useState, useEffect } from "react";
import { useEmployeeUser } from "./layouts/EmployeeLayout";
import { supabase } from './supabaseClient';

function EmployeeTrainings() {
    const { userId, userEmail, employeeUser } = useEmployeeUser();
    const [loading, setLoading] = useState(true);
    const [upcoming, setUpcoming] = useState([]);
    const [pendingAttendance, setPendingAttendance] = useState([]);
    const [completed, setCompleted] = useState([]);
    const [selectedTraining, setSelectedTraining] = useState(null);
    const [showDetails, setShowDetails] = useState(false);
    const [showUpload, setShowUpload] = useState(false);
    const [activeTab, setActiveTab] = useState("upcoming");
    const [searchQuery, setSearchQuery] = useState("");
    const [currentEmployeeData, setCurrentEmployeeData] = useState(null);
    
    // External training upload state
    const [externalTrainings, setExternalTrainings] = useState([]);
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [uploadError, setUploadError] = useState(null);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [certificateToDelete, setCertificateToDelete] = useState(null);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [successMessage, setSuccessMessage] = useState({ title: '', description: '' });
    const [isUploading, setIsUploading] = useState(false);
    
    // Training certificate upload state
    const [showTrainingCertUpload, setShowTrainingCertUpload] = useState(false);
    const [trainingCertFile, setTrainingCertFile] = useState(null);
    const [trainingForCert, setTrainingForCert] = useState(null);

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

    // Fetch external trainings from database
    useEffect(() => {
        const fetchExternalTrainings = async () => {
            if (!userId) return;

            try {
                const { data, error } = await supabase
                    .from('external_trainings')
                    .select('*')
                    .eq('user_id', userId)
                    .order('uploaded_at', { ascending: false });

                if (error) {
                    console.error('Error fetching external trainings:', error);
                    return;
                }

                if (data) {
                    setExternalTrainings(data);
                }
            } catch (err) {
                console.error('Error in fetchExternalTrainings:', err);
            }
        };

        fetchExternalTrainings();
    }, [userId]);

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

    // Handle upload training
    const handleUploadTraining = async () => {
        if (selectedFiles.length === 0) {
            alert("Please select at least one file to upload.");
            return;
        }

        // Validate that all files have titles
        const filesWithoutTitles = selectedFiles.filter(item => !item.title || item.title.trim() === '');
        if (filesWithoutTitles.length > 0) {
            alert("Please provide a title for all certificates before uploading.");
            return;
        }

        if (!userId) {
            alert('User ID not available. Please try again.');
            return;
        }

        if (isUploading) {
            return; // Prevent multiple simultaneous uploads
        }

        setIsUploading(true);

        try {
            const uploadPromises = selectedFiles.map(async (item) => {
                const file = item.file;
                const title = item.title.trim();
                
                // Generate unique filename
                const timestamp = Date.now();
                const fileExt = file.name.split('.').pop();
                const fileName = `${userId}_${timestamp}_${Math.random().toString(36).substring(7)}.${fileExt}`;
                const filePath = `${userId}/${fileName}`;

                // Upload file to Supabase storage
                const { data: uploadData, error: uploadError } = await supabase.storage
                    .from('external-trainings')
                    .upload(filePath, file);

                if (uploadError) {
                    console.error('Upload error:', uploadError);
                    throw new Error(`Failed to upload ${file.name}`);
                }

                // Get public URL
                const { data: { publicUrl } } = supabase.storage
                    .from('external-trainings')
                    .getPublicUrl(filePath);

                // Insert record into database
                const { data: dbData, error: dbError } = await supabase
                    .from('external_trainings')
                    .insert({
                        user_id: userId,
                        name: file.name,
                        title: title,
                        certificate_url: publicUrl,
                        uploaded_at: new Date().toISOString()
                    })
                    .select()
                    .single();

                if (dbError) {
                    console.error('Database error:', dbError);
                    throw new Error(`Failed to save ${file.name} to database`);
                }

                return dbData;
            });

            // Wait for all uploads to complete
            const uploadedTrainings = await Promise.all(uploadPromises);

            // Update local state with newly uploaded trainings
            setExternalTrainings([...uploadedTrainings, ...externalTrainings]);
            setSelectedFiles([]);
            setUploadError(null);
            setShowUpload(false);
            setSuccessMessage({
                title: 'Upload Successful',
                description: 'Your certificates have been successfully uploaded and are now visible in your profile.'
            });
            setShowSuccessModal(true);
        } catch (error) {
            console.error('Error uploading files:', error);
            alert(`Error uploading files: ${error.message}`);
        } finally {
            setIsUploading(false);
        }
    };

    const handleFileChange = (e) => {
        const files = Array.from(e.target.files);
        const maxSize = 10 * 1024 * 1024; // 10MB in bytes
        const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
        
        const validFiles = [];
        const invalidFiles = [];
        
        files.forEach(file => {
            const isValidType = allowedTypes.includes(file.type);
            const isValidSize = file.size <= maxSize;
            
            if (isValidType && isValidSize) {
                // Store file with title field
                validFiles.push({
                    file: file,
                    title: ''
                });
            } else {
                let reason;
                if (!isValidType && !isValidSize) {
                    reason = 'invalid format and file size exceeds 10MB limit';
                } else if (!isValidType) {
                    reason = 'invalid format';
                } else {
                    reason = 'file size exceeds 10MB limit';
                }
                invalidFiles.push({ name: file.name, reason });
            }
        });
        
        if (validFiles.length > 0) {
            setSelectedFiles(prev => [...prev, ...validFiles]);
        }
        
        if (invalidFiles.length > 0) {
            setUploadError(invalidFiles);
        } else {
            setUploadError(null);
        }
    };

    const removeFile = (index) => {
        setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    };

    const updateFileTitle = (index, title) => {
        setSelectedFiles(prev => prev.map((item, i) => 
            i === index ? { ...item, title } : item
        ));
    };

    // Delete certificate - show confirmation modal
    const handleDeleteCertificate = (certificate, e) => {
        e.stopPropagation();
        setCertificateToDelete(certificate);
        setShowDeleteModal(true);
    };

    // Confirm delete certificate
    const confirmDeleteCertificate = async () => {
        if (!certificateToDelete) return;

        try {
            // Extract file path from URL
            const url = new URL(certificateToDelete.certificate_url);
            const pathParts = url.pathname.split('/storage/v1/object/public/external-trainings/');
            const filePath = pathParts[1];

            // Delete from storage
            const { error: storageError } = await supabase.storage
                .from('external-trainings')
                .remove([filePath]);

            if (storageError) {
                console.error('Storage deletion error:', storageError);
            }

            // Delete from database
            const { error: dbError } = await supabase
                .from('external_trainings')
                .delete()
                .eq('id', certificateToDelete.id);

            if (dbError) {
                throw new Error('Failed to delete certificate from database');
            }

            // Update local state
            setExternalTrainings(prev => prev.filter(t => t.id !== certificateToDelete.id));
            setShowDeleteModal(false);
            setCertificateToDelete(null);
            setSuccessMessage({
                title: 'Delete Successful',
                description: 'The certificate has been permanently removed from your records.'
            });
            setShowSuccessModal(true);
        } catch (error) {
            console.error('Error deleting certificate:', error);
            alert(`Error deleting certificate: ${error.message}`);
            setShowDeleteModal(false);
            setCertificateToDelete(null);
        }
    };

    // View certificate
    const handleViewCertificate = (certificate, e) => {
        e.stopPropagation();
        window.open(certificate.certificate_url, '_blank');
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
                            <button
                                onClick={() => setActiveTab('certificates')}
                                className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                                    activeTab === 'certificates'
                                        ? 'border-red-600 text-red-600 bg-red-50/50'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                                }`}
                            >
                                <div className="flex items-center gap-2">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                    Other Certificates
                                    <span className="bg-purple-100 text-purple-700 text-xs px-2 py-0.5 rounded-full">{externalTrainings.length}</span>
                                </div>
                            </button>
                        </div>
                    </div>

                    {/* Search + Upload button bar */}
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
                        {activeTab === 'certificates' && (
                            <button
                                onClick={() => setShowUpload(true)}
                                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2 text-sm font-medium self-start sm:self-auto"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                </svg>
                                Upload Certificate
                            </button>
                        )}
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
                    ) : activeTab === 'certificates' ? (
                        externalTrainings.length === 0 ? (
                            <div className="px-6 py-12 text-center text-gray-500 h-[500px] flex flex-col items-center justify-center">
                                <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                <p className="font-medium">No uploaded certificates</p>
                                <p className="text-sm mt-1">Your uploaded training certificates will appear here.</p>
                            </div>
                        ) : (
                            <div className="relative h-[500px] overflow-y-auto no-scrollbar p-6">
                                <div className="space-y-2">
                                    {externalTrainings.map((training) => (
                                        <div
                                            key={training.id}
                                            onClick={(e) => handleViewCertificate(training, e)}
                                            className="group bg-white border border-gray-200 rounded-lg p-3 hover:border-purple-300 hover:bg-purple-50/30 transition-all cursor-pointer"
                                        >
                                            <div className="flex items-center gap-3">
                                                {/* File Icon */}
                                                <div className="flex-shrink-0">
                                                    <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center group-hover:bg-purple-200 transition-colors">
                                                        <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                        </svg>
                                                    </div>
                                                </div>

                                                {/* File Info */}
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-semibold text-gray-900 truncate group-hover:text-purple-700 transition-colors">
                                                        {training.title || training.name}
                                                    </p>
                                                    <p className="text-xs text-gray-500 mt-0.5">
                                                        {training.title && training.name !== training.title && (
                                                            <span className="text-gray-400">{training.name} • </span>
                                                        )}
                                                        Uploaded {formatDate(training.uploaded_at)}
                                                    </p>
                                                </div>

                                                {/* Action Buttons */}
                                                <div className="flex items-center gap-1 flex-shrink-0">
                                                    <button
                                                        onClick={(e) => handleViewCertificate(training, e)}
                                                        className="p-2 text-purple-600 hover:bg-purple-100 rounded-lg transition-colors"
                                                        title="View certificate"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                        </svg>
                                                    </button>
                                                    <button
                                                        onClick={(e) => handleDeleteCertificate(training, e)}
                                                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                        title="Delete certificate"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                        </svg>
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
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
                        <div className="relative h-[500px] overflow-y-auto no-scrollbar p-4 space-y-3">
                            {filteredCompleted.map((training) => (
                                <div
                                    key={training.id}
                                    className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md hover:border-green-300 transition-all group"
                                >
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex items-start gap-4 flex-1 cursor-pointer" onClick={() => viewDetails(training)}>
                                            <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center text-white shadow-md flex-shrink-0">
                                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-start justify-between gap-3 mb-2">
                                                    <h3 className="text-base font-bold text-gray-900 group-hover:text-green-600 transition-colors">{training.title}</h3>
                                                    {training.attendance && (() => {
                                                        const attendanceStatus = getEmployeeAttendanceStatus(training);
                                                        if (attendanceStatus.isPresent === null) return null;
                                                        
                                                        return (
                                                            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold text-sm flex-shrink-0 ${
                                                                attendanceStatus.isPresent 
                                                                    ? 'bg-green-50 border border-green-200 text-green-700' 
                                                                    : 'bg-red-50 border border-red-200 text-red-700'
                                                            }`}>
                                                                {attendanceStatus.isPresent ? (
                                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                                    </svg>
                                                                ) : (
                                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                                    </svg>
                                                                )}
                                                                <span>{attendanceStatus.isPresent ? 'Present' : 'Absent'}</span>
                                                            </div>
                                                        );
                                                    })()}
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
                                        {training.attendance && (() => {
                                            const attendanceStatus = getEmployeeAttendanceStatus(training);
                                            if (attendanceStatus.isPresent === true) {
                                                // Check if certificate URL is valid (not null, not empty, and is a string)
                                                const hasCertificate = attendanceStatus.certificateUrl && 
                                                                      typeof attendanceStatus.certificateUrl === 'string' && 
                                                                      attendanceStatus.certificateUrl.trim().length > 0 &&
                                                                      (attendanceStatus.certificateUrl.startsWith('http://') || 
                                                                       attendanceStatus.certificateUrl.startsWith('https://'));
                                                
                                                return (
                                                    <div className="flex items-center gap-2 flex-shrink-0">
                                                        {hasCertificate && (
                                                            <button
                                                                onClick={async (e) => {
                                                                    e.stopPropagation();
                                                                    try {
                                                                        // Try to open the certificate
                                                                        const newWindow = window.open(attendanceStatus.certificateUrl, '_blank');
                                                                        if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
                                                                            // Popup was blocked
                                                                            alert('Please allow popups for this website to view the certificate.');
                                                                        }
                                                                    } catch (error) {
                                                                        console.error('Error opening certificate:', error);
                                                                        alert('Unable to open certificate. The file may have been deleted.');
                                                                    }
                                                                }}
                                                                className="px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:from-green-600 hover:to-green-700 transition-all shadow-sm hover:shadow-md text-sm font-semibold flex items-center gap-2"
                                                                title="View certificate"
                                                            >
                                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                                </svg>
                                                                View Certificate
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setTrainingForCert(training);
                                                                setTrainingCertFile(null);
                                                                setShowTrainingCertUpload(true);
                                                            }}
                                                            className={`px-4 py-2 rounded-lg transition-all shadow-sm hover:shadow-md text-sm font-semibold flex items-center gap-2 ${
                                                                hasCertificate
                                                                    ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700'
                                                                    : 'bg-gradient-to-r from-indigo-500 to-indigo-600 text-white hover:from-indigo-600 hover:to-indigo-700'
                                                            }`}
                                                        >
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                                            </svg>
                                                            {hasCertificate ? 'Update Certificate' : 'Upload Certificate'}
                                                        </button>
                                                    </div>
                                                );
                                            }
                                            return null;
                                        })()}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Training Details Modal */}
            {showDetails && selectedTraining && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center px-4 z-50" onClick={() => setShowDetails(false)}>
                    <div className="bg-white rounded-2xl w-full max-w-5xl shadow-2xl max-h-[85vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
                        {/* Header */}
                        <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h2 className="text-lg font-bold text-gray-900">Schedule Details</h2>
                                    <p className="text-xs text-gray-500 mt-0.5">Complete information about this training session</p>
                                </div>
                                <button 
                                    onClick={() => setShowDetails(false)} 
                                    className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full p-2 transition-all"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        </div>

                        {/* Content - Two Column Layout */}
                        <div className="flex-1 overflow-hidden flex">
                            {/* Left Side - Training Information */}
                            <div className="w-[40%] overflow-y-auto p-6 border-r border-gray-200">
                                {/* Title Section */}
                                <div className="mb-4">
                                    <h3 className="text-xl font-bold text-gray-900">{selectedTraining.title}</h3>
                                </div>

                                {/* Description Section */}
                                <div className="mb-6">
                                    <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{selectedTraining.description || 'No description provided'}</p>
                                </div>

                                {/* Basic Info */}
                                <div className="space-y-3">
                                    {/* Date */}
                                    <div>
                                        <p className="text-xs text-gray-500 mb-1">Date</p>
                                        <p className="text-sm font-semibold text-gray-900">{formatDate(selectedTraining.date)}</p>
                                    </div>
                                    
                                    {/* Time Row - Start and End Side by Side */}
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <p className="text-xs text-gray-500 mb-1">Start Time</p>
                                            <p className="text-sm font-semibold text-gray-900">{formatTime(selectedTraining.start_at)}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500 mb-1">End Time</p>
                                            <p className="text-sm font-semibold text-gray-900">{formatEndTime(selectedTraining.end_at)}</p>
                                        </div>
                                    </div>
                                    
                                    {/* Duration */}
                                    <div>
                                        <p className="text-xs text-gray-500 mb-1">Duration</p>
                                        <p className="text-sm font-semibold text-gray-900">{calculateDuration(selectedTraining.start_at, selectedTraining.end_at)}</p>
                                    </div>
                                    
                                    {/* Schedule Type */}
                                    <div>
                                        <p className="text-xs text-gray-500 mb-1">Schedule Type</p>
                                        <p className="text-sm font-semibold text-gray-900">
                                            {selectedTraining.schedule_type === 'online' ? 'Online' : 'Onsite'}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Right Side - Attendees List */}
                            <div className="w-[60%] flex flex-col bg-gray-50">
                                <div className="p-4 border-b border-gray-200 bg-white">
                                    <h3 className="text-sm font-bold text-gray-900">
                                        Attendees ({selectedTraining.attendees?.length || 0})
                                    </h3>
                                </div>
                                
                                <div className="flex-1 overflow-y-auto p-3">
                                    <div className="grid grid-cols-2 gap-2">
                                        {selectedTraining.attendees?.map((attendee, idx) => {
                                            const name = typeof attendee === "string" ? attendee : attendee.name || "";
                                            const attendedFlag = !!selectedTraining.attendance?.[name];
                                            // Only show attendance status for completed trainings (not active and has attendance data with at least one marked attendee)
                                            const hasMarkedAttendance = selectedTraining.attendance && Object.keys(selectedTraining.attendance).length > 0 && Object.values(selectedTraining.attendance).some(val => val === true || val === false);
                                            return (
                                                <div 
                                                    key={idx} 
                                                    className="bg-white rounded-lg p-3 border border-gray-200 hover:shadow-sm transition-all"
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center text-white text-xs font-semibold shadow-sm flex-shrink-0">
                                                            {name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-xs font-medium text-gray-900 truncate">{name}</p>
                                                            {!selectedTraining.is_active && hasMarkedAttendance && (
                                                                <span
                                                                    className={`inline-flex items-center text-[10px] px-1.5 py-0.5 rounded-full font-semibold mt-0.5 ${
                                                                        attendedFlag
                                                                            ? "bg-green-100 text-green-700"
                                                                            : "bg-red-100 text-red-700"
                                                                    }`}
                                                                >
                                                                    {attendedFlag ? "✓" : "✗"}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="border-t border-gray-100 px-6 py-3 bg-gray-50 flex justify-end">
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

            {/* Upload Training Modal */}
            {showUpload && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center px-4 z-50" onClick={() => setShowUpload(false)}>
                    <div className="bg-white rounded-xl w-full max-w-2xl shadow-2xl" onClick={(e) => e.stopPropagation()}>
                        {/* Header */}
                        <div className="px-6 py-4 border-b border-gray-200">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h2 className="text-xl font-bold text-gray-900">Upload Certificates</h2>
                                    <p className="text-sm text-gray-500 mt-1">Upload your external certificate/s</p>
                                </div>
                                <button 
                                    onClick={() => {
                                        setShowUpload(false);
                                        setSelectedFiles([]);
                                        setUploadError(null);
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
                                            <li>• Maximum file size: <span className="font-medium">10 MB per file</span></li>
                                            <li>• You can upload multiple files at once</li>
                                        </ul>
                                    </div>
                                </div>
                            </div>

                            {/* File Upload Area */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Certificates <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="file"
                                    multiple
                                    onChange={handleFileChange}
                                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                                    accept=".pdf,.jpg,.jpeg,.png"
                                />
                            </div>

                            {/* Error Message */}
                            {uploadError && Array.isArray(uploadError) && uploadError.length > 0 && (
                                <div className="mt-3 space-y-1">
                                    {uploadError.map((error, index) => (
                                        <div key={index} className="flex items-start gap-2 text-xs text-red-600">
                                            <svg className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            <span><span className="font-medium">{error.name}:</span> {error.reason}</span>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Selected Files List */}
                            {selectedFiles.length > 0 && (
                                <div className="mt-4">
                                    <h3 className="text-sm font-medium text-gray-700 mb-2">Selected Files ({selectedFiles.length})</h3>
                                    <div className="space-y-3 max-h-96 overflow-y-auto">
                                        {selectedFiles.map((item, index) => (
                                            <div key={index} className="p-3 bg-gray-50 border border-gray-200 rounded-lg space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-3 flex-1 min-w-0">
                                                        <svg className="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                                        </svg>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-sm font-medium text-gray-900 truncate">{item.file.name}</p>
                                                            <p className="text-xs text-gray-500">{(item.file.size / 1024 / 1024).toFixed(2)} MB</p>
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={() => removeFile(index)}
                                                        className="ml-3 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-full p-1 transition-colors flex-shrink-0"
                                                    >
                                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                        </svg>
                                                    </button>
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-medium text-gray-700 mb-1">
                                                        Certificate Title <span className="text-red-500">*</span>
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={item.title}
                                                        onChange={(e) => updateFileTitle(index, e.target.value)}
                                                        placeholder="e.g., First Aid Certification, Safety Training"
                                                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                        required
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3">
                            <button
                                onClick={() => {
                                    setShowUpload(false);
                                    setSelectedFiles([]);
                                    setUploadError(null);
                                }}
                                disabled={isUploading}
                                className="px-4 py-2 rounded-lg bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleUploadTraining}
                                disabled={selectedFiles.length === 0 || isUploading}
                                className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors font-medium text-sm disabled:bg-gray-300 disabled:cursor-not-allowed"
                            >
                                {isUploading ? 'Uploading...' : `Upload ${selectedFiles.length > 0 ? `(${selectedFiles.length})` : ''}`}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteModal && certificateToDelete && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center px-4 z-50" onClick={() => setShowDeleteModal(false)}>
                    <div className="bg-white rounded-xl w-full max-w-md shadow-2xl" onClick={(e) => e.stopPropagation()}>
                        {/* Header */}
                        <div className="px-6 py-4 border-b border-gray-200">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                                    <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                    </svg>
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-gray-900">Delete Certificate</h2>
                                    <p className="text-sm text-gray-500 mt-0.5">This action cannot be undone</p>
                                </div>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="px-6 py-4">
                            <p className="text-sm text-gray-700">
                                Are you sure you want to delete <span className="font-semibold text-gray-900">"{certificateToDelete.title || certificateToDelete.name}"</span>? This will permanently remove the certificate from your records.
                            </p>
                        </div>

                        {/* Footer */}
                        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3">
                            <button
                                onClick={() => {
                                    setShowDeleteModal(false);
                                    setCertificateToDelete(null);
                                }}
                                className="px-4 py-2 rounded-lg bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors font-medium text-sm"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmDeleteCertificate}
                                className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors font-medium text-sm"
                            >
                                Delete
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
