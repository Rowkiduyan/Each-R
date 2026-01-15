// trainingCertificateGenerator.js
// Utility functions to generate training certificates from Word templates
import { supabase } from '../supabaseClient';
import createReport from 'docx-templates';
import { saveAs } from 'file-saver';

/**
 * Generate certificates for employees who attended a training
 * @param {Object} training - Training object with details
 * @param {Array} attendees - Array of attendee objects with { name, email, userId }
 * @returns {Promise<Object>} Result object with success/failure info
 */
export async function generateTrainingCertificates(training, attendees) {
  try {
    console.log('Starting certificate generation for training:', training.title);
    
    // 1. Get the active certificate template
    const { data: template, error: templateError } = await supabase
      .from('certificate_templates')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (templateError || !template) {
      throw new Error('No active certificate template found. Please upload a template first.');
    }

    console.log('Using template:', template.template_name);
    console.log('Template ID:', template.id, 'Type:', typeof template.id);

    // 2. Download the Word template from storage
    const { data: templateFile, error: downloadError } = await supabase.storage
      .from('certificate-templates')
      .download(template.file_path);

    if (downloadError || !templateFile) {
      throw new Error('Failed to download certificate template');
    }

    console.log('Template file downloaded:', {
      type: templateFile.type,
      size: templateFile.size,
      name: template.file_path
    });

    console.log('Using template file as Blob');
    
    // 4. Get current user (HR who is generating certificates)
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error('Authentication failed');
    }

    // 5. Generate certificate for each attendee
    const results = {
      successful: [],
      failed: []
    };

    for (const attendee of attendees) {
      try {
        console.log(`Generating certificate for: ${attendee.name}`);

        // Prepare data to fill into the template
        // Ensure EVERYTHING is explicitly a string
        const trainingDate = training.date ? String(formatDate(training.date)) : 'N/A';
        const completionDate = String(formatDate(new Date()));
        
        // Create data object with only plain strings
        const certificateData = {};
        certificateData.employee_name = String(attendee.name || '');
        certificateData.training_title = String(training.title || 'Training Program');
        certificateData.training_date = String(trainingDate);
        certificateData.description = String(training.description || 'Professional development training');
        certificateData.venue = String(training.venue || 'N/A');
        certificateData.completion_date = String(completionDate);

        // Verify all values are strings
        console.log('Certificate data prepared:', certificateData);
        console.log('Data types:', Object.entries(certificateData).map(([k,v]) => `${k}: ${typeof v}`).join(', '));

        // Generate the certificate document using the template
        const reportBuffer = await createReport({
          template: templateFile,
          data: certificateData,
          cmdDelimiter: ['{', '}'], // Use {placeholder} format
          noSandbox: true, // Disable VM sandbox for browser compatibility
          failFast: false, // Continue on errors
          processLineBreaks: false, // Don't process line breaks
          literalXmlDelimiter: '||' // Use different delimiter for literal XML
        });

        // Convert to Blob for upload
        const blob = new Blob([reportBuffer], {
          type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        });

        // Create unique filename
        const timestamp = Date.now();
        const sanitizedName = attendee.name.replace(/[^a-zA-Z0-9]/g, '_');
        const sanitizedTitle = training.title.replace(/[^a-zA-Z0-9]/g, '_');
        const fileName = `${sanitizedTitle}_${sanitizedName}_${timestamp}.docx`;
        const filePath = `certificates/${training.id}/${fileName}`;

        // Upload generated certificate to storage
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('training-certificates')
          .upload(filePath, blob, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) {
          throw new Error(`Upload failed: ${uploadError.message}`);
        }

        // Get public URL for DOCX
        const { data: urlData } = supabase.storage
          .from('training-certificates')
          .getPublicUrl(filePath);

        // Save certificate record to database
        console.log('Saving certificate with template_id:', template.id);
        const { data: certRecord, error: dbError } = await supabase
          .from('generated_certificates')
          .insert([
            {
              training_id: training.id,
              employee_id: attendee.userId || null,
              employee_name: attendee.name,
              certificate_url: urlData.publicUrl,
              certificate_path: filePath,
              template_used_id: template.id || null,
              sent_by: user.id,
              sent_at: new Date().toISOString()
            }
          ])
          .select()
          .single();

        if (dbError) {
          console.error('Database insert error:', dbError);
          throw new Error(`Database error: ${dbError.message}`);
        }

        results.successful.push({
          name: attendee.name,
          certificateUrl: urlData.publicUrl
        });

        console.log(`✅ Certificate generated for ${attendee.name}`);
      } catch (err) {
        console.error(`❌ Failed to generate certificate for ${attendee.name}:`, err);
        results.failed.push({
          name: attendee.name,
          error: err.message
        });
      }
    }

    return {
      success: true,
      results,
      message: `Generated ${results.successful.length} certificates. ${results.failed.length} failed.`
    };
  } catch (error) {
    console.error('Certificate generation error:', error);
    return {
      success: false,
      error: error.message,
      results: { successful: [], failed: [] }
    };
  }
}

