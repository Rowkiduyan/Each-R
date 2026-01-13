// CertificateTemplateManager.jsx
// This component allows HR to upload and manage Word document templates for training certificates
import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

function CertificateTemplateManager() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [templateName, setTemplateName] = useState('');
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [bucketExists, setBucketExists] = useState(null);

  // Check if bucket exists on mount
  useEffect(() => {
    checkBucket();
  }, []);

  const checkBucket = async () => {
    try {
      // Try to list files in the bucket instead of listing buckets
      // This works even without admin permission
      const { data, error } = await supabase.storage
        .from('certificate-templates')
        .list('templates', { limit: 1 });
      
      // If we can list (even if empty), bucket exists
      const exists = !error || !error.message?.includes('Bucket not found');
      console.log('Certificate-templates bucket check:', { exists, error: error?.message });
      
      setBucketExists(exists);
      
      if (exists) {
        // Clear error if bucket now exists
        setError(null);
        setSuccess('✅ Storage bucket found!');
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError('⚠️ Storage bucket "certificate-templates" not found! Create it in Supabase Dashboard → Storage');
      }
    } catch (err) {
      console.error('Error checking bucket:', err);
      setBucketExists(false);
    }
  };

  // Fetch existing templates on component mount
  useEffect(() => {
    fetchTemplates();
  }, []);

  // Fetch all certificate templates from database
  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('certificate_templates')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTemplates(data || []);
    } catch (err) {
      console.error('Error fetching templates:', err);
      setError('Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

  // Upload template to Supabase storage and save to database
  const handleUpload = async (e) => {
    e.preventDefault();
    
    if (!selectedFile || !templateName) {
      setError('Please provide a template name and select a file');
      return;
    }

    // Check bucket exists first
    if (bucketExists === false) {
      setError('❌ Cannot upload: Storage bucket "certificate-templates" does not exist!\n\nCREATE IT NOW:\n1. Go to Supabase Dashboard\n2. Storage → New bucket\n3. Name: certificate-templates\n4. Public: OFF\n5. Click Create');
      return;
    }

    try {
      setUploading(true);
      setError(null);

      // Get current user
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) throw new Error('Not authenticated');

      // Generate unique file path
      const timestamp = Date.now();
      const fileName = `${timestamp}_${selectedFile.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      const filePath = `templates/${fileName}`;

      // Upload file to Supabase storage (certificate-templates bucket)
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('certificate-templates')
        .upload(filePath, selectedFile, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      // Get public URL for the uploaded file
      const { data: urlData } = supabase.storage
        .from('certificate-templates')
        .getPublicUrl(filePath);

      // Save template info to database
      const { data: templateData, error: dbError } = await supabase
        .from('certificate_templates')
        .insert([
          {
            template_name: templateName,
            file_url: urlData.publicUrl,
            file_path: filePath,
            uploaded_by: user.id,
            is_active: true
          }
        ])
        .select()
        .single();

      if (dbError) throw dbError;

      // Success!
      setSuccess('Template uploaded successfully!');
      setTemplates([templateData, ...templates]);
      
      // Reset form
      setSelectedFile(null);
      setTemplateName('');
      setShowUploadForm(false);
      
      // Recheck bucket
      checkBucket();
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error uploading template:', err);
      
      // Better error messages
      let errorMessage = err.message || 'Failed to upload template';
      
      if (err.message?.includes('row-level security') || err.message?.includes('new row violates')) {
        errorMessage = '❌ BUCKET NOT CREATED YET!\n\nGo to Supabase Dashboard:\n→ Storage\n→ New bucket\n→ Name: certificates-templates\n→ Public: OFF\n→ Create bucket\n\nThen try again!';
      } else if (err.message?.includes('permission denied')) {
        errorMessage = 'Permission denied. Make sure:\n1. You are logged in as HR\n2. Storage policies are set up (run database_setup.sql)';
      } else if (err.message?.includes('not found') || err.message?.includes('Bucket not found')) {
        errorMessage = '❌ Bucket "certificates-templates" not found.\n\nCreate it in Supabase Dashboard → Storage → New bucket';
      }
      
      setError(errorMessage);
      setBucketExists(false);
    } finally {
      setUploading(false);
    }
  };

  // Toggle template active status
  const toggleTemplateStatus = async (templateId, currentStatus) => {
    try {
      const { error } = await supabase
        .from('certificate_templates')
        .update({ is_active: !currentStatus })
        .eq('id', templateId);

      if (error) throw error;

      // Update local state
      setTemplates(templates.map(t => 
        t.id === templateId ? { ...t, is_active: !currentStatus } : t
      ));
      
      setSuccess('Template status updated');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error updating template status:', err);
      setError('Failed to update template status');
    }
  };

  // Delete template
  const deleteTemplate = async (template) => {
    if (!confirm(`Are you sure you want to delete "${template.template_name}"?`)) {
      return;
    }

    try {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('certificate-templates')
        .remove([template.file_path]);

      if (storageError) console.error('Storage delete error:', storageError);

      // Delete from database
      const { error: dbError } = await supabase
        .from('certificate_templates')
        .delete()
        .eq('id', template.id);

      if (dbError) throw dbError;

      // Update local state
      setTemplates(templates.filter(t => t.id !== template.id));
      setSuccess('Template deleted successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error deleting template:', err);
      setError('Failed to delete template');
    }
  };

  // Handle file selection
  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type (only .docx files)
      if (!file.name.endsWith('.docx')) {
        setError('Please select a Word document (.docx) file');
        return;
      }
      setSelectedFile(file);
      setError(null);
    }
  };

  return (
    <div className="certificate-template-manager">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Certificate Templates</h3>
        <button
          onClick={() => setShowUploadForm(!showUploadForm)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm"
        >
          {showUploadForm ? 'Cancel' : '+ Upload Template'}
        </button>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
          {success}
        </div>
      )}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <div className="font-semibold mb-2">⚠️ Error</div>
          <pre className="text-xs whitespace-pre-wrap">{error}</pre>
        </div>
      )}
      
      {/* Bucket Status Warning */}
      {bucketExists === false && !error && (
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-800 px-4 py-3 rounded mb-4">
          <div className="font-semibold mb-2">⚠️ Setup Required</div>
          <p className="text-sm mb-2">Storage bucket "certificates-templates" not found.</p>
          <p className="text-xs">Create it in Supabase Dashboard → Storage → New bucket</p>
          <button
            onClick={checkBucket}
            className="mt-2 text-xs bg-yellow-200 hover:bg-yellow-300 px-3 py-1 rounded"
          >
            🔄 Recheck
          </button>
        </div>
      )}

      {/* Upload Form */}
      {showUploadForm && (
        <div className="bg-gray-50 p-4 rounded-lg mb-4 border border-gray-200">
          <h4 className="font-semibold mb-3">Upload New Template</h4>
          <form onSubmit={handleUpload} className="space-y-3">
            <div>
              <label className="block text-sm font-medium mb-1">Template Name</label>
              <input
                type="text"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="e.g., Training Certificate 2024"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">
                Upload Word Document (.docx)
              </label>
              <input
                type="file"
                accept=".docx"
                onChange={handleFileSelect}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                required
              />
              {selectedFile && (
                <p className="text-sm text-gray-600 mt-1">
                  Selected: {selectedFile.name}
                </p>
              )}
            </div>

            <div className="bg-blue-50 border border-blue-200 p-3 rounded text-sm">
              <p className="font-semibold mb-1">📝 Template Instructions:</p>
              <p className="text-gray-700">Use these placeholders in your Word document:</p>
              <ul className="list-disc list-inside mt-1 text-xs text-gray-600">
                <li><code>{'{employee_name}'}</code> - Employee's full name</li>
                <li><code>{'{training_title}'}</code> - Training title</li>
                <li><code>{'{training_date}'}</code> - Training date</li>
                <li><code>{'{completion_date}'}</code> - Certificate generation date</li>
              </ul>
            </div>

            <button
              type="submit"
              disabled={uploading || !selectedFile || !templateName}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              {uploading ? 'Uploading...' : 'Upload Template'}
            </button>
          </form>
        </div>
      )}

      {/* Templates List */}
      <div className="mt-4">
        {loading ? (
          <p className="text-center text-gray-500 py-4">Loading templates...</p>
        ) : templates.length === 0 ? (
          <div className="text-center text-gray-500 py-8 bg-gray-50 rounded-lg border border-gray-200">
            <p className="mb-2">No templates uploaded yet</p>
            <p className="text-sm">Click "Upload Template" to add your first certificate template</p>
          </div>
        ) : (
          <div className="space-y-3">
            {templates.map(template => (
              <div
                key={template.id}
                className={`p-4 rounded-lg border ${
                  template.is_active 
                    ? 'bg-white border-green-300' 
                    : 'bg-gray-50 border-gray-300'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-800">
                      {template.template_name}
                      {template.is_active && (
                        <span className="ml-2 text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                          Active
                        </span>
                      )}
                    </h4>
                    <p className="text-xs text-gray-500 mt-1">
                      Uploaded: {new Date(template.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  
                  <div className="flex gap-2">
                    <button
                      onClick={() => toggleTemplateStatus(template.id, template.is_active)}
                      className={`text-xs px-3 py-1 rounded ${
                        template.is_active
                          ? 'bg-yellow-100 hover:bg-yellow-200 text-yellow-800'
                          : 'bg-green-100 hover:bg-green-200 text-green-800'
                      }`}
                    >
                      {template.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                    <button
                      onClick={() => deleteTemplate(template)}
                      className="text-xs px-3 py-1 rounded bg-red-100 hover:bg-red-200 text-red-800"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default CertificateTemplateManager;
