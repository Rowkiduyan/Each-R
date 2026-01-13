// EmployeeCertificatesView.jsx
// Component to view and download training certificates for employees and agencies
import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { downloadCertificate } from '../utils/trainingCertificateGenerator';

function EmployeeCertificatesView({ userId, isAgencyView = false }) {
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [downloading, setDownloading] = useState(null);

  useEffect(() => {
    if (userId) {
      fetchCertificates();
    }
  }, [userId, isAgencyView]);

  const fetchCertificates = async () => {
    try {
      setLoading(true);
      
      let data = [];
      
      if (isAgencyView) {
        // Fetch certificates for all employees under this agency
        const [result1, result2] = await Promise.all([
          supabase
            .from('employees')
            .select('email')
            .eq('agency_profile_id', userId),
          supabase
            .from('employees')
            .select('email')
            .eq('endorsed_by_agency_id', userId)
        ]);

        const emails = [
          ...(result1.data || []).map(e => e.email),
          ...(result2.data || []).map(e => e.email)
        ];

        if (emails.length > 0) {
          // Get certificates by employee names (since we store names in generated_certificates)
          const { data: certsData, error } = await supabase
            .from('generated_certificates')
            .select(`
              *,
              trainings (
                id,
                title,
                start_at,
                venue,
                description
              )
            `)
            .order('sent_at', { ascending: false });

          if (error) throw error;
          
          // Filter certificates that belong to agency employees
          data = (certsData || []).filter(cert => {
            // Match by employee_id or by checking if the name matches any employee
            return cert.employee_id ? true : false;
          });
        }
      } else {
        // Fetch certificates for specific employee
        const { data: certsData, error } = await supabase
          .from('generated_certificates')
          .select(`
            *,
            trainings (
              id,
              title,
              start_at,
              venue,
              description
            )
          `)
          .eq('employee_id', userId)
          .order('sent_at', { ascending: false });

        if (error) throw error;
        data = certsData || [];
      }

      setCertificates(data);
    } catch (err) {
      console.error('Error fetching certificates:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (certificate) => {
    try {
      setDownloading(certificate.id);
      const result = await downloadCertificate(certificate);
      
      if (!result.success) {
        alert('Failed to download certificate: ' + result.error);
      }
    } catch (err) {
      console.error('Download error:', err);
      alert('Failed to download certificate');
    } finally {
      setDownloading(null);
    }
  };

  const handleView = (certificate) => {
    // Open certificate URL in new tab
    window.open(certificate.certificate_url, '_blank');
  };

  // Filter certificates based on search query
  const filteredCertificates = certificates.filter(cert => {
    const query = searchQuery.toLowerCase();
    return (
      cert.employee_name?.toLowerCase().includes(query) ||
      cert.trainings?.title?.toLowerCase().includes(query) ||
      cert.trainings?.venue?.toLowerCase().includes(query)
    );
  });

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
        <p className="mt-2 text-gray-600">Loading certificates...</p>
      </div>
    );
  }

  return (
    <div className="employee-certificates-view">
      {/* Header */}
      <div className="mb-4">
        <h3 className="text-lg font-semibold mb-2">
          {isAgencyView ? 'Employee Training Certificates' : 'My Training Certificates'}
        </h3>
        
        {/* Search Bar */}
        {certificates.length > 0 && (
          <input
            type="text"
            placeholder="Search by employee name, training, or venue..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 border rounded-lg"
          />
        )}
      </div>

      {/* No Certificates Message */}
      {certificates.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <p className="mt-4 text-gray-600 font-medium">No certificates yet</p>
          <p className="text-sm text-gray-500 mt-1">
            {isAgencyView 
              ? 'Certificates will appear here when HR generates them for completed trainings'
              : 'Complete trainings to receive certificates'}
          </p>
        </div>
      ) : (
        /* Certificates Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredCertificates.map((cert) => (
            <div
              key={cert.id}
              className="bg-white border rounded-lg p-4 hover:shadow-lg transition-shadow"
            >
              {/* Certificate Icon */}
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0">
                  <svg
                    className="h-10 w-10 text-blue-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
                    />
                  </svg>
                </div>

                <div className="flex-1 min-w-0">
                  {/* Employee Name (for agency view) */}
                  {isAgencyView && (
                    <p className="font-semibold text-gray-900 mb-1">
                      {cert.employee_name}
                    </p>
                  )}

                  {/* Training Title */}
                  <h4 className="font-medium text-gray-900 truncate">
                    {cert.trainings?.title || 'Training Certificate'}
                  </h4>

                  {/* Training Date */}
                  <p className="text-sm text-gray-600 mt-1">
                    📅 {cert.trainings?.start_at
                      ? new Date(cert.trainings.start_at).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })
                      : 'Date N/A'}
                  </p>

                  {/* Training Venue */}
                  {cert.trainings?.venue && (
                    <p className="text-sm text-gray-600">
                      📍 {cert.trainings.venue}
                    </p>
                  )}

                  {/* Issue Date */}
                  <p className="text-xs text-gray-500 mt-2">
                    Issued: {new Date(cert.sent_at).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => handleView(cert)}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  View
                </button>
                <button
                  onClick={() => handleDownload(cert)}
                  disabled={downloading === cert.id}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:bg-gray-400"
                >
                  {downloading === cert.id ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin h-4 w-4 mr-2" viewBox="0 0 24 24">
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                          fill="none"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                      Downloading...
                    </span>
                  ) : (
                    '⬇ Download'
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* No Search Results */}
      {certificates.length > 0 && filteredCertificates.length === 0 && (
        <div className="text-center py-8 bg-gray-50 rounded-lg">
          <p className="text-gray-600">No certificates match your search</p>
          <button
            onClick={() => setSearchQuery('')}
            className="mt-2 text-blue-600 hover:underline text-sm"
          >
            Clear search
          </button>
        </div>
      )}
    </div>
  );
}

export default EmployeeCertificatesView;
