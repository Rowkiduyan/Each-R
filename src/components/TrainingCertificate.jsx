import React, { useRef } from 'react';

const TrainingCertificate = ({ employeeName, trainingTitle, completionDate, onClose, onPrint }) => {
  const certificateRef = useRef(null);

  const formatDate = (dateStr) => {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateStr).toLocaleDateString('en-US', options);
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    const certificateHTML = certificateRef.current.innerHTML;
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Training Certificate - ${employeeName}</title>
          <style>
            @media print {
              @page {
                size: landscape;
                margin: 0;
              }
              body {
                margin: 0;
                padding: 0;
              }
            }
            body {
              margin: 0;
              padding: 20px;
              font-family: 'Georgia', 'Times New Roman', serif;
              display: flex;
              justify-content: center;
              align-items: center;
              min-height: 100vh;
              background: white;
            }
            .certificate-container {
              width: 1056px;
              height: 816px;
              padding: 60px 80px;
              background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
              border: 20px solid #800000;
              box-shadow: 0 0 0 3px #d4af37, inset 0 0 0 3px #d4af37;
              position: relative;
              box-sizing: border-box;
            }
            .certificate-container::before {
              content: '';
              position: absolute;
              top: 50px;
              left: 50px;
              right: 50px;
              bottom: 50px;
              border: 2px solid #d4af37;
              pointer-events: none;
            }
            .certificate-header {
              text-align: center;
              margin-bottom: 40px;
            }
            .certificate-logo {
              width: 100px;
              height: 100px;
              margin: 0 auto 20px;
              background: linear-gradient(135deg, #800000 0%, #a00000 100%);
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              box-shadow: 0 4px 15px rgba(128, 0, 0, 0.3);
            }
            .logo-text {
              color: white;
              font-size: 36px;
              font-weight: bold;
              font-family: 'Arial', sans-serif;
            }
            .certificate-title {
              font-size: 56px;
              font-weight: bold;
              color: #800000;
              margin: 0;
              text-transform: uppercase;
              letter-spacing: 4px;
              text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.1);
            }
            .certificate-subtitle {
              font-size: 20px;
              color: #666;
              margin: 10px 0 0;
              font-style: italic;
            }
            .certificate-body {
              text-align: center;
              margin: 60px 0;
            }
            .certificate-text {
              font-size: 22px;
              color: #333;
              line-height: 1.8;
              margin: 20px 0;
            }
            .employee-name {
              font-size: 48px;
              font-weight: bold;
              color: #800000;
              margin: 30px 0;
              padding: 20px;
              border-bottom: 3px solid #d4af37;
              display: inline-block;
              text-transform: capitalize;
            }
            .training-title {
              font-size: 32px;
              font-weight: bold;
              color: #333;
              margin: 30px 0;
              font-style: italic;
            }
            .completion-date {
              font-size: 20px;
              color: #666;
              margin-top: 40px;
            }
            .certificate-footer {
              margin-top: 80px;
              display: flex;
              justify-content: space-around;
              align-items: flex-end;
            }
            .signature-block {
              text-align: center;
              flex: 1;
            }
            .signature-line {
              width: 250px;
              border-top: 2px solid #333;
              margin: 0 auto 10px;
              padding-top: 5px;
            }
            .signature-label {
              font-size: 16px;
              color: #666;
              font-weight: 600;
            }
            .seal {
              width: 120px;
              height: 120px;
              border-radius: 50%;
              border: 4px solid #800000;
              display: flex;
              align-items: center;
              justify-content: center;
              background: radial-gradient(circle, #ffe6e6 0%, #ffcccc 100%);
              position: relative;
              box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
            }
            .seal-text {
              font-size: 14px;
              font-weight: bold;
              color: #800000;
              text-align: center;
              line-height: 1.2;
            }
            .decorative-element {
              position: absolute;
              color: #d4af37;
              opacity: 0.3;
              font-size: 60px;
            }
            .decorative-element.top-left {
              top: 30px;
              left: 30px;
            }
            .decorative-element.top-right {
              top: 30px;
              right: 30px;
            }
            .decorative-element.bottom-left {
              bottom: 30px;
              left: 30px;
            }
            .decorative-element.bottom-right {
              bottom: 30px;
              right: 30px;
            }
          </style>
        </head>
        <body>
          ${certificateHTML}
          <script>
            window.onload = function() {
              window.print();
              window.onafterprint = function() {
                window.close();
              };
            };
          </script>
        </body>
      </html>
    `);
    
    printWindow.document.close();
    
    if (onPrint) {
      onPrint();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center px-4 z-50" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white flex items-center justify-between sticky top-0 z-10">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Training Certificate</h2>
            <p className="text-sm text-gray-500 mt-1">Preview and print certificate</p>
          </div>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full p-2 transition-all"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Certificate Preview */}
        <div className="p-8 bg-gray-100">
          <div ref={certificateRef} className="certificate-container bg-white mx-auto" style={{ width: '1056px', height: '816px', padding: '60px 80px', position: 'relative', border: '20px solid #800000', boxShadow: '0 0 0 3px #d4af37, inset 0 0 0 3px #d4af37' }}>
            {/* Decorative Elements */}
            <div className="decorative-element top-left" style={{ position: 'absolute', top: '30px', left: '30px', color: '#d4af37', opacity: 0.3, fontSize: '60px' }}>❖</div>
            <div className="decorative-element top-right" style={{ position: 'absolute', top: '30px', right: '30px', color: '#d4af37', opacity: 0.3, fontSize: '60px' }}>❖</div>
            <div className="decorative-element bottom-left" style={{ position: 'absolute', bottom: '30px', left: '30px', color: '#d4af37', opacity: 0.3, fontSize: '60px' }}>❖</div>
            <div className="decorative-element bottom-right" style={{ position: 'absolute', bottom: '30px', right: '30px', color: '#d4af37', opacity: 0.3, fontSize: '60px' }}>❖</div>

            {/* Inner Border */}
            <div style={{ position: 'absolute', top: '50px', left: '50px', right: '50px', bottom: '50px', border: '2px solid #d4af37', pointerEvents: 'none' }}></div>

            {/* Header */}
            <div className="certificate-header" style={{ textAlign: 'center', marginBottom: '40px' }}>
              <div className="certificate-logo" style={{ width: '100px', height: '100px', margin: '0 auto 20px', background: 'linear-gradient(135deg, #800000 0%, #a00000 100%)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 15px rgba(128, 0, 0, 0.3)' }}>
                <span className="logo-text" style={{ color: 'white', fontSize: '36px', fontWeight: 'bold', fontFamily: 'Arial, sans-serif' }}>HR</span>
              </div>
              <h1 className="certificate-title" style={{ fontSize: '56px', fontWeight: 'bold', color: '#800000', margin: 0, textTransform: 'uppercase', letterSpacing: '4px', textShadow: '2px 2px 4px rgba(0, 0, 0, 0.1)' }}>Certificate</h1>
              <p className="certificate-subtitle" style={{ fontSize: '20px', color: '#666', margin: '10px 0 0', fontStyle: 'italic' }}>of Achievement</p>
            </div>

            {/* Body */}
            <div className="certificate-body" style={{ textAlign: 'center', margin: '60px 0' }}>
              <p className="certificate-text" style={{ fontSize: '22px', color: '#333', lineHeight: '1.8', margin: '20px 0' }}>
                This is to certify that
              </p>
              
              <div className="employee-name" style={{ fontSize: '48px', fontWeight: 'bold', color: '#800000', margin: '30px 0', padding: '20px', borderBottom: '3px solid #d4af37', display: 'inline-block', textTransform: 'capitalize' }}>
                {employeeName}
              </div>

              <p className="certificate-text" style={{ fontSize: '22px', color: '#333', lineHeight: '1.8', margin: '20px 0' }}>
                has successfully completed the training program
              </p>

              <div className="training-title" style={{ fontSize: '32px', fontWeight: 'bold', color: '#333', margin: '30px 0', fontStyle: 'italic' }}>
                "{trainingTitle}"
              </div>

              <p className="completion-date" style={{ fontSize: '20px', color: '#666', marginTop: '40px' }}>
                Completed on <strong>{formatDate(completionDate)}</strong>
              </p>
            </div>

            {/* Footer */}
            <div className="certificate-footer" style={{ marginTop: '80px', display: 'flex', justifyContent: 'space-around', alignItems: 'flex-end' }}>
              <div className="signature-block" style={{ textAlign: 'center', flex: 1 }}>
                <div className="signature-line" style={{ width: '250px', borderTop: '2px solid #333', margin: '0 auto 10px', paddingTop: '5px' }}></div>
                <p className="signature-label" style={{ fontSize: '16px', color: '#666', fontWeight: 600 }}>HR Director</p>
              </div>
              
              <div className="seal" style={{ width: '120px', height: '120px', borderRadius: '50%', border: '4px solid #800000', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'radial-gradient(circle, #ffe6e6 0%, #ffcccc 100%)', position: 'relative', boxShadow: '0 2px 10px rgba(0, 0, 0, 0.2)' }}>
                <div className="seal-text" style={{ fontSize: '14px', fontWeight: 'bold', color: '#800000', textAlign: 'center', lineHeight: 1.2 }}>
                  OFFICIAL<br/>SEAL
                </div>
              </div>
              
              <div className="signature-block" style={{ textAlign: 'center', flex: 1 }}>
                <div className="signature-line" style={{ width: '250px', borderTop: '2px solid #333', margin: '0 auto 10px', paddingTop: '5px' }}></div>
                <p className="signature-label" style={{ fontSize: '16px', color: '#666', fontWeight: 600 }}>Training Coordinator</p>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-lg bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors font-medium text-sm"
          >
            Close
          </button>
          <button
            onClick={handlePrint}
            className="px-5 py-2.5 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors font-medium text-sm flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Print Certificate
          </button>
        </div>
      </div>
    </div>
  );
};

export default TrainingCertificate;
