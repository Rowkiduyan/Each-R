import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from './supabaseClient';

function TermsAndConditions() {
  const navigate = useNavigate();
  const [fallbackPath, setFallbackPath] = useState('/applicantg/home');

  useEffect(() => {
    const loadFallback = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user?.id) return;

        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .maybeSingle();

        const role = String(profile?.role || '').toLowerCase();

        if (role === 'admin') setFallbackPath('/admin/home');
        else if (role === 'hr' || role === 'hrc') setFallbackPath('/hr/home');
        else if (role === 'employee') setFallbackPath('/employee');
        else if (role === 'agency') setFallbackPath('/agency/home');
        else if (role === 'applicant') setFallbackPath('/applicantl/home');
      } catch {
        // Keep default fallback
      }
    };

    loadFallback();
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-md p-8">
          <div className="mb-6">
            <button
              type="button"
              onClick={() => {
                if (window.history.length > 1) {
                  navigate(-1);
                  return;
                }
                navigate(fallbackPath, { replace: true });
              }}
              className="text-red-600 hover:underline mb-4 inline-block"
            >
              ← Back
            </button>
          </div>

          <h1 className="text-3xl font-bold text-gray-800 mb-2">Terms & Conditions</h1>
          <p className="text-gray-600 mb-8">Last Updated: 20/11/2025</p>

          <div className="prose max-w-none space-y-6 text-gray-700">
            <p>
              Welcome to Each-R HRIS, operated by Roadwise Logistics Corporation. By registering or using this system,
              you agree to these Terms & Conditions.
            </p>

            <section>
              <h2 className="text-xl font-semibold text-gray-800 mb-3">1. Purpose</h2>
              <p>
                Each-R HRIS is used to collect and manage applicant and employee-related information for recruitment,
                onboarding, HR administration, and related employment processes.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-800 mb-3">2. Acceptable Use</h2>
              <ul className="list-disc pl-6 space-y-1">
                <li>Provide accurate and complete information.</li>
                <li>Use the system only for its intended purposes.</li>
                <li>Avoid unauthorized access, tampering, or misuse of the platform.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-800 mb-3">3. Account & Access</h2>
              <p>
                You are responsible for maintaining the confidentiality of your login credentials. If you believe your
                account has been compromised, please contact Roadwise support.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-800 mb-3">4. Liability</h2>
              <p>Roadwise is not responsible for:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Incorrect data provided by users.</li>
                <li>Temporary downtime or system errors.</li>
                <li>Unauthorized access beyond reasonable security measures.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-800 mb-3">5. Changes</h2>
              <p>
                These Terms & Conditions may be updated. Continued use of Each-R signifies acceptance of the updated terms.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TermsAndConditions;
