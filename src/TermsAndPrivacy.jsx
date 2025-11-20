import { Link } from 'react-router-dom';

function TermsAndPrivacy() {
  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-md p-8">
          <div className="mb-6">
            <Link to="/applicant/register" className="text-red-600 hover:underline mb-4 inline-block">
              ← Back to Registration
            </Link>
          </div>
          
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Terms and Privacy</h1>
          <p className="text-gray-600 mb-8">Last Updated: 20/11/2025</p>

          <div className="prose max-w-none space-y-6 text-gray-700">
            <p>
              Welcome to Each R HRIS, operated by Roadwise. By registering or using this system, you agree to the following:
            </p>

            <section>
              <h2 className="text-xl font-semibold text-gray-800 mb-3">1. Purpose</h2>
              <p>
                Each R HRIS collects and manages applicant information for recruitment and employment purposes.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-800 mb-3">2. Information Collected</h2>
              <p>We may collect:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Name, email, contact number, and home address</li>
                <li>Government-issued IDs (TIN, SSS, PhilHealth, Pag-IBIG)</li>
                <li>License numbers or certificates</li>
                <li>Submitted application documents</li>
              </ul>
              <p className="mt-3">
                This information is collected only for recruitment and employment purposes.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-800 mb-3">3. Legal Basis & Consent</h2>
              <ul className="list-disc pl-6 space-y-1">
                <li>Data is collected with your consent.</li>
                <li>We process your data only for legitimate business purposes, following the Data Privacy Act of 2012 (RA 10173).</li>
                <li>By proceeding to create an account, you consent to the collection and processing of your personal data.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-800 mb-3">4. Data Security & Access</h2>
              <ul className="list-disc pl-6 space-y-1">
                <li>Only authorized HR personnel and system admins can access your data.</li>
                <li>Data is stored securely with encryption and access controls.</li>
                <li>Third parties (e.g., cloud providers, payroll services) may access data only for operational purposes and under strict agreements.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-800 mb-3">5. Applicant Rights</h2>
              <p>You have the right to:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Access your data</li>
                <li>Correct inaccurate information</li>
                <li>Request deletion or withdrawal of consent</li>
                <li>File complaints with the National Privacy Commission (NPC)</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-800 mb-3">6. Applicant Responsibilities</h2>
              <p>You agree to:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Provide accurate and complete information</li>
                <li>Use the system only as intended</li>
                <li>Avoid unauthorized access or tampering</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-800 mb-3">7. Liability</h2>
              <p>Roadwise is not responsible for:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Incorrect data provided by applicants</li>
                <li>System errors or downtime</li>
                <li>Unauthorized access beyond reasonable security measures</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-800 mb-3">8. Changes</h2>
              <p>
                These Terms & Privacy policies may be updated. Continued use signifies acceptance of changes.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-800 mb-3">9. Contact</h2>
              <p className="font-semibold">Data Privacy Officer</p>
              <p>Email: dpo@roadwise.com</p>
              <p>Address: Pasig City, Philippines</p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TermsAndPrivacy;

