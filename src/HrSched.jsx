import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { supabase } from './supabaseClient';

function HrSched() {
  const [date, setDate] = useState(new Date());
  const [interviews, setInterviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newInterview, setNewInterview] = useState({
    applicant_name: '',
    position: '',
    time: '',
    date: '',
    status: 'scheduled'
  });
  const navigate = useNavigate();

  useEffect(() => {
    fetchInterviews();
  }, []);

  const fetchInterviews = async () => {
    setLoading(true);
    try {
      // First get applications with interview dates
      const { data: applicationsData, error: appsError } = await supabase
        .from('applications')
        .select('id, user_id, payload, interview_date, interview_time, status')
        .not('interview_date', 'is', null)
        .order('interview_date', { ascending: true });
      
      if (appsError) {
        console.error('Error fetching applications:', appsError);
        setInterviews([]);
        return;
      }

      if (!applicationsData || applicationsData.length === 0) {
        console.log('No applications with interview_date found');
        setInterviews([]);
        return;
      }

      console.log('Applications data:', applicationsData);

      // Get all unique applicant IDs
      const applicantIds = [...new Set(applicationsData.map(app => app.user_id).filter(Boolean))];

      if (applicantIds.length === 0) {
        console.log('No valid user_ids found');
        setInterviews([]);
        return;
      }

      // Fetch applicant names
      const { data: applicantsData, error: applicantsError } = await supabase
        .from('applicants')
        .select('id, fname, lname')
        .in('id', applicantIds);

      if (applicantsError) {
        console.error('Error fetching applicants:', applicantsError);
      }

      console.log('Applicants data:', applicantsData);

      // Create a map of applicant IDs to names
      const applicantMap = {};
      if (applicantsData) {
        applicantsData.forEach(applicant => {
          applicantMap[applicant.id] = `${applicant.fname} ${applicant.lname}`;
        });
      }

      // Transform the data to match our component's expected format
      const transformedData = applicationsData.map(app => {
        console.log('Processing app:', app.id, 'payload:', app.payload);
        return {
          id: app.id,
          applicant_name: applicantMap[app.user_id] || 'Unknown Applicant',
          position: app.payload?.job?.title || app.payload?.title || app.payload?.job_title || 'N/A',
          date: app.interview_date,
          time: app.interview_time || 'Not set',
          status: app.status || 'scheduled'
        };
      });
      
      console.log('Transformed interviews:', transformedData);
      setInterviews(transformedData);
    } catch (error) {
      console.error('Error fetching interviews:', error);
      setInterviews([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDateClick = (clickedDate) => {
    setSelectedDate(clickedDate);
  };

  const getInterviewsForDate = (date) => {
    const dateString = date.toISOString().split('T')[0];
    return interviews.filter(interview => interview.date === dateString);
  };

  const handleAddInterview = () => {
    setNewInterview({
      ...newInterview,
      date: selectedDate ? selectedDate.toISOString().split('T')[0] : ''
    });
    setShowAddModal(true);
  };

  const saveInterview = async () => {
    if (!newInterview.applicant_name || !newInterview.position || !newInterview.date || !newInterview.time) {
      alert('Please fill in all fields');
      return;
    }

    try {
      // Split the full name into first and last name
      const nameParts = newInterview.applicant_name.trim().split(' ');
      const firstName = nameParts[0];
      const lastName = nameParts.slice(1).join(' ') || '';

      const { data, error } = await supabase
        .from('applications')
        .insert([{
          first_name: firstName,
          last_name: lastName,
          position: newInterview.position,
          interview_date: newInterview.date,
          interview_time: newInterview.time,
          status: 'scheduled'
        }])
        .select();

      if (error) {
        console.error('Error saving interview:', error);
        alert(`Failed to schedule interview: ${error.message}`);
      } else {
        setShowAddModal(false);
        setNewInterview({
          applicant_name: '',
          position: '',
          time: '',
          date: '',
          status: 'scheduled'
        });
        fetchInterviews(); // Refresh the list
      }
    } catch (err) {
      console.error('Unexpected error saving interview:', err);
      alert(`Failed to schedule interview: ${err.message}`);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'scheduled':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const tileContent = ({ date, view }) => {
    if (view === 'month') {
      const dateString = date.toISOString().split('T')[0];
      const dayInterviews = interviews.filter(interview => interview.date === dateString);
      
      if (dayInterviews.length > 0) {
        return (
          <div className="flex justify-center items-center">
            <div className="w-2 h-2 bg-red-600 rounded-full mt-1"></div>
          </div>
        );
      }
    }
    return null;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading interview schedules...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Header with Return Button */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">Interview Schedules</h1>
              <p className="text-gray-600 mt-1">Manage and view all interview appointments</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar Section */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Calendar View</h2>
            <div className="flex justify-center">
              <Calendar
                onChange={setDate}
                value={date}
                onClickDay={handleDateClick}
                tileContent={tileContent}
                className="w-full max-w-none"
                style={{ width: '100%', fontSize: '18px', maxWidth: '100%' }}
              />
            </div>
            <div className="flex items-center justify-center gap-2 mt-4">
              <div className="w-2 h-2 bg-red-600 rounded-full"></div>
              <p className="text-sm text-gray-600">Interview scheduled</p>
            </div>
            <p className="text-sm text-gray-600 text-center">
              Click on a date to view interviews
            </p>
          </div>
        </div>

        {/* Interview Details Section */}
        <div className="space-y-6">
          {/* Selected Date Info */}
          {selectedDate && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="mb-4">
                <h3 className="text-lg font-bold text-gray-800">
                  {selectedDate.toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </h3>
              </div>
              
              <div className="space-y-3">
                {getInterviewsForDate(selectedDate).map(interview => (
                  <div key={interview.id} className="border rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-semibold text-gray-800">{interview.applicant_name}</h4>
                        <p className="text-sm text-gray-600">{interview.position}</p>
                        <p className="text-sm text-gray-600">Time: {interview.time}</p>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(interview.status)}`}>
                        {interview.status}
                      </span>
                    </div>
                  </div>
                ))}
                {getInterviewsForDate(selectedDate).length === 0 && (
                  <p className="text-gray-500 text-center py-4">No interviews scheduled for this date</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add Interview Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 border border-black">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Schedule New Interview</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Applicant Name
                </label>
                <input
                  type="text"
                  value={newInterview.applicant_name}
                  onChange={(e) => setNewInterview({...newInterview, applicant_name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="Enter applicant name"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Position
                </label>
                <input
                  type="text"
                  value={newInterview.position}
                  onChange={(e) => setNewInterview({...newInterview, position: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="Enter position"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date
                </label>
                <input
                  type="date"
                  value={newInterview.date}
                  onChange={(e) => setNewInterview({...newInterview, date: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Time
                </label>
                <input
                  type="time"
                  value={newInterview.time}
                  onChange={(e) => setNewInterview({...newInterview, time: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
            
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
              >
                Cancel
              </button>
              <button
                onClick={saveInterview}
                disabled={!newInterview.applicant_name || !newInterview.position || !newInterview.date || !newInterview.time}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                Schedule Interview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default HrSched;