/**
 * Download a certificate for an employee
 * @param {Object} certificate - Certificate record from database
 */
export async function downloadCertificate(certificate) {
  try {
    // Download from storage
    const { data, error } = await supabase.storage
      .from('training-certificates')
      .download(certificate.certificate_path);

    if (error) throw error;

    // Trigger download in browser
    const fileName = `Training_Certificate_${certificate.employee_name.replace(/[^a-zA-Z0-9]/g, '_')}.docx`;
    saveAs(data, fileName);
    
    return { success: true };
  } catch (error) {
    console.error('Download error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get all certificates for a specific employee
 * @param {String} employeeId - User ID of the employee
 * @returns {Promise<Array>} Array of certificate records
 */
export async function getEmployeeCertificates(employeeId) {
  try {
    const { data, error } = await supabase
      .from('generated_certificates')
      .select(`
        *,
        trainings (
          id,
          title,
          date,
          venue,
          description
        )
      `)
      .eq('employee_id', employeeId)
      .order('sent_at', { ascending: false });

    if (error) throw error;
    return { success: true, certificates: data || [] };
  } catch (error) {
    console.error('Error fetching certificates:', error);
    return { success: false, error: error.message, certificates: [] };
  }
}

/**
 * Get all certificates for employees under an agency
 * @param {String} agencyId - Agency user ID
 * @returns {Promise<Array>} Array of certificate records
 */
export async function getAgencyEmployeeCertificates(agencyId) {
  try {
    // Get all certificates and filter by agency employees
    // This avoids querying auth.users which is restricted
    const { data: allCerts, error } = await supabase
      .from('generated_certificates')
      .select(`
        *,
        trainings (
          id,
          title,
          date,
          venue,
          description
        )
      `)
      .order('sent_at', { ascending: false });

    if (error) throw error;

    // Get agency employees
    const [result1, result2] = await Promise.all([
      supabase
        .from('employees')
        .select('id, fname, lname, mname')
        .eq('agency_profile_id', agencyId),
      supabase
        .from('employees')
        .select('id, fname, lname, mname')
        .eq('endorsed_by_agency_id', agencyId)
    ]);

    const employees = [...(result1.data || []), ...(result2.data || [])];
    
    // Create name variations for matching
    const employeeNames = new Set();
    employees.forEach(emp => {
      const { fname, lname, mname } = emp;
      const lastFirst = [lname, fname].filter(Boolean).join(', ');
      const full = [lastFirst, mname].filter(Boolean).join(' ').trim();
      if (full) employeeNames.add(full);
      if (lastFirst) employeeNames.add(lastFirst.trim());
      const firstLast = [fname, lname].filter(Boolean).join(' ').trim();
      if (firstLast) employeeNames.add(firstLast);
    });

    // Filter certificates by matching employee names
    const agencyCerts = (allCerts || []).filter(cert => 
      employeeNames.has(cert.employee_name)
    );

    return { success: true, certificates: agencyCerts };
  } catch (error) {
    console.error('Error fetching agency certificates:', error);
    return { success: false, error: error.message, certificates: [] };
  }
}

/**
 * Helper: Format date to readable string
 */
function formatDate(date) {
  if (!date) return 'N/A';
  const d = new Date(date);
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

/**
 * Helper: Calculate duration from start and end time
 */
function calculateDuration(startTime, endTime) {
  if (!startTime || !endTime) return 'N/A';
  
  try {
    const start = new Date(`2000-01-01T${startTime}`);
    const end = new Date(`2000-01-01T${endTime}`);
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
  } catch (err) {
    return 'N/A';
  }
}

/**
 * Check if certificates have been generated for a training
 * @param {String} trainingId - Training ID
 * @returns {Promise<Object>} Info about existing certificates
 */
export async function checkTrainingCertificates(trainingId) {
  try {
    const { data, error, count } = await supabase
      .from('generated_certificates')
      .select('*', { count: 'exact' })
      .eq('training_id', trainingId);

    if (error) throw error;
    
    return {
      success: true,
      hasCertificates: count > 0,
      count: count || 0,
      certificates: data || []
    };
  } catch (error) {
    console.error('Error checking certificates:', error);
    return {
      success: false,
      hasCertificates: false,
      count: 0,
      certificates: []
    };
  }
}
