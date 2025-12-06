import { Link } from 'react-router-dom';
import React, { useState, useEffect, useRef } from "react";
import { supabase } from './supabaseClient';
import emailjs from '@emailjs/browser';

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
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [trainingToDelete, setTrainingToDelete] = useState(null);
  
  // Alert and confirmation modals
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const [showConfirmAddModal, setShowConfirmAddModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  
  const [form, setForm] = useState({
    title: "",
    venue: "",
    date: "",
    time: "",
    end_time: "",
    description: "",
    schedule_type: "onsite", // onsite or online
    image_url: ""
  });
  
  const [imageFile, setImageFile] = useState(null);
  
  const [editForm, setEditForm] = useState({
    title: "",
    venue: "",
    date: "",
    time: "",
    end_time: "",
    description: "",
    schedule_type: "onsite"
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
    fetchTrainings();
  }, []);

  // Get current logged-in user (for created_by)
  useEffect(() => {
    const loadUser = async () => {
      try {
        const { data, error } = await supabase.auth.getUser();
        if (!error && data?.user) {
          setCurrentUserId(data.user.id);
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

      // Normalize and separate upcoming, pending attendance, and completed trainings
      const now = new Date();
      const upcomingTrainings = [];
      const pendingAttendanceTrainings = [];
      const completedTrainings = [];

      (data || []).forEach((training) => {
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
  };

  const onEditChange = (e) => {
    const { name, value } = e.target;
    setEditForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleEmployeeSelect = (employee) => {
    const employeeName = typeof employee === 'string' ? employee : employee.name;
    if (!attendees.includes(employeeName)) {
      setAttendees((prev) => [...prev, employeeName]);
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
          training_description: trainingData.description || 'No description provided',
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
    if (!form.title) {
      setAlertMessage("Title is required.");
      setShowAlertModal(true);
      return;
    }
    if (!form.date || !form.time || !form.end_time) {
      setAlertMessage("Please provide date, start time, and end time.");
      setShowAlertModal(true);
      return;
    }
    if (!form.venue) {
      setAlertMessage("Venue is required.");
      setShowAlertModal(true);
      return;
    }
    if (!form.description) {
      setAlertMessage("Description is required.");
      setShowAlertModal(true);
      return;
    }
    if (!attendees || attendees.length === 0) {
      setAlertMessage("At least one attendee is required.");
      setShowAlertModal(true);
      return;
    }
    
    // Show confirmation modal
    setShowConfirmAddModal(true);
  };
  
  // Actual submission after confirmation
  const confirmAddTraining = async () => {
    setShowConfirmAddModal(false);

    const startAt = new Date(`${form.date}T${form.time}:00`);
    const endAt = new Date(`${form.date}T${form.end_time}:00`);
    
    if (endAt <= startAt) {
      setAlertMessage("End time must be after start time.");
      setShowAlertModal(true);
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
          return;
        }

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('schedule-trainings')
          .getPublicUrl(filePath);
        
        uploadedImageUrl = publicUrl;
      }

      const { data, error } = await supabase
        .from('trainings')
        .insert([
          {
            title: form.title,
            venue: form.venue || null,
            start_at: startAt.toISOString(),
            end_at: endAt.toISOString(),
            description: form.description || null,
            // store attendees as plain names only
            attendees: attendees || [],
            // is_active is true only for present/future trainings
            is_active: isActiveFlag,
            created_by: currentUserId || null,
            schedule_type: form.schedule_type || 'onsite',
            image_url: uploadedImageUrl
          }
        ])
        .select()
        .single();

      if (error) {
        console.error('Error creating training:', error);
        setAlertMessage(`Failed to create training schedule: ${error.message || 'Unknown error'}`);
        setShowAlertModal(true);
        return;
      }

      // Send email notifications to attendees
      if (data && attendees.length > 0) {
        await sendTrainingEmails(data, attendees);
      }

      // Reset form
      setForm({ title: "", venue: "", date: "", time: "", end_time: "", description: "", schedule_type: "onsite", image_url: "" });
      setImageFile(null);
      setAttendees([]);
      setEmployeeSearchQuery("");
      setSelectedPositions([]);
      setEmployeesByPositionMap({});
      setShowAdd(false);
      
      // Refresh list
      fetchTrainings();
      setSuccessMessage('Training schedule created and notifications sent to attendees!');
      setShowSuccessModal(true);
    } catch (error) {
      console.error('Error creating training:', error);
      setAlertMessage(`Failed to create training schedule: ${error.message || 'Unknown error'}`);
      setShowAlertModal(true);
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
    if (!editForm.date || !editForm.time || !editForm.end_time) {
      setAlertMessage("Please provide date, start time, and end time.");
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

    const startAt = new Date(`${editForm.date}T${editForm.time}:00`);
    const endAt = new Date(`${editForm.date}T${editForm.end_time}:00`);
    
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

      const { data, error } = await supabase
        .from('trainings')
        .update({
          title: editForm.title,
          venue: editForm.venue || null,
          start_at: startAt.toISOString(),
          end_at: endAt.toISOString(),
          description: editForm.description || null,
          // keep attendees as plain names only
          attendees: attendeesEdit || [],
          // keep is_active in sync with whether the training is in the future
          is_active: isActiveFlag,
          schedule_type: editForm.schedule_type || 'onsite',
          image_url: uploadedImageUrl
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
    
    setEditForm({
      title: training.title || "",
      venue: training.venue || "",
      date: training.date || "",
      time: training.time || "",
      end_time: endTime,
      description: training.description || "",
      schedule_type: training.schedule_type || "onsite"
    });
    setAttendeesEdit(
      (training.attendees || []).map((a) =>
        typeof a === "string" ? a : a.name || ""
      )
    );
    setImageFileEdit(null);
    setSelectedPositionsEdit([]);
    setEmployeesByPositionMapEdit({});
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
      setSelectedTraining(null);
      fetchTrainings();
      setSuccessMessage('Attendance saved and training marked as completed!');
      setShowSuccessModal(true);
    } catch (error) {
      console.error('Error saving attendance:', error);
      setAlertMessage('Failed to save attendance');
      setShowAlertModal(true);
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
      <div className="max-w-7xl mx-auto px-6 py-8">
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
            <button
              onClick={() => setShowAdd(true)}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2 text-sm font-medium self-start sm:self-auto"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Schedule
            </button>
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
                            <span className="font-medium">{formatDate(training.date)}</span>
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
                            <span className="font-medium">{formatDate(training.date)}</span>
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
                          <span className="font-medium">{formatDate(training.date)}</span>
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
                              openAttendance(training);
                            }}
                            className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-green-50 hover:text-green-600 flex items-center gap-2 transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Edit Attendance
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onDelete(training);
                            }}
                            className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors"
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center px-4 z-50" onClick={() => setShowDetails(false)}>
          <div className="bg-white rounded-2xl w-full max-w-5xl shadow-2xl max-h-[85vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Schedule Details</h2>
                  <p className="text-xs text-gray-500 mt-0.5">Complete information about this schedule</p>
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
              <div className="w-[55%] overflow-y-auto p-6 border-r border-gray-200">
                {/* Title Section */}
                <div className="mb-4">
                  <h3 className="text-xl font-bold text-gray-900">{selectedTraining.title}</h3>
                </div>

                {/* Description Section */}
                <div className="mb-6">
                  <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{selectedTraining.description || 'No description provided'}</p>
                </div>

                {/* Training Image */}
                {selectedTraining.image_url && (
                  <div className="mb-4">
                    <img 
                      src={selectedTraining.image_url} 
                      alt={selectedTraining.title}
                      className="w-full h-auto object-contain rounded-lg shadow-md border border-gray-200 max-h-96"
                      onError={(e) => {
                        console.error('Failed to load image:', selectedTraining.image_url);
                        e.target.style.display = 'none';
                      }}
                      onLoad={() => console.log('Image loaded successfully:', selectedTraining.image_url)}
                    />
                  </div>
                )}
                {!selectedTraining.image_url && (
                  <div className="mb-4 p-4 bg-gray-100 rounded-lg border border-gray-200 text-center">
                    <svg className="w-12 h-12 mx-auto text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <p className="text-xs text-gray-500">No image available</p>
                  </div>
                )}

                {/* Divider */}
                <div className="my-6 border-t border-gray-200"></div>

                {/* Schedule Information Section */}
                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-4">Schedule Information</h4>
                  
                  {/* Schedule Type Badge */}
                  <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
                    {selectedTraining.schedule_type === 'online' ? (
                      <>
                        <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm">
                          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-600">Schedule Type</p>
                          <p className="text-sm font-bold text-blue-700">Online Meeting</p>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm">
                          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-sm font-bold text-indigo-700">Onsite</p>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Date & Time Card */}
                  <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3 shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center flex-shrink-0">
                        <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-medium text-gray-500 mb-0.5">Date</p>
                        <p className="text-sm font-bold text-gray-900">{formatDate(selectedTraining.date)}</p>
                      </div>
                    </div>
                    
                    <div className="border-t border-gray-100 pt-3">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex items-start gap-2">
                          <svg className="w-4 h-4 text-green-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <div>
                            <p className="text-xs font-medium text-gray-500">Start</p>
                            <p className="text-sm font-bold text-gray-900">{formatTime(selectedTraining.start_at)}</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-2">
                          <svg className="w-4 h-4 text-orange-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <div>
                            <p className="text-xs font-medium text-gray-500">End</p>
                            <p className="text-sm font-bold text-gray-900">{formatEndTime(selectedTraining.end_at)}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                      <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div className="flex-1">
                        <p className="text-xs font-medium text-gray-500 inline">Duration: </p>
                        <span className="text-sm font-bold text-purple-700">{calculateDuration(selectedTraining.start_at, selectedTraining.end_at)}</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Location/Link Card */}
                  <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                    <div className="flex items-start gap-3">
                      {selectedTraining.schedule_type === 'online' ? (
                        <>
                          <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                            </svg>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-gray-500 mb-1">Meeting Link</p>
                            <a 
                              href={selectedTraining.venue} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-sm font-semibold text-blue-600 hover:text-blue-700 hover:underline break-all inline-flex items-center gap-1 group"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <span className="break-all">{selectedTraining.venue || 'Not set'}</span>
                              <svg className="w-3 h-3 group-hover:translate-x-0.5 transition-transform flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                              </svg>
                            </a>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center flex-shrink-0">
                            <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                          </div>
                          <div className="flex-1">
                            <p className="text-xs font-medium text-gray-500 mb-1">Location</p>
                            <p className="text-sm font-semibold text-gray-900">{selectedTraining.venue || 'Not set'}</p>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Side - Attendees List */}
              <div className="w-[45%] flex flex-col bg-gray-50">
                <div className="p-4 border-b border-gray-200 bg-white">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="text-sm font-bold text-gray-900">
                        Attendees ({(() => {
                          const filtered = selectedTraining.attendees?.filter(attendee => {
                            const name = typeof attendee === "string" ? attendee : attendee.name || "";
                            return name.toLowerCase().includes(attendeeSearchQuery.toLowerCase());
                          }) || [];
                          return `${filtered.length}/${selectedTraining.attendees?.length || 0}`;
                        })()})
                      </h3>
                    </div>
                    {!selectedTraining.is_active && selectedTraining.attendance && (
                      <div className="flex items-center gap-3 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200">
                        <div className="flex items-center gap-1.5">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <span className="text-xs font-semibold text-gray-700">
                            {Object.values(selectedTraining.attendance || {}).filter(Boolean).length}
                          </span>
                        </div>
                        <div className="w-px h-3 bg-gray-300"></div>
                        <div className="flex items-center gap-1.5">
                          <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                          <span className="text-xs font-semibold text-gray-700">
                            {Object.values(selectedTraining.attendance || {}).filter((v) => v === false).length}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Search Bar */}
                  <div className="relative">
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
                      placeholder="Search attendees..."
                      value={attendeeSearchQuery}
                      onChange={(e) => setAttendeeSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
                    />
                  </div>
                </div>
                
                <div className="flex-1 overflow-y-auto p-3">
                  <div className="space-y-2">
                    {(() => {
                      const filteredAttendees = selectedTraining.attendees?.filter(attendee => {
                        const name = typeof attendee === "string" ? attendee : attendee.name || "";
                        return name.toLowerCase().includes(attendeeSearchQuery.toLowerCase());
                      }) || [];
                      
                      if (filteredAttendees.length === 0) {
                        return (
                          <div className="text-center py-8 text-gray-500">
                            <svg className="w-12 h-12 mx-auto text-gray-300 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                            <p className="text-sm font-medium">No attendees found</p>
                            <p className="text-xs mt-1">Try adjusting your search</p>
                          </div>
                        );
                      }
                      
                      return filteredAttendees.map((attendee, idx) => {
                        const name = typeof attendee === "string" ? attendee : attendee.name || "";
                        const attendedFlag = !!selectedTraining.attendance?.[name];
                        return (
                          <div 
                            key={idx} 
                            className="bg-white rounded-lg p-3 border border-gray-200 hover:shadow-sm transition-all"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-sm font-semibold shadow-sm flex-shrink-0">
                                {getInitials(name)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900">{name}</p>
                                {!selectedTraining.is_active && selectedTraining.attendance && (
                                  <div className="flex items-center gap-1.5 mt-1">
                                    <span
                                      className={`inline-flex items-center text-xs px-2 py-0.5 rounded-full font-semibold ${
                                        attendedFlag
                                          ? "bg-green-100 text-green-700"
                                          : "bg-red-100 text-red-700"
                                      }`}
                                    >
                                      {attendedFlag ? "✓ Present" : "✗ Absent"}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      });
                    })()}
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

      {/* Add Training Modal */}
      {showAdd && (
      <div className="fixed inset-0 bg-black/40 flex items-center justify-center px-4 z-50">
          <div className="bg-white rounded-xl w-full max-w-6xl shadow-xl flex flex-col h-[650px]">
            {/* Header - Fixed */}
            <div className="px-5 py-3 border-b border-gray-200 flex-shrink-0 bg-white">
              <h2 className="text-center font-semibold text-lg text-gray-800">Add Schedule</h2>
            </div>
            
            {/* Content - Two Column Layout */}
            <div className="flex-1 overflow-hidden flex">
              {/* Left Side - Form Fields (50% width) */}
              <div className="w-[50%] px-5 py-4 border-r border-gray-200 overflow-y-auto">
                <form onSubmit={onSubmit} className="h-full">
                  <div className="grid grid-cols-1 gap-2.5">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-0.5">
                          Title <span className="text-red-500">*</span>
                        </label>
                        <input
                          name="title"
                          value={form.title}
                          onChange={onChange}
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
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-0.5">
                          Date <span className="text-red-500">*</span>
                        </label>
                        <input
                          name="date"
                          value={form.date}
                          onChange={onChange}
                          type="date"
                          required
                          min={new Date().toISOString().split('T')[0]}
                          className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-0.5">
                          {form.schedule_type === 'online' ? 'Meeting Link' : 'Venue'} <span className="text-red-500">*</span>
                        </label>
                        <input
                          name="venue"
                          value={form.venue}
                          onChange={onChange}
                          required
                          className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors"
                          placeholder={form.schedule_type === 'online' ? 'Google Meet, Zoom, etc.' : 'Location address'}
                        />
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
                          onChange={onChange}
                          type="time"
                          required
                          className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-0.5">
                          End Time <span className="text-red-500">*</span>
                        </label>
                        <input
                          name="end_time"
                          value={form.end_time}
                          onChange={onChange}
                          type="time"
                          required
                          className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors"
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
                        className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 resize-none transition-colors"
                        placeholder="Training details..."
                      />
                    </div>
                    
                    {/* Attendees Section Header */}
                    <div className="pt-1">
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-xs font-medium text-gray-700">
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
                          className={`px-2.5 py-1 rounded-lg transition-all shadow-sm hover:shadow-md flex items-center gap-1.5 text-xs font-semibold group ${
                            attendees.length === employeeOptions.length
                              ? 'bg-gradient-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700'
                              : 'bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700'
                          }`}
                        >
                          {attendees.length === employeeOptions.length ? (
                            <>
                              <svg className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                              <span>Deselect All</span>
                            </>
                          ) : (
                            <>
                              <svg className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <span>Select All ({employeeOptions.length})</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                    
                    {/* Position Selection */}
                    <div>
                      <select
                        value=""
                        onChange={(e) => {
                          if (e.target.value) {
                            handlePositionSelect(e.target.value);
                            e.target.value = "";
                          }
                        }}
                        className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 bg-white transition-colors"
                      >
                        <option value="">Select by Position</option>
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
                        <div className="mt-2 flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-2 bg-gray-50 rounded-lg border border-gray-200">
                          {selectedPositions.map((pos) => {
                            const empCount = employeesByPositionMap[pos]?.length || 0;
                            return (
                              <div
                                key={pos}
                                className="flex items-center gap-1.5 bg-blue-50 border border-blue-200 rounded-md px-2 py-0.5 group hover:bg-blue-100 transition-colors"
                              >
                                <span className="text-xs font-medium text-blue-800">{pos}</span>
                                <span className="text-[10px] text-blue-700 bg-blue-200 px-1 py-0.5 rounded-full font-medium">
                                  {empCount}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handlePositionRemove(pos)}
                                  className="text-blue-600 hover:text-red-600 hover:bg-red-100 rounded-full p-0.5 transition-colors"
                                  title={`Remove ${pos} and its employees`}
                                >
                                  <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </form>
              </div>

              {/* Right Side - Others Search and Selected Attendees List (50% width) */}
              <div className="w-[50%] px-5 py-4 bg-gray-50 overflow-hidden">
                <div className="h-full flex flex-col">
                  {/* Search Input - Optional for additional employees */}
                  <div className="mb-2.5 relative">
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Others
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
                      className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 bg-white transition-colors"
                      placeholder="Search employee name..."
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
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                  
                  {/* Attendees List - Scrollable */}
                  <div className="flex-1 flex flex-col min-h-0">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-gray-700">
                        Selected Depots <span className="text-gray-500">({attendees.length})</span>
                      </span>
                      {attendees.length > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            setAttendees([]);
                            setSelectedPositions([]);
                            setEmployeesByPositionMap({});
                          }}
                          className="text-xs text-red-600 hover:text-red-700 font-medium transition-colors"
                        >
                          Clear All
                        </button>
                      )}
                    </div>
                    <div className="border border-gray-300 rounded-lg p-2 bg-white flex-1 overflow-y-auto">
                      {attendees.length > 0 ? (
                        <div className="space-y-1">
                          {attendees.map((name, i) => (
                            <div key={i} className="flex items-center justify-between px-2 py-1 bg-gray-50 rounded border border-gray-200 hover:bg-gray-100 transition-colors">
                              <span className="text-xs text-gray-700 truncate flex-1">{name}</span>
                              <button
                                type="button"
                                onClick={() => removeAttendee(i)}
                                className="text-red-600 hover:text-red-700 text-sm font-bold ml-2 flex-shrink-0 transition-colors"
                                title="Remove"
                              >
                                ×
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-gray-400 text-center py-8">No attendees added yet. Select positions or search for employees.</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
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
          <div className="bg-white rounded-xl w-full max-w-6xl shadow-xl flex flex-col h-[650px]">
            {/* Header - Fixed */}
            <div className="px-5 py-3 border-b border-gray-200 flex-shrink-0 bg-white">
              <h2 className="text-center font-semibold text-lg text-gray-800">Edit Schedule</h2>
            </div>
            
            {/* Content - Two Column Layout */}
            <div className="flex-1 overflow-hidden flex">
              {/* Left Side - Form Fields (50% width) */}
              <div className="w-[50%] px-5 py-4 border-r border-gray-200 overflow-y-auto">
                <form onSubmit={onSaveChanges} className="h-full">
                  <div className="grid grid-cols-1 gap-2.5">
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
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-0.5">
                          Date <span className="text-red-500">*</span>
                        </label>
                        <input
                          name="date"
                          value={editForm.date}
                          onChange={onEditChange}
                          type="date"
                          required
                          min={new Date().toISOString().split('T')[0]}
                          className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors"
                        />
                      </div>
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
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-0.5">
                          Start Time <span className="text-red-500">*</span>
                        </label>
                        <input
                          name="time"
                          value={editForm.time}
                          onChange={onEditChange}
                          type="time"
                          required
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
                          onChange={onEditChange}
                          type="time"
                          required
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
                    
                    {/* Attendees Section Header */}
                    <div className="pt-1">
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-xs font-medium text-gray-700">
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
                          className={`px-2.5 py-1 rounded-lg transition-all shadow-sm hover:shadow-md flex items-center gap-1.5 text-xs font-semibold group ${
                            attendeesEdit.length === employeeOptions.length
                              ? 'bg-gradient-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700'
                              : 'bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700'
                          }`}
                        >
                          {attendeesEdit.length === employeeOptions.length ? (
                            <>
                              <svg className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                              <span>Deselect All</span>
                            </>
                          ) : (
                            <>
                              <svg className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <span>Select All ({employeeOptions.length})</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                    
                    {/* Position Selection */}
                    <div>
                      <select
                        value=""
                        onChange={(e) => {
                          if (e.target.value) {
                            handlePositionSelectEdit(e.target.value);
                            e.target.value = "";
                          }
                        }}
                        className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 bg-white transition-colors"
                      >
                        <option value="">Select by Position</option>
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
                        <div className="mt-2 flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-2 bg-gray-50 rounded-lg border border-gray-200">
                          {selectedPositionsEdit.map((pos) => {
                            const empCount = employeesByPositionMapEdit[pos]?.length || 0;
                            return (
                              <div
                                key={pos}
                                className="flex items-center gap-1.5 bg-blue-50 border border-blue-200 rounded-md px-2 py-0.5 group hover:bg-blue-100 transition-colors"
                              >
                                <span className="text-xs font-medium text-blue-800">{pos}</span>
                                <span className="text-[10px] text-blue-700 bg-blue-200 px-1 py-0.5 rounded-full font-medium">
                                  {empCount}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handlePositionRemoveEdit(pos)}
                                  className="text-blue-600 hover:text-red-600 hover:bg-red-100 rounded-full p-0.5 transition-colors"
                                  title={`Remove ${pos} and its employees`}
                                >
                                  <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </form>
              </div>

              {/* Right Side - Others Search and Selected Attendees List (50% width) */}
              <div className="w-[50%] px-5 py-4 bg-gray-50 overflow-hidden">
                <div className="h-full flex flex-col">
                  {/* Search Input - Optional for additional employees */}
                  <div className="mb-2.5 relative">
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Others
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
                      className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 bg-white transition-colors"
                      placeholder="Search employee name..."
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
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                  
                  {/* Attendees List - Scrollable */}
                  <div className="flex-1 flex flex-col min-h-0">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-gray-700">
                        Selected Depots <span className="text-gray-500">({attendeesEdit.length})</span>
                      </span>
                      {attendeesEdit.length > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            setAttendeesEdit([]);
                            setSelectedPositionsEdit([]);
                            setEmployeesByPositionMapEdit({});
                          }}
                          className="text-xs text-red-600 hover:text-red-700 font-medium transition-colors"
                        >
                          Clear All
                        </button>
                      )}
                    </div>
                    <div className="border border-gray-300 rounded-lg p-2 bg-white flex-1 overflow-y-auto">
                      {attendeesEdit.length > 0 ? (
                        <div className="space-y-1">
                          {attendeesEdit.map((name, i) => (
                            <div key={i} className="flex items-center justify-between px-2 py-1 bg-gray-50 rounded border border-gray-200 hover:bg-gray-100 transition-colors">
                              <span className="text-xs text-gray-700 truncate flex-1">{name}</span>
                              <button
                                type="button"
                                onClick={() => removeAttendeeEdit(i)}
                                className="text-red-600 hover:text-red-700 text-sm font-bold ml-2 flex-shrink-0 transition-colors"
                                title="Remove"
                              >
                                ×
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-gray-400 text-center py-8">No attendees added yet. Select positions or search for employees.</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
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
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center px-4 z-50" onClick={() => setShowConfirmAddModal(false)}>
          <div className="bg-white/95 backdrop-blur-md rounded-xl w-full max-w-md shadow-2xl border border-black" onClick={(e) => e.stopPropagation()}>
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
            <div className="px-6 py-4">
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-gray-500 uppercase font-semibold">Training Title</p>
                  <p className="text-sm text-gray-900 font-medium mt-1">{form.title}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase font-semibold">Date & Time</p>
                  <p className="text-sm text-gray-900 mt-1">{form.date} at {form.time} - {form.end_time}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase font-semibold">Venue</p>
                  <p className="text-sm text-gray-900 mt-1">{form.venue}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase font-semibold">Attendees</p>
                  <p className="text-sm text-gray-900 mt-1">{attendees.length} employee(s)</p>
                </div>
              </div>
              <p className="text-sm text-gray-600 mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <span className="font-semibold">Note:</span> Email notifications will be sent to all attendees.
              </p>
            </div>
            <div className="px-6 py-4 bg-gray-50/80 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => setShowConfirmAddModal(false)}
                className="px-4 py-2 rounded-lg bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors font-medium text-sm"
              >
                Cancel
              </button>
              <button
                onClick={confirmAddTraining}
                className="px-4 py-2 rounded-lg bg-[#800000] text-white hover:bg-[#990000] transition-colors font-medium text-sm"
              >
                Confirm & Create
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default HrTrainings;