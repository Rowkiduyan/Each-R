import { supabase } from '../supabaseClient';

export async function generateTrainingCertificates(training, attendees) {
  try {
    console.log('Starting simple certificate generation for:', training.title);
    
    if (!window.jspdf || !window.jspdf.jsPDF) {
      throw new Error('jsPDF library not loaded. Please refresh the page.');
    }

    const results = {
      successful: [],
      failed: [],
      totalProcessed: 0
    };

    const completionDate = training.end_at ? 
      new Date(training.end_at).toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      }) : 
      new Date().toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });

    const { data: { user } } = await supabase.auth.getUser();

    try {
      const attendeeNames = attendees.map(a => a.name);
      const { data: existingCerts } = await supabase
        .from('generated_certificates')
        .select('id, certificate_path')
        .eq('training_id', training.id)
        .in('employee_name', attendeeNames);

      if (existingCerts && existingCerts.length > 0) {
        const pathsToRemove = existingCerts.map(cert => cert.certificate_path).filter(Boolean);
        if (pathsToRemove.length > 0) {
          await supabase.storage.from('certificates').remove(pathsToRemove);
        }
        const existingIds = existingCerts.map(cert => cert.id);
        await supabase.from('generated_certificates').delete().in('id', existingIds);
      }
    } catch (cleanupErr) {
      console.warn('Certificate cleanup warning:', cleanupErr.message);
    }

    console.log('Loading images...');
    const logoBase64 = await loadImageAsBase64('/src/photos/roadwiseLogo_nobg.png');
    const opsMgrSig = await loadImageAsBase64(training.operations_manager_signature);
    const safetySig = await loadImageAsBase64(training.safety_officer_signature);
    const hrSig = await loadImageAsBase64(training.hr_manager_signature);
    const genMgrSig = await loadImageAsBase64(training.general_manager_signature);
    console.log('Images loaded:', { 
      logo: !!logoBase64, 
      ops: !!opsMgrSig, 
      safety: !!safetySig, 
      hr: !!hrSig, 
      gm: !!genMgrSig 
    });

    for (const attendee of attendees) {
      try {
        results.totalProcessed++;
        console.log(`Generating certificate ${results.totalProcessed}/${attendees.length} for: ${attendee.name}`);

        const pdfBlob = await createCertificatePDF({
          employeeName: attendee.name,
          trainingTitle: training.title,
          certificateTitle: training.certificate_title || 'Certificate of Completion',
          venue: training.venue || 'N/A',
          completionDate: completionDate,
          logoBase64: logoBase64,
          signatures: {
            operationsManager: { name: training.operations_manager_name, image: opsMgrSig },
            safetyOfficer: { name: training.safety_officer_name, image: safetySig },
            hrManager: { name: training.hr_manager_name, image: hrSig },
            generalManager: { name: training.general_manager_name, image: genMgrSig }
          }
        });

        if (!pdfBlob) {
          throw new Error('PDF generation failed');
        }

        console.log(`PDF generated, size: ${pdfBlob.size} bytes`);

        const fileName = `${training.id}_${attendee.userId || attendee.name.replace(/\s+/g, '_')}_${Date.now()}.pdf`;
        const filePath = `training-certificates/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('certificates')
          .upload(filePath, pdfBlob, {
            contentType: 'application/pdf',
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('certificates')
          .getPublicUrl(filePath);

        const { error: dbError } = await supabase
          .from('generated_certificates')
          .insert({
            training_id: training.id,
            employee_id: attendee.userId,
            employee_name: attendee.name,
            certificate_url: publicUrl,
            certificate_path: filePath,
            sent_by: user?.id,
            sent_at: new Date().toISOString()
          });

        if (dbError) throw dbError;

        results.successful.push({
          name: attendee.name,
          certificateUrl: publicUrl
        });

        console.log(`✅ Certificate completed for ${attendee.name}`);

      } catch (error) {
        console.error(`❌ Failed for ${attendee.name}:`, error);
        results.failed.push({
          name: attendee.name,
          error: error.message
        });
      }
    }

    return {
      success: true,
      results: results,
      message: `Generated ${results.successful.length} of ${results.totalProcessed} certificates. ${results.failed.length} failed.`
    };

  } catch (error) {
    console.error('Certificate generation error:', error);
    return {
      success: false,
      error: error.message,
      results: { successful: [], failed: [], totalProcessed: 0 }
    };
  }
}

async function createCertificatePDF(data) {
  const { jsPDF } = window.jspdf;
  
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = 297;
  const pageHeight = 210;

  doc.setFillColor(243, 243, 243);
  doc.rect(0, 0, pageWidth, pageHeight, 'F');

  doc.setFillColor(192, 0, 0);
  doc.rect(0, 0, pageWidth, 22, 'F');

  doc.setFillColor(192, 0, 0);
  doc.rect(0, pageHeight - 6, pageWidth, 0.5, 'F');

  if (data.logoBase64 && data.logoBase64.data) {
    try {
      const format = getImageFormat(data.logoBase64.type);
      doc.addImage(data.logoBase64.data, format, 15, 8, 20, 20);
    } catch (err) {
      console.warn('Logo not added:', err.message);
    }
  }

  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('ROADWISE LOGISTICS CORPORATION', pageWidth / 2, 40, { align: 'center' });

  doc.setFontSize(32);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(192, 0, 0);
  doc.text(data.certificateTitle.toUpperCase(), pageWidth / 2, 55, { align: 'center' });

  doc.setFontSize(14);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(0, 0, 0);
  doc.text('Presented to', pageWidth / 2, 70, { align: 'center' });

  doc.setFontSize(28);
  doc.setFont('helvetica', 'bold');
  doc.text(data.employeeName, pageWidth / 2, 82, { align: 'center' });
  
  doc.setLineWidth(0.5);
  doc.setDrawColor(0, 0, 0);
  const nameWidth = doc.getTextWidth(data.employeeName);
  doc.line((pageWidth - nameWidth) / 2, 84, (pageWidth + nameWidth) / 2, 84);

  doc.setFontSize(14);
  doc.setFont('helvetica', 'normal');
  doc.text('For The Completion Of', pageWidth / 2, 95, { align: 'center' });

  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text(data.trainingTitle.toUpperCase(), pageWidth / 2, 105, { align: 'center' });

  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(`At ${data.venue}`, pageWidth / 2, 115, { align: 'center' });
  doc.setFont('helvetica', 'bold');
  doc.text(data.completionDate, pageWidth / 2, 122, { align: 'center' });

  const sigWidth = 50;
  const sigHeight = 12;
  const sigY1 = 145;
  const sigY2 = 170;
  const leftX = 55;
  const rightX = 192;

  const addSignature = (x, y, sigData, title) => {
    if (sigData.image && sigData.image.data) {
      try {
        const format = getImageFormat(sigData.image.type);
        doc.addImage(sigData.image.data, format, x, y, sigWidth, sigHeight);
      } catch (err) {
        console.warn(`Signature for ${title} not added:`, err.message);
      }
    }
    
    doc.setLineWidth(0.3);
    doc.line(x, y + sigHeight + 2, x + sigWidth, y + sigHeight + 2);
    
    if (sigData.name) {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text(sigData.name, x + sigWidth / 2, y + sigHeight + 7, { align: 'center' });
    }
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'italic');
    doc.text(title, x + sigWidth / 2, y + sigHeight + 11, { align: 'center' });
  };

  addSignature(leftX, sigY1, data.signatures.operationsManager, 'Operations Manager');
  addSignature(rightX, sigY1, data.signatures.safetyOfficer, 'Safety Officer');
  addSignature(leftX, sigY2, data.signatures.hrManager, 'HR Manager');
  addSignature(rightX, sigY2, data.signatures.generalManager, 'General Manager');

  const pdfBlob = doc.output('blob');
  return pdfBlob;
}

function getImageFormat(contentType) {
  if (!contentType) return 'PNG';
  
  if (contentType.includes('jpeg') || contentType.includes('jpg')) return 'JPEG';
  if (contentType.includes('png')) return 'PNG';
  if (contentType.includes('gif')) return 'GIF';
  if (contentType.includes('webp')) return 'WEBP';
  
  return 'PNG';
}

async function loadImageAsBase64(url) {
  if (!url) return null;
  
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    
    const blob = await response.blob();
    
    let contentType = blob.type || 'image/png';
    
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result;
        if (base64 && base64.startsWith('data:image')) {
          resolve({ data: base64, type: contentType });
        } else {
          resolve(null);
        }
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.warn('Failed to load image:', url, error);
    return null;
  }
}

export async function checkTrainingCertificates(trainingId) {
  try {
    const { data, error } = await supabase
      .from('generated_certificates')
      .select('employee_name, sent_at')
      .eq('training_id', trainingId);
    
    if (error) throw error;
    
    return {
      success: true,
      hasGenerated: data && data.length > 0,
      count: data ? data.length : 0,
      certificates: data
    };
  } catch (error) {
    console.error('Error checking certificates:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

export function downloadCertificate(certificateUrl, fileName) {
  const link = document.createElement('a');
  link.href = certificateUrl;
  link.download = fileName || 'certificate.pdf';
  link.target = '_blank';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
