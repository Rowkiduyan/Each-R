import { Link } from 'react-router-dom';
import React, { useState, useEffect, useRef } from "react";
import { supabase } from './supabaseClient';
import emailjs from '@emailjs/browser';
import { generateTrainingCertificates, checkTrainingCertificates } from './utils/simpleCertificateGenerator';
import { validateNoSunday, validateOfficeHours } from './utils/dateTimeRules';

function HrTrainings() {
  const [loading, setLoading] = useState(true);
  const [upcoming, setUpcoming] = useState([]);
  const [pendingAttendance, setPendingAttendance] = useState([]);
  const [completed, setCompleted] = useState([]);
  const [selectedTraining, setSelectedTraining] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showAttendance, setShowAttendance] = useState(false);
  const [actionMenuOpen, setActionMenuOpen] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [currentUserRole, setCurrentUserRole] = useState(null);
  const [currentUserDepot, setCurrentUserDepot] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [trainingToDelete, setTrainingToDelete] = useState(null);
  
  // Alert and confirmation modals
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const [showConfirmAddModal, setShowConfirmAddModal] = useState(false);
  const [isCreatingTraining, setIsCreatingTraining] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  
  // Certificate management state
  const [generatingCertificates, setGeneratingCertificates] = useState(null);
  const [certificateStatus, setCertificateStatus] = useState({});
  const [showCertificateModal, setShowCertificateModal] = useState(false);
  const [certificateProgress, setCertificateProgress] = useState({
    total: 0,
    current: 0,
    status: 'preparing', // preparing, generating, complete, error
    message: '',
    successful: [],
    failed: []
  });
  
  const [form, setForm] = useState({
    title: "",
    venue: "",
    duration_start_date: "",
    time: "",
    end_date: "",
    end_time: "",
    description: "",
    schedule_type: "onsite", // onsite or online
    image_url: "",
    certificate_title: "Certificate of Completion",
    // Signature fields
    operations_manager_name: "",
    operations_manager_signature: null,
    safety_officer_name: "",
    safety_officer_signature: null,
    hr_manager_name: "",
    hr_manager_signature: null,
    general_manager_name: "",
    general_manager_signature: null
  });
  
  const [imageFile, setImageFile] = useState(null);
  
  // Signature file states
  const [signatureFiles, setSignatureFiles] = useState({
    operations_manager: null,
    safety_officer: null,
    hr_manager: null,
    general_manager: null
  });
  
  const [signatureFilesEdit, setSignatureFilesEdit] = useState({
    operations_manager: null,
    safety_officer: null,
    hr_manager: null,
    general_manager: null
  });
  
  const [editForm, setEditForm] = useState({
    title: "",
    venue: "",
    duration_start_date: "",
    time: "",
    end_date: "",
    end_time: "",
    description: "",
    schedule_type: "onsite",
    certificate_title: "Certificate of Completion",
    // Signature fields
    operations_manager_name: "",
    operations_manager_signature: null,
    safety_officer_name: "",
    safety_officer_signature: null,
    hr_manager_name: "",
    hr_manager_signature: null,
    general_manager_name: "",
    general_manager_signature: null
  });
  
  const [imageFileEdit, setImageFileEdit] = useState(null);
  
  // Position-based selection state for edit
  const [selectedPositionsEdit, setSelectedPositionsEdit] = useState([]);
  const [employeesByPositionMapEdit, setEmployeesByPositionMapEdit] = useState({});
  
  const [attendees, setAttendees] = useState([]);
  const [attendeesEdit, setAttendeesEdit] = useState([]);
  const [attendance, setAttendance] = useState({});
  
  // Employee / attendee search state
  const [employeeSearchQuery, setEmployeeSearchQuery] = useState("");
  const [employeeSearchQueryEdit, setEmployeeSearchQueryEdit] = useState("");
  const [showEmployeeSuggestions, setShowEmployeeSuggestions] = useState(false);
  const [showEmployeeSuggestionsEdit, setShowEmployeeSuggestionsEdit] = useState(false);
  const [employeeOptions, setEmployeeOptions] = useState([]);
  
  // Position-based selection state
  const [positions, setPositions] = useState([]);
  const [selectedPositions, setSelectedPositions] = useState([]); // Array of selected positions
  const [employeesByPositionMap, setEmployeesByPositionMap] = useState({}); // Map: position -> employees[]

  // Tab & search state for main table
  const [activeTab, setActiveTab] = useState("upcoming");
  const [searchQuery, setSearchQuery] = useState("");
  
  // Attendee search in details modal
  const [attendeeSearchQuery, setAttendeeSearchQuery] = useState("");

  // Fetch trainings from Supabase
  useEffect(() => {
    if (currentUserRole !== null) {
      fetchTrainings();
      loadSignatureDefaults();
    }
  }, [currentUserRole, currentUserDepot]);
  
  // Load saved signature defaults from database
  const loadSignatureDefaults = async () => {
    try {
      const { data, error } = await supabase
        .from('signature_defaults')
        .select('*')
        .maybeSingle();
      
      if (error) {
        console.warn('Signature defaults table not ready:', error.message);
        return;
      }
      
      if (data) {
        setForm(prev => ({
          ...prev,
          certificate_title: data.certificate_title || "Certificate of Completion",
          operations_manager_name: data.operations_manager_name || "",
          operations_manager_signature: data.operations_manager_signature || null,
          safety_officer_name: data.safety_officer_name || "",
          safety_officer_signature: data.safety_officer_signature || null,
          hr_manager_name: data.hr_manager_name || "",
          hr_manager_signature: data.hr_manager_signature || null,
          general_manager_name: data.general_manager_name || "",
          general_manager_signature: data.general_manager_signature || null,
        }));
      }
    } catch (error) {
      console.error('Error loading signature defaults:', error);
    }
  };
  
  // Save signature values as defaults in database
  const saveSignatureDefaults = async (signatureData) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Check if a record exists
      const { data: existing, error: fetchError } = await supabase
        .from('signature_defaults')
        .select('id')
        .maybeSingle();
      
      // If table doesn't exist or isn't accessible, log warning
      if (fetchError) {
        console.warn('⚠️ Signature defaults table not ready. Run the database migration: supabase/migrations/add_signature_system.sql');
        return;
      }
      
      if (existing) {
        // Update existing record
        const { error } = await supabase
          .from('signature_defaults')
          .update({
            certificate_title: signatureData.certificate_title,
            operations_manager_name: signatureData.operations_manager_name,
            operations_manager_signature: signatureData.operations_manager_signature,
            safety_officer_name: signatureData.safety_officer_name,
            safety_officer_signature: signatureData.safety_officer_signature,
            hr_manager_name: signatureData.hr_manager_name,
            hr_manager_signature: signatureData.hr_manager_signature,
            general_manager_name: signatureData.general_manager_name,
            general_manager_signature: signatureData.general_manager_signature,
            updated_by: user?.id
          })
          .eq('id', existing.id);
        
        if (error) {
          console.error('❌ Failed to update signature defaults:', error.message);
        }
      } else {
        // Insert new record if none exists
        const { error } = await supabase
          .from('signature_defaults')
          .insert({
            certificate_title: signatureData.certificate_title,
            operations_manager_name: signatureData.operations_manager_name,
            operations_manager_signature: signatureData.operations_manager_signature,
            safety_officer_name: signatureData.safety_officer_name,
            safety_officer_signature: signatureData.safety_officer_signature,
            hr_manager_name: signatureData.hr_manager_name,
            hr_manager_signature: signatureData.hr_manager_signature,
            general_manager_name: signatureData.general_manager_name,
            general_manager_signature: signatureData.general_manager_signature,
            updated_by: user?.id
          });
        
        if (error) {
          console.error('❌ Failed to save signature defaults. RLS policy needed:', error.message);
          console.warn('📋 Run this SQL in Supabase to fix:\n\nCREATE POLICY "Allow authenticated users to insert" ON signature_defaults FOR INSERT TO authenticated WITH CHECK (true);\nCREATE POLICY "Allow authenticated users to update" ON signature_defaults FOR UPDATE TO authenticated USING (true);');
        }
      }
    } catch (error) {
      console.error('❌ Error with signature defaults:', error.message);
    }
  };
  
  // Check certificate status for completed trainings
  // NOTE: Disabled until database setup is complete
  // Uncomment after running database_setup.sql
  /*
  useEffect(() => {
    const checkCertificates = async () => {
      for (const training of completed) {
        const result = await checkTrainingCertificates(training.id);
        if (result.success) {
          setCertificateStatus(prev => ({
            ...prev,
            [training.id]: result
          }));
        }
      }
    };
    
    if (completed.length > 0) {
      checkCertificates();
    }
  }, [completed]);
  */

  // Get current logged-in user (for created_by)
  useEffect(() => {
    const loadUser = async () => {
      try {
        const { data, error } = await supabase.auth.getUser();
        if (!error && data?.user) {
          setCurrentUserId(data.user.id);
          
          // Get user's role and depot from profiles table
          const { data: profile } = await supabase
            .from('profiles')
            .select('role, depot')
            .eq('id', data.user.id)
            .single();
          
          if (profile) {
            setCurrentUserRole(profile.role);
            setCurrentUserDepot(profile.depot);
          }
        }
      } catch (err) {
        console.error("Error fetching current user for trainings:", err);
      }
    };

    loadUser();
  }, []);

  // Load employees for attendee suggestions (from employees table)
  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const { data, error } = await supabase
          .from("employees")
          .select("id, fname, lname, mname, position, email");

        if (error) {
          console.error("Error loading employees for training attendees:", error);
          return;
        }

        const options =
          data?.map((emp) => {
            const lastFirst = [emp.lname, emp.fname].filter(Boolean).join(", ");
            const full = [lastFirst, emp.mname].filter(Boolean).join(" ");
            return {
              name: full || "Unnamed employee",
              email: emp.email,
              id: emp.id
            };
          }) || [];

        // Remove duplicates by name and sort
        const seen = new Set();
        const uniqueOptions = options.filter(emp => {
          if (seen.has(emp.name)) return false;
          seen.add(emp.name);
          return true;
        });
        const uniqueSorted = uniqueOptions.sort((a, b) =>
          a.name.localeCompare(b.name)
        );
        setEmployeeOptions(uniqueSorted);
      } catch (err) {
        console.error("Unexpected error loading employees for trainings:", err);
      }
    };

    fetchEmployees();
  }, []);

  // Load unique positions from employees table
  useEffect(() => {
    const fetchPositions = async () => {
      try {
        const { data, error } = await supabase
          .from("employees")
          .select("position");

        if (error) {
          console.error("Error loading positions:", error);
          return;
        }

        const uniquePositions = Array.from(
          new Set(
            (data || [])
              .map((emp) => emp.position)
              .filter((pos) => pos && pos.trim() !== "")
          )
        ).sort((a, b) => a.localeCompare(b));

        setPositions(uniquePositions);
      } catch (err) {
        console.error("Unexpected error loading positions:", err);
      }
    };

    fetchPositions();
  }, []);

  // Load employees for each selected position
  useEffect(() => {
    const fetchEmployeesForPositions = async () => {
      if (selectedPositions.length === 0) {
        setEmployeesByPositionMap({});
        setAttendees([]);
        return;
      }

      const newMap = { ...employeesByPositionMap };
      const allEmployees = new Set();

      // Fetch employees for each position
      for (const position of selectedPositions) {
        // Skip if we already have employees for this position
        if (newMap[position]) {
          // Add existing employees to the set
          newMap[position].forEach(emp => allEmployees.add(emp));
          continue;
        }

        try {
          const { data, error } = await supabase
            .from("employees")
            .select("id, fname, lname, mname, position")
            .eq("position", position);

          if (error) {
            console.error(`Error loading employees for position ${position}:`, error);
            continue;
          }

          const options =
            data?.map((emp) => {
              const lastFirst = [emp.lname, emp.fname].filter(Boolean).join(", ");
              const full = [lastFirst, emp.mname].filter(Boolean).join(" ");
              return full || "Unnamed employee";
            }) || [];

          newMap[position] = options;
          // Add employees to attendees
          options.forEach(emp => allEmployees.add(emp));
        } catch (err) {
          console.error(`Unexpected error loading employees for position ${position}:`, err);
        }
      }

      setEmployeesByPositionMap(newMap);
      // Merge with existing attendees (to keep manually added ones)
      setAttendees(prev => {
        const combined = new Set([...prev, ...allEmployees]);
        return [...combined];
      });
    };

    fetchEmployeesForPositions();
  }, [selectedPositions]);

  // Handle position selection
  const handlePositionSelect = (position) => {
    if (position && !selectedPositions.includes(position)) {
      setSelectedPositions([...selectedPositions, position]);
    }
  };

  // Handle position removal
  const handlePositionRemove = (positionToRemove) => {
    const updatedPositions = selectedPositions.filter(pos => pos !== positionToRemove);
    setSelectedPositions(updatedPositions);
    
    // Remove employees from this position
    const employeesToRemove = employeesByPositionMap[positionToRemove] || [];
    setAttendees(prev => prev.filter(emp => !employeesToRemove.includes(emp)));
    
    // Remove from map
    const updatedMap = { ...employeesByPositionMap };
    delete updatedMap[positionToRemove];
    setEmployeesByPositionMap(updatedMap);
  };


  const fetchTrainings = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('trainings')
        .select('*')
        .order('start_at', { ascending: true });

      if (error) {
        console.error('Error fetching trainings:', error);
        return;
      }

      // Filter trainings for HRC users
      let filteredData = data || [];
      if (currentUserRole === 'HRC') {
        // Get all user profiles to check depots and roles
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, role, depot');

        if (profiles) {
          // Create a map of user_id -> {role, depot}
          const userMap = {};
          profiles.forEach(p => {
            userMap[p.id] = { role: p.role, depot: p.depot };
          });

          // Filter trainings: show only if created by current HRC OR by HR with same depot
          filteredData = filteredData.filter(training => {
            // Show if created by current user
            if (training.created_by === currentUserId) {
              return true;
            }
            
            // Show if created by HR user with same depot
            const creator = userMap[training.created_by];
            if (creator && creator.role === 'HR' && creator.depot === currentUserDepot) {
              return true;
            }
            
            return false;
          });
        }
      }

      // Normalize and separate upcoming, pending attendance, and completed trainings
      const now = new Date();
      const upcomingTrainings = [];
      const pendingAttendanceTrainings = [];
      const completedTrainings = [];

      filteredData.forEach((training) => {
        const start = training.start_at ? new Date(training.start_at) : null;
        const end = training.end_at ? new Date(training.end_at) : null;
        const normalized = {
          ...training,
          // Parse as Date object to get local date/time components
          date: start ? start.getFullYear() + '-' + String(start.getMonth() + 1).padStart(2, '0') + '-' + String(start.getDate()).padStart(2, '0') : "",
          time: start ? String(start.getHours()).padStart(2, '0') + ':' + String(start.getMinutes()).padStart(2, '0') : "",
        };

        if (start) {
          // Use end_at if available, otherwise default to end of training day
          const trainingEnd = end || new Date(
            start.getFullYear(),
            start.getMonth(),
            start.getDate(),
            23, 59, 59, 999
          );

          // Training has ended
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
            upcomingTrainings.push(normalized);
          }
        } else {
          // No start date, treat as upcoming
          upcomingTrainings.push(normalized);
        }
      });

      // Sort upcoming in ascending order by date (soonest first)
      upcomingTrainings.sort((a, b) => {
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

      setUpcoming(upcomingTrainings);
      setPendingAttendance(pendingAttendanceTrainings);
      setCompleted(completedTrainings);
    } catch (error) {
      console.error('Error fetching trainings:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter employees based on search query (from employees table)
  const filteredEmployees = employeeSearchQuery
    ? employeeOptions.filter(emp =>
        emp.name.toLowerCase().includes(employeeSearchQuery.toLowerCase())
      )
    : [];
  
  const filteredEmployeesEdit = employeeSearchQueryEdit
    ? employeeOptions.filter(emp =>
        emp.name.toLowerCase().includes(employeeSearchQueryEdit.toLowerCase())
      )
    : [];

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    // Clear error for this field when user types
    if (fieldErrors[name]) {
      setFieldErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const onEditChange = (e) => {
    const { name, value } = e.target;
    setEditForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSignatureUpload = (role, file) => {
    if (file) {
      setSignatureFiles(prev => ({ ...prev, [role]: file }));
      setForm(prev => ({ ...prev, [`${role}_signature`]: file }));
    }
  };

  const handleSignatureUploadEdit = (role, file) => {
    if (file) {
      setSignatureFilesEdit(prev => ({ ...prev, [role]: file }));
      setEditForm(prev => ({ ...prev, [`${role}_signature`]: file }));
    }
  };

  const handleEmployeeSelect = (employee) => {
    const employeeName = typeof employee === 'string' ? employee : employee.name;
    if (!attendees.includes(employeeName)) {
      setAttendees((prev) => [...prev, employeeName]);
      // Clear attendees error when they add someone
      if (fieldErrors.attendees) {
        setFieldErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors.attendees;
          return newErrors;
        });
      }
    }
    setEmployeeSearchQuery("");
    setShowEmployeeSuggestions(false);
  };

  const handleEmployeeSelectEdit = (employee) => {
    const employeeName = typeof employee === 'string' ? employee : employee.name;
    if (!attendeesEdit.includes(employeeName)) {
      setAttendeesEdit((prev) => [...prev, employeeName]);
    }
    setEmployeeSearchQueryEdit("");
    setShowEmployeeSuggestionsEdit(false);
  };

  const removeAttendee = (idx) => {
    setAttendees((prev) => prev.filter((_, i) => i !== idx));
  };

  const removeAttendeeEdit = (idx) => {
    setAttendeesEdit((prev) => prev.filter((_, i) => i !== idx));
  };

  const onAttendeeKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const name = employeeSearchQuery.trim();
      if (!name) return;
      if (attendees.includes(name)) return;
      handleEmployeeSelect(name);
    }
  };

  const onAttendeeKeyDownEdit = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const name = employeeSearchQueryEdit.trim();
      if (!name) return;
      if (attendeesEdit.includes(name)) return;
      handleEmployeeSelectEdit(name);
    }
  };

  // Send email notifications to attendees
  const sendTrainingEmails = async (trainingData, attendeeNames) => {
    try {
      // Get employees with their personal emails
      const { data: employees, error: empError } = await supabase
        .from('employees')
        .select('id, fname, lname, mname, personal_email');

      if (empError) {
        console.error('Error fetching employees:', empError);
        return;
      }

      // Create maps for name to ID and ID to personal email
      const nameToIdMap = {};
      const idToEmailMap = {};
      const idToNameMap = {};
      
      employees.forEach(emp => {
        const lastFirst = [emp.lname, emp.fname].filter(Boolean).join(", ");
        const full = [lastFirst, emp.mname].filter(Boolean).join(" ");
        nameToIdMap[full] = emp.id;
        idToEmailMap[emp.id] = emp.personal_email;
        idToNameMap[emp.id] = full;
      });

      // Format date and time
      const trainingDate = new Date(trainingData.start_at);
      const formattedDate = trainingDate.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
      const formattedTime = trainingDate.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
      const endTime = new Date(trainingData.end_at).toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });

      // Send email to each attendee
      const emailPromises = attendeeNames.map(async (attendeeName) => {
        const employeeId = nameToIdMap[attendeeName];
        if (!employeeId) {
          console.warn(`No employee ID found for: ${attendeeName}`);
          return;
        }

        const email = idToEmailMap[employeeId];
        if (!email) {
          console.warn(`No personal email found for employee: ${attendeeName} (ID: ${employeeId})`);
          return;
        }

        const templateParams = {
          to_email: email,
          reply_to: email,
          to_name: attendeeName,
          training_title: trainingData.title,
          training_date: formattedDate,
          training_time: `${formattedTime} - ${endTime}`,
          training_venue: trainingData.venue || 'TBA',
          training_type: trainingData.schedule_type === 'online' ? 'Online Training' : 'On-site Training',
          training_image: trainingData.image_url || ''
        };

        try {
          const response = await emailjs.send(
            'service_gwgx09j',
            'template_yb96xd9',
            templateParams,
            'Ti2ZNs2V451t9EhdT'
          );
          console.log(`Email sent successfully to ${attendeeName} (${email}):`, response.status, response.text);
        } catch (error) {
          console.error(`Failed to send email to ${attendeeName} (${email}):`, error);
        }
      });

      await Promise.all(emailPromises);
      console.log('All training notification emails sent');
    } catch (error) {
      console.error('Error sending training emails:', error);
    }
  };

  // Create new training
  const onSubmit = async (e) => {
    e.preventDefault();
    
    // Validate all required fields and collect errors
    const errors = {};
    if (!form.title) errors.title = true;
    if (!form.duration_start_date) errors.duration_start_date = true;
    if (!form.time) errors.time = true;
    if (!form.end_time) errors.end_time = true;
    if (!form.venue) errors.venue = true;
    if (!form.description) errors.description = true;
    if (!attendees || attendees.length === 0) errors.attendees = true;
    
    // If there are validation errors, highlight fields and stop
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    
    // Clear any previous errors
    setFieldErrors({});
    
    // Show confirmation modal
    setShowConfirmAddModal(true);
  };
  
  // Actual submission after confirmation
  const confirmAddTraining = async () => {
    setIsCreatingTraining(true);

    // Create Date objects and format with local timezone to preserve the intended time
    const startAt = new Date(`${form.duration_start_date}T${form.time}:00`);
    const endDate = form.end_date || form.duration_start_date; // Use end_date if provided, otherwise same as start
    const endAt = new Date(`${endDate}T${form.end_time}:00`);
    
    // Format as ISO string with timezone offset (e.g., "2026-01-13T03:00:00+08:00")
    const formatWithTimezone = (date) => {
      const offset = -date.getTimezoneOffset();
      const sign = offset >= 0 ? '+' : '-';
      const hours = String(Math.floor(Math.abs(offset) / 60)).padStart(2, '0');
      const minutes = String(Math.abs(offset) % 60).padStart(2, '0');
      return date.getFullYear() + '-' +
        String(date.getMonth() + 1).padStart(2, '0') + '-' +
        String(date.getDate()).padStart(2, '0') + 'T' +
        String(date.getHours()).padStart(2, '0') + ':' +
        String(date.getMinutes()).padStart(2, '0') + ':00' +
        sign + hours + ':' + minutes;
    };
    
    const startAtISO = formatWithTimezone(startAt);
    const endAtISO = formatWithTimezone(endAt);
    
    if (endAt <= startAt) {
      setAlertMessage("End time must be after start time.");
      setShowAlertModal(true);
      setIsCreatingTraining(false);
      return;
    }
    
    const now = new Date();
    const isActiveFlag = endAt >= now;

    try {
      let uploadedImageUrl = null;

      // Upload image if file is selected
      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `${fileName}`;

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('schedule-trainings')
          .upload(filePath, imageFile, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) {
          console.error('Error uploading image:', uploadError);
          setAlertMessage(`Failed to upload image: ${uploadError.message}`);
          setShowAlertModal(true);
          setIsCreatingTraining(false);
          return;
        }

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('schedule-trainings')
          .getPublicUrl(filePath);
        
        uploadedImageUrl = publicUrl;
      }

      // Upload signature files (only if new files selected, otherwise use existing URLs)
      const signatureUrls = {
        operations_manager: form.operations_manager_signature,
        safety_officer: form.safety_officer_signature,
        hr_manager: form.hr_manager_signature,
        general_manager: form.general_manager_signature
      };

      for (const [role, file] of Object.entries(signatureFiles)) {
        if (file) {
          const fileExt = file.name.split('.').pop();
          const fileName = `${role}_${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;
          const filePath = `signatures/${fileName}`;

          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('schedule-trainings')
            .upload(filePath, file, {
              cacheControl: '3600',
              upsert: false
            });

          if (uploadError) {
            console.error(`Error uploading ${role} signature:`, uploadError);
            setAlertMessage(`Failed to upload ${role.replace('_', ' ')} signature: ${uploadError.message}`);
            setShowAlertModal(true);
            setIsCreatingTraining(false);
            return;
          }

          // Get public URL
          const { data: { publicUrl } } = supabase.storage
            .from('schedule-trainings')
            .getPublicUrl(filePath);
          
          signatureUrls[role] = publicUrl;
        }
      }

      // Save signature values as defaults for future trainings
      saveSignatureDefaults({
        certificate_title: form.certificate_title,
        operations_manager_name: form.operations_manager_name,
        operations_manager_signature: signatureUrls.operations_manager || form.operations_manager_signature,
        safety_officer_name: form.safety_officer_name,
        safety_officer_signature: signatureUrls.safety_officer || form.safety_officer_signature,
        hr_manager_name: form.hr_manager_name,
        hr_manager_signature: signatureUrls.hr_manager || form.hr_manager_signature,
        general_manager_name: form.general_manager_name,
        general_manager_signature: signatureUrls.general_manager || form.general_manager_signature
      });

      const { data, error } = await supabase
        .from('trainings')
        .insert([
          {
            title: form.title,
            venue: form.venue || null,
            start_at: startAtISO,
            end_at: endAtISO,
            description: form.description || null,
            // store attendees as plain names only
            attendees: attendees || [],
            // is_active is true only for present/future trainings
            is_active: isActiveFlag,
            created_by: currentUserId || null,
            schedule_type: form.schedule_type || 'onsite',
            image_url: uploadedImageUrl,
            certificate_title: form.certificate_title || 'Certificate of Completion',
            // Signature data
            operations_manager_name: form.operations_manager_name || null,
            operations_manager_signature: signatureUrls.operations_manager,
            safety_officer_name: form.safety_officer_name || null,
            safety_officer_signature: signatureUrls.safety_officer,
            hr_manager_name: form.hr_manager_name || null,
            hr_manager_signature: signatureUrls.hr_manager,
            general_manager_name: form.general_manager_name || null,
            general_manager_signature: signatureUrls.general_manager
          }
        ])
        .select()
        .single();

      if (error) {
        console.error('Error creating training:', error);
        setAlertMessage(`Failed to create training schedule: ${error.message || 'Unknown error'}`);
        setShowAlertModal(true);
        setIsCreatingTraining(false);
        return;
      }

      // Send email notifications to attendees
      if (data && attendees.length > 0) {
        await sendTrainingEmails(data, attendees);
      }

      // Reset form but reload signature defaults from database
      await loadSignatureDefaults();
      setForm(prev => ({ 
        ...prev,
        title: "", 
        venue: "", 
        duration_start_date: "", 
        time: "", 
        end_date: "", 
        end_time: "", 
        description: "", 
        schedule_type: "onsite", 
        image_url: ""
      }));
      setImageFile(null);
      setSignatureFiles({
        operations_manager: null,
        safety_officer: null,
        hr_manager: null,
        general_manager: null
      });
      setAttendees([]);
      setEmployeeSearchQuery("");
      setSelectedPositions([]);
      setEmployeesByPositionMap({});
      setShowAdd(false);
      setShowConfirmAddModal(false);
      setIsCreatingTraining(false);
      
      // Refresh list
      fetchTrainings();
      setSuccessMessage('Training schedule created and notifications sent to attendees!');
      setShowSuccessModal(true);
    } catch (error) {
      console.error('Error creating training:', error);
      setAlertMessage(`Failed to create training schedule: ${error.message || 'Unknown error'}`);
      setShowAlertModal(true);
      setIsCreatingTraining(false);
    }
  };

  // Update training
  const onSaveChanges = async (e) => {
    e.preventDefault();
    if (!selectedTraining) return;
    if (!editForm.title) {
      setAlertMessage("Title is required.");
      setShowAlertModal(true);
      return;
    }
    if (!editForm.duration_start_date || !editForm.time || !editForm.end_time) {
      setAlertMessage("Please provide start date, start time, and end time.");
      setShowAlertModal(true);
      return;
    }
    if (!editForm.venue) {
      setAlertMessage("Venue is required.");
      setShowAlertModal(true);
      return;
    }
    if (!editForm.description) {
      setAlertMessage("Description is required.");
      setShowAlertModal(true);
      return;
    }
    if (!attendeesEdit || attendeesEdit.length === 0) {
      setAlertMessage("At least one attendee is required.");
      setShowAlertModal(true);
      return;
    }

    // Create Date objects and format with local timezone to preserve the intended time
    const startAt = new Date(`${editForm.duration_start_date}T${editForm.time}:00`);
    const endDate = editForm.end_date || editForm.duration_start_date; // Use end_date if provided, otherwise same as start
    const endAt = new Date(`${endDate}T${editForm.end_time}:00`);
    
    // Format as ISO string with timezone offset (e.g., "2026-01-13T03:00:00+08:00")
    const formatWithTimezone = (date) => {
      const offset = -date.getTimezoneOffset();
      const sign = offset >= 0 ? '+' : '-';
      const hours = String(Math.floor(Math.abs(offset) / 60)).padStart(2, '0');
      const minutes = String(Math.abs(offset) % 60).padStart(2, '0');
      return date.getFullYear() + '-' +
        String(date.getMonth() + 1).padStart(2, '0') + '-' +
        String(date.getDate()).padStart(2, '0') + 'T' +
        String(date.getHours()).padStart(2, '0') + ':' +
        String(date.getMinutes()).padStart(2, '0') + ':00' +
        sign + hours + ':' + minutes;
    };
    
    const startAtISO = formatWithTimezone(startAt);
    const endAtISO = formatWithTimezone(endAt);
    
    if (endAt <= startAt) {
      setAlertMessage("End time must be after start time.");
      setShowAlertModal(true);
      return;
    }
    
    const now = new Date();
    const isActiveFlag = endAt >= now;

    try {
      let uploadedImageUrl = selectedTraining.image_url || null;

      // Upload new image if file is selected
      if (imageFileEdit) {
        const fileExt = imageFileEdit.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `${fileName}`;

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('schedule-trainings')
          .upload(filePath, imageFileEdit, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) {
          console.error('Error uploading image:', uploadError);
          setAlertMessage(`Failed to upload image: ${uploadError.message}`);
          setShowAlertModal(true);
          return;
        }

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('schedule-trainings')
          .getPublicUrl(filePath);
        
        uploadedImageUrl = publicUrl;
      }

      // Upload signature files for edit (only if new files selected, otherwise use existing URLs)
      const signatureUrls = {
        operations_manager: editForm.operations_manager_signature || selectedTraining.operations_manager_signature || null,
        safety_officer: editForm.safety_officer_signature || selectedTraining.safety_officer_signature || null,
        hr_manager: editForm.hr_manager_signature || selectedTraining.hr_manager_signature || null,
        general_manager: editForm.general_manager_signature || selectedTraining.general_manager_signature || null
      };

      for (const [role, file] of Object.entries(signatureFilesEdit)) {
        if (file) {
          const fileExt = file.name.split('.').pop();
          const fileName = `${role}_${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;
          const filePath = `signatures/${fileName}`;

          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('schedule-trainings')
            .upload(filePath, file, {
              cacheControl: '3600',
              upsert: false
            });

          if (uploadError) {
            console.error(`Error uploading ${role} signature:`, uploadError);
            setAlertMessage(`Failed to upload ${role.replace('_', ' ')} signature: ${uploadError.message}`);
            setShowAlertModal(true);
            return;
          }

          // Get public URL
          const { data: { publicUrl } } = supabase.storage
            .from('schedule-trainings')
            .getPublicUrl(filePath);
          
          signatureUrls[role] = publicUrl;
        }
      }

      // Save signature values as defaults for future trainings
      saveSignatureDefaults({
        certificate_title: editForm.certificate_title,
        operations_manager_name: editForm.operations_manager_name,
        operations_manager_signature: signatureUrls.operations_manager || editForm.operations_manager_signature,
        safety_officer_name: editForm.safety_officer_name,
        safety_officer_signature: signatureUrls.safety_officer || editForm.safety_officer_signature,
        hr_manager_name: editForm.hr_manager_name,
        hr_manager_signature: signatureUrls.hr_manager || editForm.hr_manager_signature,
        general_manager_name: editForm.general_manager_name,
        general_manager_signature: signatureUrls.general_manager || editForm.general_manager_signature
      });

      const { data, error } = await supabase
        .from('trainings')
        .update({
          title: editForm.title,
          venue: editForm.venue || null,
          start_at: startAtISO,
          end_at: endAtISO,
          description: editForm.description || null,
          // keep attendees as plain names only
          attendees: attendeesEdit || [],
          // keep is_active in sync with whether the training is in the future
          is_active: isActiveFlag,
          schedule_type: editForm.schedule_type || 'onsite',
          image_url: uploadedImageUrl,
          certificate_title: editForm.certificate_title || 'Certificate of Completion',
          // Signature data
          operations_manager_name: editForm.operations_manager_name || null,
          operations_manager_signature: signatureUrls.operations_manager,
          safety_officer_name: editForm.safety_officer_name || null,
          safety_officer_signature: signatureUrls.safety_officer,
          hr_manager_name: editForm.hr_manager_name || null,
          hr_manager_signature: signatureUrls.hr_manager,
          general_manager_name: editForm.general_manager_name || null,
          general_manager_signature: signatureUrls.general_manager
        })
        .eq('id', selectedTraining.id)
        .select()
        .single();

      if (error) {
        console.error('Error updating training:', error);
        setAlertMessage(`Failed to update training schedule: ${error.message || 'Unknown error'}`);
        setShowAlertModal(true);
        return;
      }

      setShowEdit(false);
      setSelectedTraining(null);
      setActionMenuOpen(null);
      
      // Refresh list
      fetchTrainings();
      setSuccessMessage('Training updated successfully!');
      setShowSuccessModal(true);
    } catch (error) {
      console.error('Error updating training:', error);
      setAlertMessage(`Failed to update training schedule: ${error.message || 'Unknown error'}`);
      setShowAlertModal(true);
    }
  };

  // Delete training - show confirmation modal
  const onDelete = (training) => {
    setTrainingToDelete(training);
    setShowDeleteModal(true);
    setActionMenuOpen(null);
  };

  // Confirm delete training
  const confirmDelete = async () => {
    if (!trainingToDelete) return;

    try {
      const { error } = await supabase
        .from('trainings')
        .delete()
        .eq('id', trainingToDelete.id);

      if (error) {
        console.error('Error deleting training:', error);
        setAlertMessage('Failed to delete training schedule');
        setShowAlertModal(true);
        setShowDeleteModal(false);
        setTrainingToDelete(null);
        return;
      }

      setShowDeleteModal(false);
      setTrainingToDelete(null);
      fetchTrainings();
      setSuccessMessage('Training schedule deleted successfully!');
      setShowSuccessModal(true);
    } catch (error) {
      console.error('Error deleting training:', error);
      setAlertMessage('Failed to delete training schedule');
      setShowAlertModal(true);
      setShowDeleteModal(false);
      setTrainingToDelete(null);
    }
  };

  // Open edit modal
  const openEdit = (training) => {
    setSelectedTraining(training);
    
    // Format end_time from end_at if available
    let endTime = "";
    if (training.end_at) {
      const endDate = new Date(training.end_at);
      const hours = endDate.getHours().toString().padStart(2, '0');
      const minutes = endDate.getMinutes().toString().padStart(2, '0');
      endTime = `${hours}:${minutes}`;
    }
    
    // Extract dates from timestamps
    const startDate = training.start_at ? new Date(training.start_at) : null;
    const endDateObj = training.end_at ? new Date(training.end_at) : null;
    
    const startDateStr = startDate ? startDate.getFullYear() + '-' + 
      String(startDate.getMonth() + 1).padStart(2, '0') + '-' + 
      String(startDate.getDate()).padStart(2, '0') : "";
    
    const endDateStr = endDateObj ? endDateObj.getFullYear() + '-' + 
      String(endDateObj.getMonth() + 1).padStart(2, '0') + '-' + 
      String(endDateObj.getDate()).padStart(2, '0') : "";
    
    // Check if same day, if so, don't set end_date
    const isSameDay = startDate && endDateObj && startDate.toDateString() === endDateObj.toDateString();
    
    setEditForm({
      title: training.title || "",
      venue: training.venue || "",
      duration_start_date: startDateStr,
      time: training.time || "",
      end_date: isSameDay ? "" : endDateStr,
      end_time: endTime,
      description: training.description || "",
      schedule_type: training.schedule_type || "onsite",
      certificate_title: training.certificate_title || "Certificate of Completion",
      operations_manager_name: training.operations_manager_name || "",
      operations_manager_signature: training.operations_manager_signature || null,
      safety_officer_name: training.safety_officer_name || "",
      safety_officer_signature: training.safety_officer_signature || null,
      hr_manager_name: training.hr_manager_name || "",
      hr_manager_signature: training.hr_manager_signature || null,
      general_manager_name: training.general_manager_name || "",
      general_manager_signature: training.general_manager_signature || null
    });
    setAttendeesEdit(
      (training.attendees || []).map((a) =>
        typeof a === "string" ? a : a.name || ""
      )
    );
    setImageFileEdit(null);
    setSelectedPositionsEdit([]);
    setEmployeesByPositionMapEdit({});
    
    // Reset signature files
    setSignatureFilesEdit({
      operations_manager: null,
      safety_officer: null,
      hr_manager: null,
      general_manager: null
    });
    
    setActionMenuOpen(null);
    setShowEdit(true);
  };
  
  // Handle position selection for edit
  const handlePositionSelectEdit = (position) => {
    if (position && !selectedPositionsEdit.includes(position)) {
      setSelectedPositionsEdit([...selectedPositionsEdit, position]);
    }
  };

  // Handle position removal for edit
  const handlePositionRemoveEdit = (positionToRemove) => {
    const updatedPositions = selectedPositionsEdit.filter(pos => pos !== positionToRemove);
    setSelectedPositionsEdit(updatedPositions);
    
    // Remove employees from this position
    const employeesToRemove = employeesByPositionMapEdit[positionToRemove] || [];
    setAttendeesEdit(prev => prev.filter(emp => !employeesToRemove.includes(emp)));
    
    // Remove from map
    const updatedMap = { ...employeesByPositionMapEdit };
    delete updatedMap[positionToRemove];
    setEmployeesByPositionMapEdit(updatedMap);
  };
  
  // Load employees for each selected position in edit mode
  useEffect(() => {
    const fetchEmployeesForPositionsEdit = async () => {
      if (selectedPositionsEdit.length === 0) {
        setEmployeesByPositionMapEdit({});
        return;
      }

      const newMap = { ...employeesByPositionMapEdit };
      const allEmployees = new Set();

      // Fetch employees for each position
      for (const position of selectedPositionsEdit) {
        // Skip if we already have employees for this position
        if (newMap[position]) {
          // Add existing employees to the set
          newMap[position].forEach(emp => allEmployees.add(emp));
          continue;
        }

        try {
          const { data, error } = await supabase
            .from("employees")
            .select("id, fname, lname, mname, position")
            .eq("position", position);

          if (error) {
            console.error(`Error loading employees for position ${position}:`, error);
            continue;
          }

          const options =
            data?.map((emp) => {
              const lastFirst = [emp.lname, emp.fname].filter(Boolean).join(", ");
              const full = [lastFirst, emp.mname].filter(Boolean).join(" ");
              return full || "Unnamed employee";
            }) || [];

          newMap[position] = options;
          // Add employees to attendees
          options.forEach(emp => allEmployees.add(emp));
        } catch (err) {
          console.error(`Unexpected error loading employees for position ${position}:`, err);
        }
      }

      setEmployeesByPositionMapEdit(newMap);
      // Merge with existing attendees (to keep manually added ones)
      setAttendeesEdit(prev => {
        const combined = new Set([...prev, ...allEmployees]);
        return [...combined];
      });
    };

    fetchEmployeesForPositionsEdit();
  }, [selectedPositionsEdit]);

  // Open attendance modal
  const openAttendance = (training) => {
    setSelectedTraining(training);
    const initialAttendance = {};
    (training.attendees || []).forEach((att) => {
      const name = typeof att === "string" ? att : att.name || "";
      if (!name) return;
      const existing = training.attendance || {};
      initialAttendance[name] = !!existing[name];
    });
    setAttendance(initialAttendance);
    setActionMenuOpen(null);
    setShowAttendance(true);
  };

  // Save attendance and mark as completed
  const saveAttendance = async () => {
    if (!selectedTraining) return;
    
    try {
      // Save attendance and mark as completed
      const { error } = await supabase
        .from('trainings')
        .update({
          attendance: attendance,
          is_active: false
        })
        .eq('id', selectedTraining.id);

      if (error) {
        console.error('Error saving attendance:', error);
        setAlertMessage('Failed to save attendance');
        setShowAlertModal(true);
        return;
      }

      setShowAttendance(false);
      
      // Get updated training data with attendance
      const { data: updatedTraining, error: fetchError } = await supabase
        .from('trainings')
        .select('*')
        .eq('id', selectedTraining.id)
        .single();
      
      if (!fetchError && updatedTraining) {
        // Automatically generate and send certificates for attendees marked as present
        await handleSendCertificates(updatedTraining);
      }
      
      setSelectedTraining(null);
      fetchTrainings();
    } catch (error) {
      console.error('Error saving attendance:', error);
      setAlertMessage('Failed to save attendance');
      setShowAlertModal(true);
    }
  };
  
  // Generate and send certificates for completed training
  const handleSendCertificates = async (training) => {
    if (!training || !training.attendance) {
      setAlertMessage('No attendance data found for this training');
      setShowAlertModal(true);
      return;
    }
    
    // Get list of attendees who were present
    const presentAttendees = [];
    for (const [name, status] of Object.entries(training.attendance)) {
      if (status === true) {
        // Try to find employee's user ID by matching name
        const matchingEmployee = employeeOptions.find(emp => emp.name === name);
        presentAttendees.push({
          name: name,
          userId: matchingEmployee?.id || null,
          email: matchingEmployee?.email || null
        });
      }
    }
    
    if (presentAttendees.length === 0) {
      setAlertMessage('No employees marked as present for this training');
      setShowAlertModal(true);
      return;
    }
    
    // Automatically generate certificates for all present employees
    try {
      // Show modal and initialize progress
      setShowCertificateModal(true);
      setCertificateProgress({
        total: presentAttendees.length,
        current: 0,
        status: 'preparing',
        message: 'Preparing certificate template...',
        successful: [],
        failed: []
      });
      
      setGeneratingCertificates(training.id);
      
      // Update progress as generating
      setCertificateProgress(prev => ({
        ...prev,
        status: 'generating',
        message: `Generating certificate 1 of ${presentAttendees.length}...`
      }));
      
      const result = await generateTrainingCertificates(training, presentAttendees);
      
      if (result.success) {
        const { successful, failed } = result.results;
        
        setCertificateProgress({
          total: presentAttendees.length,
          current: presentAttendees.length,
          status: 'complete',
          message: `Successfully generated ${successful.length} certificate(s)${failed.length > 0 ? ` (${failed.length} failed)` : ''}`,
          successful,
          failed
        });
        
        // Refresh certificate status
        const updatedStatus = await checkTrainingCertificates(training.id);
        setCertificateStatus(prev => ({
          ...prev,
          [training.id]: updatedStatus
        }));
      } else {
        setCertificateProgress(prev => ({
          ...prev,
          status: 'error',
          message: result.error || 'Failed to generate certificates'
        }));
      }
    } catch (error) {
      console.error('Error generating certificates:', error);
      setCertificateProgress(prev => ({
        ...prev,
        status: 'error',
        message: error.message || 'An error occurred while generating certificates'
      }));
    } finally {
      setGeneratingCertificates(null);
    }
  };

  // View training details
  const viewDetails = (training) => {
    console.log('Training details:', training);
    console.log('Image URL:', training.image_url);
    setSelectedTraining(training);
    setAttendeeSearchQuery(""); // Reset search when opening modal
    setShowDetails(true);
  };

  // Get initials from name
  const getInitials = (name) => {
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  // Generate consistent color based on name
  const getAvatarColor = (name) => {
    const colors = [
      'from-red-500 to-red-600',
      'from-blue-500 to-blue-600',
      'from-green-500 to-green-600',
      'from-purple-500 to-purple-600',
      'from-orange-500 to-orange-600',
      'from-pink-500 to-pink-600',
      'from-teal-500 to-teal-600',
      'from-indigo-500 to-indigo-600',
    ];
    const index = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length;
    return colors[index];
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

  // Format date range for multi-day trainings
  const formatDateRange = (training) => {
    if (!training.start_at) return 'Not set';
    const startDate = new Date(training.start_at);
    const endDate = training.end_at ? new Date(training.end_at) : startDate;
    
    const startStr = startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const endStr = endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    
    // Check if same day
    if (startDate.toDateString() === endDate.toDateString()) {
      return startStr;
    }
    
    return `${startStr} - ${endStr}`;
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

  // Check if training is happening today
  const isHappeningToday = (training) => {
    if (!training.start_at) return false;
    try {
      const now = new Date();
      const start = new Date(training.start_at);
      const end = training.end_at ? new Date(training.end_at) : null;
      
      // Check if current time is within the training duration
      if (end) {
        return now >= start && now <= end;
      }
      
      // Fallback: check if same date (year, month, day)
      const isSameDate = start.getFullYear() === now.getFullYear() &&
                       start.getMonth() === now.getMonth() &&
                       start.getDate() === now.getDate();
      
      return isSameDate;
    } catch {
      return false;
    }
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

  return (
    <>
      {/* Content */}
      <div className="w-full py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-800">Trainings & Orientation</h1>
          <p className="text-gray-500 mt-1">Manage schedules and track employee participation</p>
        </div>

        {/* Main Content Card with Tabs (Upcoming / History) */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-">
          {/* Tabs - styled like AgencyTrainings */}
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

          {/* Search + Add button bar */}
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
            {activeTab === 'upcoming' && (
              <button
                onClick={async () => {
                  setShowAdd(true);
                  // Reload signature defaults when opening modal
                  await loadSignatureDefaults();
                }}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2 text-sm font-medium self-start sm:self-auto"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Schedule
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
                <p className="font-medium">No upcoming </p>
                <p className="text-sm mt-1">Adjust your search or add a new schedule.</p>
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
                            <span className="font-medium">{formatDateRange(training)}</span>
                            <span className="text-gray-300">•</span>
                            <span>{formatTime(training.start_at)} - {formatEndTime(training.end_at)}</span>
                            <span className="text-gray-300">•</span>
                            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-700">
                              {training.schedule_type === 'online' ? 'Online' : 'Onsite'}
                            </span>
                            <span className="text-gray-300">•</span>
                            <span className="font-semibold text-blue-600">{training.attendees?.length || 0} attendees</span>
                          </div>
                        </div>
                      </div>
                      <div className="relative flex-shrink-0">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setActionMenuOpen(actionMenuOpen === training.id ? null : training.id);
                          }}
                          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                          <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                          </svg>
                        </button>
                        {actionMenuOpen === training.id && (
                          <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-gray-200 z-50">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                openEdit(training);
                              }}
                              className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 flex items-center gap-2 transition-colors rounded-t-lg"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                              Edit Details
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onDelete(training);
                              }}
                              className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors rounded-b-lg"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                              Delete Schedule
                            </button>
                          </div>
                        )}
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
                <p className="text-sm mt-1">All completed trainings have been marked.</p>
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
                            <span className="font-medium">{formatDateRange(training)}</span>
                            <span className="text-gray-300">•</span>
                            <span>{formatTime(training.start_at)} - {formatEndTime(training.end_at)}</span>
                            <span className="text-gray-300">•</span>
                            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-700">
                              {training.schedule_type === 'online' ? 'Online' : 'Onsite'}
                            </span>
                            <span className="text-gray-300">•</span>
                            <span className="font-semibold text-blue-600">{training.attendees?.length || 0} attendees</span>
                          </div>
                        </div>
                      </div>
                      <div className="relative flex-shrink-0">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setActionMenuOpen(actionMenuOpen === training.id ? null : training.id);
                          }}
                          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                          <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                          </svg>
                        </button>
                        {actionMenuOpen === training.id && (
                          <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-gray-200 z-50">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                openAttendance(training);
                              }}
                              className="w-full text-left px-4 py-2.5 text-sm text-orange-700 hover:bg-orange-50 hover:text-orange-600 flex items-center gap-2 transition-colors font-semibold"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              Mark Attendance
                            </button>
                          </div>
                        )}
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
            <div className="relative h-[500px] overflow-y-auto no-scrollbar p-4 space-y-3">
              {filteredCompleted.map((training) => (
                <div
                  key={training.id}
                  className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md hover:border-green-300 transition-all cursor-pointer group"
                  onClick={() => viewDetails(training)}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4 flex-1">
                      <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center text-white shadow-md flex-shrink-0">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-base font-bold text-gray-900 mb-2 group-hover:text-green-600 transition-colors">{training.title}</h3>
                        <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600">
                          <span className="font-medium">{formatDateRange(training)}</span>
                          <span className="text-gray-300">•</span>
                          <span>{formatTime(training.start_at)} - {formatEndTime(training.end_at)}</span>
                          <span className="text-gray-300">•</span>
                          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-700">
                            {training.schedule_type === 'online' ? 'Online' : 'Onsite'}
                          </span>
                          {training.attendance && (
                            <>
                              <span className="text-gray-300">•</span>
                              <span className="text-green-600 font-semibold">
                                {Object.values(training.attendance || {}).filter(Boolean).length} present
                              </span>
                              <span className="text-gray-300">/</span>
                              <span className="text-red-600 font-semibold">
                                {Object.values(training.attendance || {}).filter((v) => v === false).length} absent
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="relative flex-shrink-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setActionMenuOpen(actionMenuOpen === training.id ? null : training.id);
                        }}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                        </svg>
                      </button>
                      {actionMenuOpen === training.id && (
                        <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-gray-200 z-50">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onDelete(training);
                            }}
                            className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors rounded-lg"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            Delete
                          </button>
                        </div>
                      )}
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
                          : selectedTraining.start_at ? new Date(selectedTraining.start_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Not set'
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
                          {selectedTraining.venue || 'Not set'}
                        </a>
                      ) : (
                        <p className="text-sm text-gray-900 font-semibold">{selectedTraining.venue || 'Not set'}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Training Materials Section */}
                {selectedTraining.certificate_template_id && (
                  <div className="space-y-4">
                    <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wide pb-2 border-b border-gray-200">Training Materials</h3>
                    <div className="space-y-3">
                      <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-xs text-gray-500 font-medium mb-1">Certificate Template</p>
                        <p className="text-sm text-gray-900 font-semibold inline-flex items-center gap-1.5">
                          <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          {certificateTemplates.find(t => t.id === selectedTraining.certificate_template_id)?.template_name || 'Template assigned'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Attendees */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wide mb-3">
                    Attendees <span className="text-gray-500 font-normal">({selectedTraining.attendees?.length || 0})</span>
                  </h3>
                  <div className="max-h-40 overflow-y-auto border border-gray-200 rounded bg-white">
                    {selectedTraining.attendees && selectedTraining.attendees.length > 0 ? (
                      <div className="divide-y divide-gray-100">
                        {selectedTraining.attendees.map((attendee, index) => {
                          const attendeeName = typeof attendee === 'string' ? attendee : attendee.name || attendee;
                          const wasPresent = selectedTraining.attendance && selectedTraining.attendance[attendeeName] === true;
                          // Check if training has attendance recorded (meaning it's completed)
                          const hasAttendance = selectedTraining.attendance && Object.keys(selectedTraining.attendance).length > 0;
                          
                          return (
                            <div key={index} className={`px-3 py-2.5 flex items-center justify-between transition-colors ${
                              hasAttendance 
                                ? wasPresent 
                                  ? 'bg-green-50/50 hover:bg-green-50' 
                                  : 'bg-red-50/50 hover:bg-red-50'
                                : 'hover:bg-gray-50'
                            }`}>
                              <div className="flex items-center gap-2">
                                {hasAttendance && (
                                  <div className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center ${
                                    wasPresent 
                                      ? 'bg-green-500' 
                                      : 'bg-red-500'
                                  }`}>
                                    {wasPresent ? (
                                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                      </svg>
                                    ) : (
                                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                                      </svg>
                                    )}
                                  </div>
                                )}
                                <span className="text-sm text-gray-900 font-medium">{attendeeName}</span>
                                {hasAttendance && (
                                  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold inline-flex items-center gap-1 ${
                                    wasPresent 
                                      ? 'bg-green-100 text-green-800 border border-green-200' 
                                      : 'bg-red-100 text-red-800 border border-red-200'
                                  }`}>
                                    {wasPresent ? 'Present' : 'Absent'}
                                  </span>
                                )}
                              </div>
                              {hasAttendance && wasPresent && selectedTraining.certificate_template_id && (
                                <button
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    try {
                                      const employee = employeeOptions.find(emp => emp.name === attendeeName);
                                      if (!employee) {
                                        alert('Employee not found');
                                        return;
                                      }
                                      
                                      // Check if certificate already exists
                                      const { data: existingCerts } = await supabase
                                        .from('training_certificates')
                                        .select('certificate_url')
                                        .eq('training_id', selectedTraining.id)
                                        .eq('employee_id', employee.id)
                                        .single();
                                      
                                      if (existingCerts?.certificate_url) {
                                        window.open(existingCerts.certificate_url, '_blank');
                                      } else {
                                        alert('Certificate not yet generated. Certificates are automatically generated when attendance is marked.');
                                      }
                                    } catch (error) {
                                      console.error('Error:', error);
                                      alert('Certificate not found. Please generate certificates first.');
                                    }
                                  }}
                                  className="text-xs px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors font-medium"
                                >
                                  View Certificate
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="px-3 py-4 text-center text-sm text-gray-500">
                        No attendees
                      </div>
                    )}
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Training Modal */}
      {showAdd && !showConfirmAddModal && (
      <div className="fixed inset-0 bg-black/40 flex items-center justify-center px-4 z-50">
          <div className="bg-white rounded-xl w-full max-w-4xl shadow-xl flex flex-col max-h-[90vh]">
            {/* Header - Fixed */}
            <div className="px-6 py-4 border-b border-gray-200 flex-shrink-0 bg-gradient-to-r from-red-50 to-orange-50">
              <h2 className="text-center font-bold text-xl text-gray-800">Add Training Schedule</h2>
              <p className="text-center text-xs text-gray-500 mt-1">Fill in the details below</p>
            </div>
            
            {/* Content - Single Column Scrollable */}
            <div className="flex-1 overflow-y-auto px-6 py-5">
              <form onSubmit={onSubmit}>
                <div className="space-y-4">
                  {/* Title and Schedule Type */}
                  <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-0.5">
                          Title <span className="text-red-500">*</span>
                        </label>
                        <input
                          name="title"
                          value={form.title}
                          onChange={onChange}
                          required
                          className={`w-full rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors ${
                            fieldErrors.title ? 'border-2 border-red-500' : 'border border-gray-300 focus:border-red-500'
                          }`}
                          placeholder="Personal Development"
                        />
                      </div>
                      
                      {/* Schedule Type Selection */}
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-0.5">
                          Schedule Type <span className="text-red-500">*</span>
                        </label>
                        <div className="flex gap-4 mt-1.5">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              name="schedule_type"
                              value="onsite"
                              checked={form.schedule_type === "onsite"}
                              onChange={onChange}
                              className="w-4 h-4 text-red-600 focus:ring-red-500"
                            />
                            <span className="text-sm text-gray-700 font-medium">Onsite</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              name="schedule_type"
                              value="online"
                              checked={form.schedule_type === "online"}
                              onChange={onChange}
                              className="w-4 h-4 text-red-600 focus:ring-red-500"
                            />
                            <span className="text-sm text-gray-700 font-medium">Online</span>
                          </label>
                        </div>
                      </div>
                    </div>
                    
                    {/* Image Upload */}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-0.5">
                        Training Image <span className="text-gray-500 font-normal">(PNG, JPG, max 10MB)</span>
                      </label>
                      <div className="relative">
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/jpg"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              // Check file size (10MB = 10 * 1024 * 1024 bytes)
                              if (file.size > 10 * 1024 * 1024) {
                                setAlertMessage('File size must be less than 10MB');
                                setShowAlertModal(true);
                                e.target.value = '';
                                return;
                              }
                              // Check file type
                              if (!['image/png', 'image/jpeg', 'image/jpg'].includes(file.type)) {
                                setAlertMessage('Only PNG and JPG files are allowed');
                                setShowAlertModal(true);
                                e.target.value = '';
                                return;
                              }
                              setImageFile(file);
                            }
                          }}
                          className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors file:mr-2 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-red-50 file:text-red-700 hover:file:bg-red-100"
                        />
                        {imageFile && (
                          <p className="text-xs text-gray-500 mt-1 truncate">{imageFile.name}</p>
                        )}
                      </div>
                    </div>
                    
                    {/* Venue */}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-0.5">
                        {form.schedule_type === 'online' ? 'Meeting Link' : 'Venue'} <span className="text-red-500">*</span>
                      </label>
                      <input
                        name="venue"
                        value={form.venue}
                        onChange={onChange}
                        required
                        className={`w-full rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors ${
                          fieldErrors.venue ? 'border-2 border-red-500' : 'border border-gray-300 focus:border-red-500'
                        }`}
                        placeholder={form.schedule_type === 'online' ? 'Google Meet, Zoom, etc.' : 'Location address'}
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-0.5">
                          Start Date <span className="text-red-500">*</span>
                        </label>
                        <input
                          name="duration_start_date"
                          value={form.duration_start_date}
                          onChange={(e) => {
                            const v = e.target.value;
                            if (!validateNoSunday(e.target, v)) return;
                            onChange(e);
                          }}
                          type="date"
                          required
                          min={new Date().toISOString().split('T')[0]}
                          className={`w-full rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors ${
                            fieldErrors.duration_start_date ? 'border-2 border-red-500' : 'border border-gray-300 focus:border-red-500'
                          }`}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-0.5">
                          End Date <span className="text-gray-500 font-normal">(Optional, for multi-day training)</span>
                        </label>
                        <input
                          name="end_date"
                          value={form.end_date}
                          onChange={(e) => {
                            const v = e.target.value;
                            if (!validateNoSunday(e.target, v)) return;
                            onChange(e);
                          }}
                          type="date"
                          min={form.duration_start_date || new Date().toISOString().split('T')[0]}
                          className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors"
                        />
                        <p className="text-xs text-gray-500 mt-0.5">Leave empty for single-day training</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-0.5">
                          Start Time <span className="text-red-500">*</span>
                        </label>
                        <input
                          name="time"
                          value={form.time}
                          onChange={(e) => {
                            const t = e.target.value;
                            if (!validateOfficeHours(e.target, t)) return;
                            onChange(e);
                          }}
                          type="time"
                          required
                          min="08:00"
                          max="17:00"
                          className={`w-full rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors ${
                            fieldErrors.time ? 'border-2 border-red-500' : 'border border-gray-300 focus:border-red-500'
                          }`}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-0.5">
                          End Time <span className="text-red-500">*</span>
                        </label>
                        <input
                          name="end_time"
                          value={form.end_time}
                          onChange={(e) => {
                            const t = e.target.value;
                            if (!validateOfficeHours(e.target, t)) return;
                            onChange(e);
                          }}
                          type="time"
                          required
                          min="08:00"
                          max="17:00"
                          className={`w-full rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors ${
                            fieldErrors.end_time ? 'border-2 border-red-500' : 'border border-gray-300 focus:border-red-500'
                          }`}
                        />
                      </div>
                    </div>
                    {form.time && form.end_time && form.end_time <= form.time && (
                      <p className="text-red-600 text-xs font-medium -mt-2">End time must be after start time</p>
                    )}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-0.5">
                        Description <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        name="description"
                        value={form.description}
                        onChange={onChange}
                        rows="2"
                        required
                        className={`w-full rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 resize-none transition-colors ${
                          fieldErrors.description ? 'border-2 border-red-500' : 'border border-gray-300 focus:border-red-500'
                        }`}
                        placeholder="Training details..."
                      />
                    </div>
                    
                    {/* Certificate Template Section */}
                    <div className="pt-4 mt-4 border-t-2 border-blue-100">
                      <div className="mb-4">
                        <div className="flex items-center gap-2 mb-2">
                          <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          <h3 className="text-sm font-bold text-gray-800">Certificate Template</h3>
                          <span className="text-xs text-gray-500 font-normal">(Optional)</span>
                        </div>
                        <p className="text-xs text-gray-600 ml-7">Configure the certificate that will be generated for attendees upon completion</p>
                      </div>

                      {/* Certificate Title */}
                      <div className="bg-blue-50/50 rounded-lg p-4 mb-4">
                        <label className="block text-xs font-semibold text-gray-700 mb-2">
                          Certificate Title
                        </label>
                        <input
                          type="text"
                          name="certificate_title"
                          value={form.certificate_title}
                          onChange={onChange}
                          placeholder="e.g., Certificate of Completion, Certificate of Participation"
                          className="w-full border border-blue-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                        />
                      </div>

                      {/* Certificate Signatures */}
                      <div className="bg-gray-50 rounded-lg p-4">
                        <div className="flex items-start gap-2 mb-3">
                          <div className="flex items-center gap-2 flex-1">
                            <label className="text-xs font-semibold text-gray-700">
                              Certificate Signatories
                            </label>
                            <div className="group relative">
                              <svg className="w-3.5 h-3.5 text-blue-500 cursor-help" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <div className="absolute left-0 top-5 w-64 bg-gray-900 text-white text-xs rounded-lg p-2 shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                                Add names and signature images that will appear on certificates. These will be saved as defaults for future trainings.
                              </div>
                            </div>
                          </div>
                        </div>
                        <p className="text-xs text-gray-600 mb-4">Add up to 4 signatories for the certificate</p>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Operations Manager */}
                        <div className="bg-white rounded-lg p-3 border border-gray-200">
                          <label className="block text-xs font-semibold text-gray-700 mb-2">Operations Manager</label>
                          <input
                            type="text"
                            name="operations_manager_name"
                            value={form.operations_manager_name}
                            onChange={onChange}
                            placeholder="Full name"
                            className="w-full border border-gray-300 rounded-md px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 mb-1.5"
                          />
                          <div className="flex items-center gap-2">
                            {!signatureFiles.operations_manager ? (
                              <>
                                <input
                                  type="file"
                                  accept="image/*"
                                  onChange={(e) => handleSignatureUpload('operations_manager', e.target.files?.[0])}
                                  className="flex-1 text-xs file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                                />
                                {form.operations_manager_signature && (
                                  <a 
                                    href={form.operations_manager_signature} 
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    className="text-xs text-blue-600 hover:underline whitespace-nowrap font-medium"
                                  >
                                    View current
                                  </a>
                                )}
                              </>
                            ) : (
                              <>
                                <p className="text-xs text-blue-600 flex-1">✓ {signatureFiles.operations_manager.name}</p>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSignatureFiles(prev => ({ ...prev, operations_manager: null }));
                                    loadSignatureDefaults();
                                  }}
                                  className="text-xs text-red-600 hover:text-red-700 font-medium whitespace-nowrap flex items-center gap-1"
                                >
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                  Remove
                                </button>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Safety Officer */}
                        <div className="bg-white rounded-lg p-3 border border-gray-200">
                          <label className="block text-xs font-semibold text-gray-700 mb-2">Safety Officer</label>
                          <input
                            type="text"
                            name="safety_officer_name"
                            value={form.safety_officer_name}
                            onChange={onChange}
                            placeholder="Full name"
                            className="w-full border border-gray-300 rounded-md px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 mb-1.5"
                          />
                          <div className="flex items-center gap-2">
                            {!signatureFiles.safety_officer ? (
                              <>
                                <input
                                  type="file"
                                  accept="image/*"
                                  onChange={(e) => handleSignatureUpload('safety_officer', e.target.files?.[0])}
                                  className="flex-1 text-xs file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                                />
                                {form.safety_officer_signature && (
                                  <a 
                                    href={form.safety_officer_signature} 
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    className="text-xs text-blue-600 hover:underline whitespace-nowrap font-medium"
                                  >
                                    View current
                                  </a>
                                )}
                              </>
                            ) : (
                              <>
                                <p className="text-xs text-blue-600 flex-1">✓ {signatureFiles.safety_officer.name}</p>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSignatureFiles(prev => ({ ...prev, safety_officer: null }));
                                    loadSignatureDefaults();
                                  }}
                                  className="text-xs text-red-600 hover:text-red-700 font-medium whitespace-nowrap flex items-center gap-1"
                                >
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                  Remove
                                </button>
                              </>
                            )}
                          </div>
                        </div>

                        {/* HR Manager */}
                        <div className="bg-white rounded-lg p-3 border border-gray-200">
                          <label className="block text-xs font-semibold text-gray-700 mb-2">HR Manager</label>
                          <input
                            type="text"
                            name="hr_manager_name"
                            value={form.hr_manager_name}
                            onChange={onChange}
                            placeholder="Full name"
                            className="w-full border border-gray-300 rounded-md px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 mb-1.5"
                          />
                          <div className="flex items-center gap-2">
                            {!signatureFiles.hr_manager ? (
                              <>
                                <input
                                  type="file"
                                  accept="image/*"
                                  onChange={(e) => handleSignatureUpload('hr_manager', e.target.files?.[0])}
                                  className="flex-1 text-xs file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                                />
                                {form.hr_manager_signature && (
                                  <a 
                                    href={form.hr_manager_signature} 
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    className="text-xs text-blue-600 hover:underline whitespace-nowrap font-medium"
                                  >
                                    View current
                                  </a>
                                )}
                              </>
                            ) : (
                              <>
                                <p className="text-xs text-blue-600 flex-1">✓ {signatureFiles.hr_manager.name}</p>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSignatureFiles(prev => ({ ...prev, hr_manager: null }));
                                    loadSignatureDefaults();
                                  }}
                                  className="text-xs text-red-600 hover:text-red-700 font-medium whitespace-nowrap flex items-center gap-1"
                                >
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                  Remove
                                </button>
                              </>
                            )}
                          </div>
                        </div>

                        {/* General Manager */}
                        <div className="bg-white rounded-lg p-3 border border-gray-200">
                          <label className="block text-xs font-semibold text-gray-700 mb-2">General Manager</label>
                          <input
                            type="text"
                            name="general_manager_name"
                            value={form.general_manager_name}
                            onChange={onChange}
                            placeholder="Full name"
                            className="w-full border border-gray-300 rounded-md px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 mb-1.5"
                          />
                          <div className="flex items-center gap-2">
                            {!signatureFiles.general_manager ? (
                              <>
                                <input
                                  type="file"
                                  accept="image/*"
                                  onChange={(e) => handleSignatureUpload('general_manager', e.target.files?.[0])}
                                  className="flex-1 text-xs file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                                />
                                {form.general_manager_signature && (
                                  <a 
                                    href={form.general_manager_signature} 
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    className="text-xs text-blue-600 hover:underline whitespace-nowrap font-medium"
                                  >
                                    View current
                                  </a>
                                )}
                              </>
                            ) : (
                              <>
                                <p className="text-xs text-blue-600 flex-1">✓ {signatureFiles.general_manager.name}</p>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSignatureFiles(prev => ({ ...prev, general_manager: null }));
                                    loadSignatureDefaults();
                                  }}
                                  className="text-xs text-red-600 hover:text-red-700 font-medium whitespace-nowrap flex items-center gap-1"
                                >
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                  Remove
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    </div>
                    
                    {/* Attendees Section */}
                    <div className={`pt-4 mt-4 ${fieldErrors.attendees ? 'border-t-2 border-red-500' : 'border-t border-gray-200'}`}>
                      <div className="flex items-center justify-between mb-3">
                        <label className={`block text-sm font-semibold ${fieldErrors.attendees ? 'text-red-600' : 'text-gray-800'}`}>
                          Attendees <span className="text-red-500">*</span>
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            // Toggle: if all are selected, deselect all. Otherwise, select all
                            if (attendees.length === employeeOptions.length) {
                              setAttendees([]);
                              setSelectedPositions([]);
                              setEmployeesByPositionMap({});
                            } else {
                              setAttendees(employeeOptions.map(emp => emp.name));
                            }
                          }}
                          className={`px-3 py-1.5 rounded-lg transition-all shadow-sm hover:shadow-md flex items-center gap-2 text-xs font-semibold group ${
                            attendees.length === employeeOptions.length
                              ? 'bg-gradient-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700'
                              : 'bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700'
                          }`}
                        >
                          {attendees.length === employeeOptions.length ? (
                            <>
                              <svg className="w-4 h-4 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                              <span>Deselect All</span>
                            </>
                          ) : (
                            <>
                              <svg className="w-4 h-4 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <span>Select All ({employeeOptions.length})</span>
                            </>
                          )}
                        </button>
                      </div>
                      
                      {/* Position Selection */}
                      <div className="mb-3">
                        <label className="block text-xs font-medium text-gray-700 mb-1.5">
                          Select by Position
                        </label>
                        <select
                          value=""
                          onChange={(e) => {
                            if (e.target.value) {
                              handlePositionSelect(e.target.value);
                              e.target.value = "";
                            }
                          }}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 bg-white transition-colors"
                        >
                          <option value="">Choose a position...</option>
                          {positions
                            .filter(pos => !selectedPositions.includes(pos))
                            .map((pos, idx) => (
                              <option key={idx} value={pos}>
                                {pos}
                              </option>
                            ))}
                        </select>
                        
                        {/* Selected Positions Chips */}
                        {selectedPositions.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-2.5 bg-blue-50 rounded-lg border border-blue-200">
                            {selectedPositions.map((pos) => {
                              const empCount = employeesByPositionMap[pos]?.length || 0;
                              return (
                                <div
                                  key={pos}
                                  className="flex items-center gap-1.5 bg-white border border-blue-300 rounded-md px-2.5 py-1 group hover:bg-blue-50 transition-colors"
                                >
                                  <span className="text-xs font-medium text-blue-800">{pos}</span>
                                  <span className="text-[10px] text-blue-700 bg-blue-200 px-1.5 py-0.5 rounded-full font-medium">
                                    {empCount}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => handlePositionRemove(pos)}
                                    className="text-blue-600 hover:text-red-600 hover:bg-red-100 rounded-full p-0.5 transition-colors"
                                    title={`Remove ${pos} and its employees`}
                                  >
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                      
                      {/* Search Individual Employees */}
                      <div className="mb-3 relative">
                        <label className="block text-xs font-medium text-gray-700 mb-1.5">
                          Search Individual Employee
                        </label>
                        <input
                          type="text"
                          value={employeeSearchQuery}
                          onChange={(e) => {
                            setEmployeeSearchQuery(e.target.value);
                            setShowEmployeeSuggestions(e.target.value.length > 0);
                          }}
                          onKeyDown={onAttendeeKeyDown}
                          onFocus={() => {
                            if (employeeSearchQuery) setShowEmployeeSuggestions(true);
                          }}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 bg-white transition-colors"
                          placeholder="Type employee name..."
                        />
                        {showEmployeeSuggestions && filteredEmployees.length > 0 && (
                          <ul className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                            {filteredEmployees.map((emp, i) => {
                              const alreadyAdded = attendees.includes(emp.name);
                              return (
                                <li
                                  key={i}
                                  className={`px-3 py-2 text-sm border-b last:border-b-0 ${
                                    alreadyAdded
                                      ? 'text-gray-400 bg-gray-50 cursor-not-allowed'
                                      : 'text-gray-700 hover:bg-gray-100 cursor-pointer'
                                  }`}
                                  onMouseDown={(e) => {
                                    if (alreadyAdded) return;
                                    e.preventDefault();
                                    handleEmployeeSelect(emp);
                                  }}
                                >
                                  {emp.name}
                                  {alreadyAdded && <span className="text-xs ml-2">(Already added)</span>}
                                </li>
                              );
                            })}
                          </ul>
                        )}
                      </div>
                      
                      {/* Selected Attendees List */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-medium text-gray-700">
                            Selected Attendees <span className="text-gray-600">({attendees.length})</span>
                          </span>
                          {attendees.length > 0 && (
                            <button
                              type="button"
                              onClick={() => {
                                setAttendees([]);
                                setSelectedPositions([]);
                                setEmployeesByPositionMap({});
                              }}
                              className="text-xs text-red-600 hover:text-red-700 font-medium transition-colors hover:underline"
                            >
                              Clear All
                            </button>
                          )}
                        </div>
                        <div className="border border-gray-300 rounded-lg p-3 bg-gray-50 max-h-48 overflow-y-auto">
                          {attendees.length > 0 ? (
                            <div className="space-y-1.5">
                              {attendees.map((name, i) => (
                                <div key={i} className="flex items-center justify-between px-3 py-2 bg-white rounded-lg border border-gray-200 hover:border-blue-300 transition-colors group">
                                  <span className="text-xs text-gray-700 truncate flex-1">{name}</span>
                                  <button
                                    type="button"
                                    onClick={() => removeAttendee(i)}
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50 rounded-full p-1 ml-2 flex-shrink-0 transition-colors opacity-0 group-hover:opacity-100"
                                    title="Remove attendee"
                                  >
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                  </button>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-center py-8">
                              <svg className="w-12 h-12 mx-auto text-gray-300 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                              </svg>
                              <p className="text-xs text-gray-500">No attendees selected yet</p>
                              <p className="text-xs text-gray-400 mt-1">Select positions or search for employees above</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                </div>
              </form>
            </div>
            
            {/* Footer - Fixed */}
            <div className="px-5 py-3 border-t border-gray-200 flex justify-end gap-3 flex-shrink-0 bg-white">
              <button
                type="button"
                onClick={() => {
                  setShowAdd(false);
                  setEmployeeSearchQuery("");
                  setSelectedPositions([]);
                  setEmployeesByPositionMap({});
                  setShowEmployeeSuggestions(false);
                  // Reset signature files to clear any uploaded but not saved files
                  setSignatureFiles({
                    operations_manager: null,
                    safety_officer: null,
                    hr_manager: null,
                    general_manager: null
                  });
                  // Reload defaults to restore saved signatures
                  loadSignatureDefaults();
                }}
                className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors font-medium text-sm border border-gray-300"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onSubmit}
                className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors font-medium text-sm shadow-sm"
              >
                Add Schedule
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Training Modal */}
      {showEdit && selectedTraining && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center px-4 z-50">
          <div className="bg-white rounded-xl w-full max-w-4xl shadow-xl flex flex-col max-h-[90vh]">
            {/* Header - Fixed */}
            <div className="px-5 py-4 border-b border-gray-200 flex-shrink-0 bg-gradient-to-r from-red-50 to-red-100">
              <h2 className="text-center font-bold text-xl text-gray-800">Edit Training Schedule</h2>
              <p className="text-center text-xs text-gray-600 mt-1">Update the training details and manage attendees</p>
            </div>
            
            {/* Content - Single Column Scrollable */}
            <div className="flex-1 overflow-y-auto px-6 py-5">
              <form onSubmit={onSaveChanges}>
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-0.5">
                          Title <span className="text-red-500">*</span>
                        </label>
                        <input
                          name="title"
                          value={editForm.title}
                          onChange={onEditChange}
                          required
                          className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors"
                          placeholder="Personal Development"
                        />
                      </div>
                      
                      {/* Schedule Type Selection */}
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-0.5">
                          Schedule Type <span className="text-red-500">*</span>
                        </label>
                        <div className="flex gap-4 mt-1.5">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              name="schedule_type"
                              value="onsite"
                              checked={editForm.schedule_type === "onsite"}
                              onChange={onEditChange}
                              className="w-4 h-4 text-red-600 focus:ring-red-500"
                            />
                            <span className="text-sm text-gray-700 font-medium">Onsite</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              name="schedule_type"
                              value="online"
                              checked={editForm.schedule_type === "online"}
                              onChange={onEditChange}
                              className="w-4 h-4 text-red-600 focus:ring-red-500"
                            />
                            <span className="text-sm text-gray-700 font-medium">Online</span>
                          </label>
                        </div>
                      </div>
                    </div>
                    
                    {/* Image Upload */}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-0.5">
                        Training Image <span className="text-gray-500 font-normal">(PNG, JPG, max 10MB)</span>
                      </label>
                      <div className="relative">
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/jpg"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              // Check file size (10MB = 10 * 1024 * 1024 bytes)
                              if (file.size > 10 * 1024 * 1024) {
                                setAlertMessage('File size must be less than 10MB');
                                setShowAlertModal(true);
                                e.target.value = '';
                                return;
                              }
                              // Check file type
                              if (!['image/png', 'image/jpeg', 'image/jpg'].includes(file.type)) {
                                setAlertMessage('Only PNG and JPG files are allowed');
                                setShowAlertModal(true);
                                e.target.value = '';
                                return;
                              }
                              setImageFileEdit(file);
                            }
                          }}
                          className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors file:mr-2 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-red-50 file:text-red-700 hover:file:bg-red-100"
                        />
                        {imageFileEdit && (
                          <p className="text-xs text-gray-500 mt-1 truncate">{imageFileEdit.name}</p>
                        )}
                        {selectedTraining.image_url && !imageFileEdit && (
                          <p className="text-xs text-gray-500 mt-1">Current image will be kept</p>
                        )}
                      </div>
                    </div>
                    
                    {/* Venue */}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-0.5">
                        {editForm.schedule_type === 'online' ? 'Meeting Link' : 'Venue'} <span className="text-red-500">*</span>
                      </label>
                      <input
                        name="venue"
                        value={editForm.venue}
                        onChange={onEditChange}
                        required
                        className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors"
                        placeholder={editForm.schedule_type === 'online' ? 'Google Meet, Zoom, etc.' : 'Location address'}
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-0.5">
                          Start Date <span className="text-red-500">*</span>
                        </label>
                        <input
                          name="duration_start_date"
                          value={editForm.duration_start_date}
                          onChange={(e) => {
                            const v = e.target.value;
                            if (!validateNoSunday(e.target, v)) return;
                            onEditChange(e);
                          }}
                          type="date"
                          required
                          min={new Date().toISOString().split('T')[0]}
                          className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-0.5">
                          End Date <span className="text-gray-500 font-normal">(Optional, for multi-day training)</span>
                        </label>
                        <input
                          name="end_date"
                          value={editForm.end_date}
                          onChange={(e) => {
                            const v = e.target.value;
                            if (!validateNoSunday(e.target, v)) return;
                            onEditChange(e);
                          }}
                          type="date"
                          min={editForm.duration_start_date || new Date().toISOString().split('T')[0]}
                          className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors"
                        />
                        <p className="text-xs text-gray-500 mt-0.5">Leave empty for single-day training</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-0.5">
                          Start Time <span className="text-red-500">*</span>
                        </label>
                        <input
                          name="time"
                          value={editForm.time}
                          onChange={(e) => {
                            const t = e.target.value;
                            if (!validateOfficeHours(e.target, t)) return;
                            onEditChange(e);
                          }}
                          type="time"
                          required
                          min="08:00"
                          max="17:00"
                          className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-0.5">
                          End Time <span className="text-red-500">*</span>
                        </label>
                        <input
                          name="end_time"
                          value={editForm.end_time}
                          onChange={(e) => {
                            const t = e.target.value;
                            if (!validateOfficeHours(e.target, t)) return;
                            onEditChange(e);
                          }}
                          type="time"
                          required
                          min="08:00"
                          max="17:00"
                          className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors"
                        />
                      </div>
                    </div>
                    {editForm.time && editForm.end_time && editForm.end_time <= editForm.time && (
                      <p className="text-red-600 text-xs font-medium -mt-2">End time must be after start time</p>
                    )}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-0.5">
                        Description <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        name="description"
                        value={editForm.description}
                        onChange={onEditChange}
                        rows="2"
                        required
                        className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 resize-none transition-colors"
                        placeholder="Training details..."
                      />
                    </div>
                    
                    {/* Certificate Title Field */}
                    <div className="border-t border-gray-200 pt-3">
                      <label className="block text-xs font-medium text-gray-700 mb-1.5">
                        Certificate Title <span className="text-gray-500 font-normal">(e.g., Certificate of Completion, Certificate of Participation)</span>
                      </label>
                      <input
                        type="text"
                        name="certificate_title"
                        value={editForm.certificate_title}
                        onChange={onEditChange}
                        placeholder="Certificate of Completion"
                        className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    
                    {/* Signature Fields Section */}
                    <div className="border-t border-gray-200 pt-3">
                      <label className="block text-xs font-medium text-gray-700 mb-2">
                        Certificate Signatures <span className="text-gray-500 font-normal">(Optional)</span>
                      </label>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {/* Operations Manager */}
                        <div className="space-y-1.5">
                          <label className="block text-xs font-medium text-gray-600">Operations Manager Name</label>
                          <input
                            type="text"
                            name="operations_manager_name"
                            value={editForm.operations_manager_name}
                            onChange={onEditChange}
                            placeholder="Full name"
                            className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                          <label className="block text-xs font-medium text-gray-600 mt-1">Signature Image</label>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleSignatureUploadEdit('operations_manager', e.target.files?.[0])}
                            className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 file:mr-2 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                          />
                          {editForm.operations_manager_signature && (
                            <p className="text-xs text-gray-500">Current signature saved</p>
                          )}
                        </div>

                        {/* Safety Officer */}
                        <div className="space-y-1.5">
                          <label className="block text-xs font-medium text-gray-600">Safety Officer Name</label>
                          <input
                            type="text"
                            name="safety_officer_name"
                            value={editForm.safety_officer_name}
                            onChange={onEditChange}
                            placeholder="Full name"
                            className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                          <label className="block text-xs font-medium text-gray-600 mt-1">Signature Image</label>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleSignatureUploadEdit('safety_officer', e.target.files?.[0])}
                            className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 file:mr-2 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                          />
                          {editForm.safety_officer_signature && (
                            <p className="text-xs text-gray-500">Current signature saved</p>
                          )}
                        </div>

                        {/* HR Manager */}
                        <div className="space-y-1.5">
                          <label className="block text-xs font-medium text-gray-600">HR Manager Name</label>
                          <input
                            type="text"
                            name="hr_manager_name"
                            value={editForm.hr_manager_name}
                            onChange={onEditChange}
                            placeholder="Full name"
                            className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                          <label className="block text-xs font-medium text-gray-600 mt-1">Signature Image</label>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleSignatureUploadEdit('hr_manager', e.target.files?.[0])}
                            className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 file:mr-2 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                          />
                          {editForm.hr_manager_signature && (
                            <p className="text-xs text-gray-500">Current signature saved</p>
                          )}
                        </div>

                        {/* General Manager */}
                        <div className="space-y-1.5">
                          <label className="block text-xs font-medium text-gray-600">General Manager Name</label>
                          <input
                            type="text"
                            name="general_manager_name"
                            value={editForm.general_manager_name}
                            onChange={onEditChange}
                            placeholder="Full name"
                            className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                          <label className="block text-xs font-medium text-gray-600 mt-1">Signature Image</label>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleSignatureUploadEdit('general_manager', e.target.files?.[0])}
                            className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 file:mr-2 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                          />
                          {editForm.general_manager_signature && (
                            <p className="text-xs text-gray-500">Current signature saved</p>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* Attendees Section */}
                    <div className="border-t border-gray-200 pt-4 mt-4">
                      <div className="flex items-center justify-between mb-3">
                        <label className="block text-sm font-semibold text-gray-800">
                          Attendees <span className="text-red-500">*</span>
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            // Toggle: if all are selected, deselect all. Otherwise, select all
                            if (attendeesEdit.length === employeeOptions.length) {
                              setAttendeesEdit([]);
                              setSelectedPositionsEdit([]);
                              setEmployeesByPositionMapEdit({});
                            } else {
                              setAttendeesEdit(employeeOptions.map(emp => emp.name));
                            }
                          }}
                          className={`px-3 py-1.5 rounded-lg transition-all shadow-sm hover:shadow-md flex items-center gap-2 text-xs font-semibold group ${
                            attendeesEdit.length === employeeOptions.length
                              ? 'bg-gradient-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700'
                              : 'bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700'
                          }`}
                        >
                          {attendeesEdit.length === employeeOptions.length ? (
                            <>
                              <svg className="w-4 h-4 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                              <span>Deselect All</span>
                            </>
                          ) : (
                            <>
                              <svg className="w-4 h-4 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <span>Select All ({employeeOptions.length})</span>
                            </>
                          )}
                        </button>
                      </div>
                      
                      {/* Position Selection */}
                      <div className="mb-3">
                        <label className="block text-xs font-medium text-gray-700 mb-1.5">
                          Select by Position
                        </label>
                        <select
                          value=""
                          onChange={(e) => {
                            if (e.target.value) {
                              handlePositionSelectEdit(e.target.value);
                              e.target.value = "";
                            }
                          }}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 bg-white transition-colors"
                        >
                          <option value="">Choose a position...</option>
                          {positions
                            .filter(pos => !selectedPositionsEdit.includes(pos))
                            .map((pos, idx) => (
                              <option key={idx} value={pos}>
                                {pos}
                              </option>
                            ))}
                        </select>
                        
                        {/* Selected Positions Chips */}
                        {selectedPositionsEdit.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-2.5 bg-blue-50 rounded-lg border border-blue-200">
                            {selectedPositionsEdit.map((pos) => {
                              const empCount = employeesByPositionMapEdit[pos]?.length || 0;
                              return (
                                <div
                                  key={pos}
                                  className="flex items-center gap-1.5 bg-white border border-blue-300 rounded-md px-2.5 py-1 group hover:bg-blue-50 transition-colors"
                                >
                                  <span className="text-xs font-medium text-blue-800">{pos}</span>
                                  <span className="text-[10px] text-blue-700 bg-blue-200 px-1.5 py-0.5 rounded-full font-medium">
                                    {empCount}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => handlePositionRemoveEdit(pos)}
                                    className="text-blue-600 hover:text-red-600 hover:bg-red-100 rounded-full p-0.5 transition-colors"
                                    title={`Remove ${pos} and its employees`}
                                  >
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                      
                      {/* Search Individual Employees */}
                      <div className="mb-3 relative">
                        <label className="block text-xs font-medium text-gray-700 mb-1.5">
                          Search Individual Employee
                        </label>
                        <input
                          type="text"
                          value={employeeSearchQueryEdit}
                          onChange={(e) => {
                            setEmployeeSearchQueryEdit(e.target.value);
                            setShowEmployeeSuggestionsEdit(e.target.value.length > 0);
                          }}
                          onKeyDown={onAttendeeKeyDownEdit}
                          onFocus={() => {
                            if (employeeSearchQueryEdit) setShowEmployeeSuggestionsEdit(true);
                          }}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 bg-white transition-colors"
                          placeholder="Type employee name..."
                        />
                        {showEmployeeSuggestionsEdit && filteredEmployeesEdit.length > 0 && (
                          <ul className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                            {filteredEmployeesEdit.map((emp, i) => {
                              const alreadyAdded = attendeesEdit.includes(emp.name);
                              return (
                                <li
                                  key={i}
                                  className={`px-3 py-2 text-sm border-b last:border-b-0 ${
                                    alreadyAdded
                                      ? 'text-gray-400 bg-gray-50 cursor-not-allowed'
                                      : 'text-gray-700 hover:bg-gray-100 cursor-pointer'
                                  }`}
                                  onMouseDown={(e) => {
                                    if (alreadyAdded) return;
                                    e.preventDefault();
                                    handleEmployeeSelectEdit(emp);
                                  }}
                                >
                                  {emp.name}
                                  {alreadyAdded && <span className="text-xs ml-2">(Already added)</span>}
                                </li>
                              );
                            })}
                          </ul>
                        )}
                      </div>
                      
                      {/* Selected Attendees List */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-medium text-gray-700">
                            Selected Attendees <span className="text-gray-600">({attendeesEdit.length})</span>
                          </span>
                          {attendeesEdit.length > 0 && (
                            <button
                              type="button"
                              onClick={() => {
                                setAttendeesEdit([]);
                                setSelectedPositionsEdit([]);
                                setEmployeesByPositionMapEdit({});
                              }}
                              className="text-xs text-red-600 hover:text-red-700 font-medium transition-colors hover:underline"
                            >
                              Clear All
                            </button>
                          )}
                        </div>
                        <div className="border border-gray-300 rounded-lg p-3 bg-gray-50 max-h-48 overflow-y-auto">
                          {attendeesEdit.length > 0 ? (
                            <div className="space-y-1.5">
                              {attendeesEdit.map((name, i) => (
                                <div key={i} className="flex items-center justify-between px-3 py-2 bg-white rounded-lg border border-gray-200 hover:border-blue-300 transition-colors group">
                                  <span className="text-xs text-gray-700 truncate flex-1">{name}</span>
                                  <button
                                    type="button"
                                    onClick={() => removeAttendeeEdit(i)}
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50 rounded-full p-1 ml-2 flex-shrink-0 transition-colors opacity-0 group-hover:opacity-100"
                                    title="Remove attendee"
                                  >
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                  </button>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-center py-8">
                              <svg className="w-12 h-12 mx-auto text-gray-300 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                              </svg>
                              <p className="text-xs text-gray-500">No attendees selected yet</p>
                              <p className="text-xs text-gray-400 mt-1">Select positions or search for employees above</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                </div>
              </form>
            </div>
            
            {/* Footer - Fixed */}
            <div className="px-5 py-3 border-t border-gray-200 flex justify-end gap-3 flex-shrink-0 bg-white">
              <button
                type="button"
                onClick={() => {
                  setShowEdit(false);
                  setEmployeeSearchQueryEdit("");
                  setSelectedPositionsEdit([]);
                  setEmployeesByPositionMapEdit({});
                  setShowEmployeeSuggestionsEdit(false);
                  setImageFileEdit(null);
                  setSignatureFilesEdit({
                    operations_manager: null,
                    safety_officer: null,
                    hr_manager: null,
                    general_manager: null
                  });
                }}
                className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors font-medium text-sm border border-gray-300"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onSaveChanges}
                className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors font-medium text-sm shadow-sm"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
         
      {/* Mark Attendance Modal */}
      {showAttendance && selectedTraining && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center px-4 z-50">
          <div className="bg-white rounded-xl w-full max-w-2xl p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="text-center font-semibold text-xl mb-6">Mark Attendance</div>
            <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Training:</strong> {selectedTraining.title}
              </p>
              <p className="text-sm text-blue-700 mt-1">
                Check the box next to each attendee who attended the training session.
              </p>
            </div>
            
            {/* Select All Option */}
            <div className="mb-4 flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={(selectedTraining.attendees || []).length > 0 && (selectedTraining.attendees || []).every(att => {
                    const name = typeof att === "string" ? att : att.name || "";
                    return attendance[name] === true;
                  })}
                  onChange={(e) => {
                    const allAttendees = selectedTraining.attendees || [];
                    const newAttendance = {};
                    allAttendees.forEach(att => {
                      const name = typeof att === "string" ? att : att.name || "";
                      newAttendance[name] = e.target.checked;
                    });
                    setAttendance(newAttendance);
                  }}
                  className="h-5 w-5 text-red-600 focus:ring-red-500 border-gray-300 rounded cursor-pointer"
                />
                <span className="text-sm font-semibold text-gray-700">Select All</span>
              </label>
              <span className="text-xs text-gray-500">
                {Object.values(attendance).filter(Boolean).length} of {(selectedTraining.attendees || []).length} selected
              </span>
            </div>

            <div className="space-y-2 mb-6">
              {(selectedTraining.attendees || []).map((attendee, idx) => {
                const name = typeof attendee === "string" ? attendee : attendee.name || "";
                return (
                  <label
                    key={idx}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${getAvatarColor(name)} flex items-center justify-center text-white text-sm font-medium`}>
                        {getInitials(name)}
                      </div>
                      <span className="text-sm font-medium text-gray-700">{name}</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={attendance[name] || false}
                      onChange={(e) => {
                        setAttendance(prev => ({
                          ...prev,
                          [name]: e.target.checked
                        }));
                      }}
                      className="h-5 w-5 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                    />
                  </label>
                );
              })}
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowAttendance(false);
                  setSelectedTraining(null);
                  setAttendance({});
                }}
                className="px-4 py-2 rounded-lg bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={saveAttendance}
                className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors font-medium"
              >
                Save Attendance & Mark Complete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && trainingToDelete && (
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
                  <h2 className="text-lg font-bold text-gray-900">Delete Training</h2>
                  <p className="text-sm text-gray-500 mt-0.5">This action cannot be undone</p>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="px-6 py-4">
              <p className="text-sm text-gray-700">
                Are you sure you want to delete <span className="font-semibold text-gray-900">"{trainingToDelete.title}"</span>? This will permanently remove the training schedule and all associated data.
              </p>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setTrainingToDelete(null);
                }}
                className="px-4 py-2 rounded-lg bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors font-medium text-sm"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors font-medium text-sm"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}



      {/* Alert Modal */}
      {showAlertModal && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center px-4 z-50" onClick={() => setShowAlertModal(false)}>
          <div className="bg-white/95 backdrop-blur-md rounded-xl w-full max-w-md shadow-2xl border border-black" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <h2 className="text-lg font-bold text-gray-900">Attention Required</h2>
              </div>
            </div>
            <div className="px-6 py-4">
              <p className="text-sm text-gray-700">{alertMessage}</p>
            </div>
            <div className="px-6 py-4 bg-gray-50/80 border-t border-gray-200 flex justify-end">
              <button
                onClick={() => setShowAlertModal(false)}
                className="px-4 py-2 rounded-lg bg-gray-900 text-white hover:bg-gray-800 transition-colors font-medium text-sm"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center px-4 z-50" onClick={() => setShowSuccessModal(false)}>
          <div className="bg-white/95 backdrop-blur-md rounded-xl w-full max-w-md shadow-2xl border border-black" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h2 className="text-lg font-bold text-gray-900">Success</h2>
              </div>
            </div>
            <div className="px-6 py-4">
              <p className="text-sm text-gray-700">{successMessage}</p>
            </div>
            <div className="px-6 py-4 bg-gray-50/80 border-t border-gray-200 flex justify-end">
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

      {/* Confirm Add Training Modal */}
      {showConfirmAddModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center px-4 z-50" onClick={() => setShowConfirmAddModal(false)}>
          <div className="bg-white rounded-xl w-full max-w-6xl shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Confirm Training Schedule</h2>
                  <p className="text-sm text-gray-500 mt-0.5">Review before creating</p>
                </div>
              </div>
            </div>
            <div className="px-6 py-4 max-h-[70vh] overflow-y-auto">
              <div className="space-y-3">
                
                {/* Training Image - At Top */}
                {imageFile && (
                  <div className="rounded-lg border border-gray-200 overflow-hidden">
                    <img 
                      src={URL.createObjectURL(imageFile)} 
                      alt="Training preview" 
                      className="w-full h-auto max-h-48 object-contain bg-gray-50"
                    />
                  </div>
                )}

                <div>
                  <p className="text-xs text-gray-500 uppercase font-semibold">Training Title</p>
                  <p className="text-sm text-gray-900 font-medium mt-1">{form.title}</p>
                </div>
                
                {form.description && (
                  <div>
                    <p className="text-xs text-gray-500 uppercase font-semibold">Description</p>
                    <p className="text-sm text-gray-900 mt-1">{form.description}</p>
                  </div>
                )}
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-gray-500 uppercase font-semibold">Start Date</p>
                    <p className="text-sm text-gray-900 mt-1">{form.duration_start_date ? new Date(form.duration_start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Not set'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase font-semibold">End Date</p>
                    <p className="text-sm text-gray-900 mt-1">{form.end_date ? new Date(form.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Same day'}</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-gray-500 uppercase font-semibold">Start Time</p>
                    <p className="text-sm text-gray-900 mt-1">{form.time}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase font-semibold">End Time</p>
                    <p className="text-sm text-gray-900 mt-1">{form.end_time}</p>
                  </div>
                </div>
                
                <div>
                  <p className="text-xs text-gray-500 uppercase font-semibold">Schedule Type</p>
                  <p className="text-sm text-gray-900 mt-1 inline-flex items-center gap-1.5">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${form.schedule_type === 'online' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                      {form.schedule_type === 'online' ? 'Online' : 'Onsite'}
                    </span>
                  </p>
                </div>
                
                <div>
                  <p className="text-xs text-gray-500 uppercase font-semibold">{form.schedule_type === 'online' ? 'Meeting Link' : 'Venue'}</p>
                  <p className="text-sm text-gray-900 mt-1">{form.venue}</p>
                </div>
                
                <div>
                  <p className="text-xs text-gray-500 uppercase font-semibold">Certificate Title</p>
                  <p className="text-sm text-gray-900 mt-1">{form.certificate_title || 'Certificate of Completion'}</p>
                </div>
                
                <div>
                  <p className="text-xs text-gray-500 uppercase font-semibold">Attendees ({attendees.length})</p>
                  <div className="mt-2 max-h-40 overflow-y-auto border border-gray-200 rounded-lg">
                    <div className="divide-y divide-gray-100">
                      {attendees.map((attendee, index) => (
                        <div key={index} className="px-3 py-2 text-sm text-gray-900 hover:bg-gray-50">
                          {attendee}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              <p className="text-sm text-gray-600 mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <span className="font-semibold">Note:</span> Email notifications will be sent to all attendees.
              </p>
            </div>
            <div className="px-6 py-4 bg-gray-50/80 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => setShowConfirmAddModal(false)}
                disabled={isCreatingTraining}
                className="px-4 py-2 rounded-lg bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={confirmAddTraining}
                disabled={isCreatingTraining}
                className="px-4 py-2 rounded-lg bg-[#800000] text-white hover:bg-[#990000] transition-colors font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isCreatingTraining && (
                  <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                )}
                {isCreatingTraining ? 'Creating...' : 'Confirm & Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Certificate Generation Progress Modal */}
      {showCertificateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center px-4 z-50">
          <div className="bg-white rounded-xl w-full max-w-md shadow-2xl">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-bold text-gray-900">Generating Certificates</h2>
            </div>
            <div className="px-6 py-6">
              {/* Progress Bar */}
              <div className="mb-4">
                <div className="flex justify-between text-sm text-gray-600 mb-2">
                  <span>{certificateProgress.current} of {certificateProgress.total}</span>
                  <span>{Math.round((certificateProgress.current / certificateProgress.total) * 100)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-300 ${
                      certificateProgress.status === 'error' ? 'bg-red-500' :
                      certificateProgress.status === 'complete' ? 'bg-green-500' :
                      'bg-blue-500'
                    }`}
                    style={{ width: `${(certificateProgress.current / certificateProgress.total) * 100}%` }}
                  />
                </div>
              </div>

              {/* Status Message */}
              <div className="flex items-center gap-3 mb-4">
                {certificateProgress.status === 'preparing' && (
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
                )}
                {certificateProgress.status === 'generating' && (
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
                )}
                {certificateProgress.status === 'complete' && (
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
                {certificateProgress.status === 'error' && (
                  <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                )}
                <p className="text-sm text-gray-700">{certificateProgress.message}</p>
              </div>

              {/* Results Summary */}
              {certificateProgress.status === 'complete' && (
                <div className="space-y-2">
                  {certificateProgress.successful.length > 0 && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                      <p className="text-sm font-semibold text-green-800 mb-1">
                        ✓ Successfully Generated ({certificateProgress.successful.length})
                      </p>
                      <div className="text-xs text-green-700 max-h-32 overflow-y-auto">
                        {certificateProgress.successful.map((item, i) => (
                          <div key={i}>• {item.name}</div>
                        ))}
                      </div>
                    </div>
                  )}
                  {certificateProgress.failed.length > 0 && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                      <p className="text-sm font-semibold text-red-800 mb-1">
                        ✗ Failed ({certificateProgress.failed.length})
                      </p>
                      <div className="text-xs text-red-700 max-h-32 overflow-y-auto">
                        {certificateProgress.failed.map((item, i) => (
                          <div key={i}>• {item.name}: {item.error}</div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
              <button
                onClick={() => setShowCertificateModal(false)}
                disabled={certificateProgress.status === 'preparing' || certificateProgress.status === 'generating'}
                className="px-4 py-2 rounded-lg bg-gray-600 text-white hover:bg-gray-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium text-sm"
              >
                {certificateProgress.status === 'preparing' || certificateProgress.status === 'generating' ? 'Please wait...' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default HrTrainings;