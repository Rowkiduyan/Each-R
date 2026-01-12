/**
 * Certificate Generator Utility
 * Generates training certificates as PDF in a new tab
 */

export const generateCertificatePDF = (employeeName, trainingTitle, completionDate) => {
  const formatDate = (dateStr) => {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateStr).toLocaleDateString('en-US', options);
  };

  const certificateHTML = `
<!DOCTYPE html>
<html>
<head>
  <title>Training Certificate - ${employeeName}</title>
  <meta charset="UTF-8">
  <style>
    @page {
      size: landscape;
      margin: 0;
    }
    
    @media print {
      body {
        margin: 0;
        padding: 0;
      }
      .no-print {
        display: none !important;
      }
    }
    
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      margin: 0;
      padding: 20px;
      font-family: 'Georgia', 'Times New Roman', serif;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      background: #f5f5f5;
    }
    
    .print-controls {
      margin-bottom: 20px;
      text-align: center;
    }
    
    .print-button {
      background: #800000;
      color: white;
      border: none;
      padding: 12px 24px;
      font-size: 16px;
      font-weight: 600;
      border-radius: 8px;
      cursor: pointer;
      box-shadow: 0 2px 8px rgba(128, 0, 0, 0.3);
      transition: all 0.3s ease;
    }
    
    .print-button:hover {
      background: #a00000;
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(128, 0, 0, 0.4);
    }
    
    .certificate-container {
      width: 1056px;
      height: 816px;
      padding: 60px 80px;
      background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
      border: 20px solid #800000;
      box-shadow: 0 0 0 3px #d4af37, inset 0 0 0 3px #d4af37, 0 8px 32px rgba(0, 0, 0, 0.15);
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
      margin: 50px 0;
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
      margin-top: 60px;
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
      font-family: Arial, sans-serif;
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
  <div class="print-controls no-print">
    <button class="print-button" onclick="window.print()">
      🖨️ Print Certificate
    </button>
  </div>
  
  <div class="certificate-container">
    <!-- Decorative Elements -->
    <div class="decorative-element top-left">❖</div>
    <div class="decorative-element top-right">❖</div>
    <div class="decorative-element bottom-left">❖</div>
    <div class="decorative-element bottom-right">❖</div>

    <!-- Header -->
    <div class="certificate-header">
      <div class="certificate-logo">
        <span class="logo-text">HR</span>
      </div>
      <h1 class="certificate-title">Certificate</h1>
      <p class="certificate-subtitle">of Achievement</p>
    </div>

    <!-- Body -->
    <div class="certificate-body">
      <p class="certificate-text">
        This is to certify that
      </p>
      
      <div class="employee-name">
        ${employeeName}
      </div>

      <p class="certificate-text">
        has successfully completed the training program
      </p>

      <div class="training-title">
        "${trainingTitle}"
      </div>

      <p class="completion-date">
        Completed on <strong>${formatDate(completionDate)}</strong>
      </p>
    </div>

    <!-- Footer -->
    <div class="certificate-footer">
      <div class="signature-block">
        <div class="signature-line"></div>
        <p class="signature-label">HR Director</p>
      </div>
      
      <div class="seal">
        <div class="seal-text">
          OFFICIAL<br/>SEAL
        </div>
      </div>
      
      <div class="signature-block">
        <div class="signature-line"></div>
        <p class="signature-label">Training Coordinator</p>
      </div>
    </div>
  </div>
</body>
</html>
  `;

  // Open certificate in new tab
  const newWindow = window.open('', '_blank');
  if (newWindow) {
    newWindow.document.write(certificateHTML);
    newWindow.document.close();
    
    // Optionally trigger print dialog after a short delay
    // newWindow.onload = () => {
    //   setTimeout(() => {
    //     newWindow.print();
    //   }, 250);
    // };
  } else {
    alert('Please allow popups to view your certificate.');
  }
};
