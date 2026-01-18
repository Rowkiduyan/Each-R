import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from './supabaseClient';

function Privacy() {
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

          <h1 className="text-3xl font-bold text-gray-800 mb-2">Privacy Policy</h1>
          <p className="text-gray-600 mb-8">Last Updated: 20/11/2025</p>

          <div className="prose max-w-none space-y-6 text-gray-700">
            <p>
              This Privacy Policy explains how Each-R HRIS collects, uses, and protects your personal information.
              The policy is intended to align with the Data Privacy Act of 2012 (RA 10173).
            </p>

            <section>
              <h2 className="text-xl font-semibold text-gray-800 mb-3">1. Information Collected</h2>
              <p>We may collect:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Name, email, contact number, and home address</li>
                <li>Government-issued IDs (TIN, SSS, PhilHealth, Pag-IBIG)</li>
                <li>Licenses, certificates, and uploaded documents</li>
                <li>Recruitment and employment process data</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-800 mb-3">2. Legal Basis & Consent</h2>
              <ul className="list-disc pl-6 space-y-1">
                <li>Data is collected with your consent and for legitimate business purposes.</li>
                <li>By using the system, you consent to the collection and processing of your personal data.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-800 mb-3">3. Data Security & Access</h2>
              <ul className="list-disc pl-6 space-y-1">
                <li>Only authorized HR personnel and system admins can access your data.</li>
                <li>Data is stored securely using encryption and access controls.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-800 mb-3">4. Your Rights</h2>
              <p>You have the right to:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Access your data</li>
                <li>Correct inaccurate information</li>
                <li>Request deletion or withdrawal of consent (subject to legal/contractual limits)</li>
                <li>File complaints with the National Privacy Commission (NPC)</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-800 mb-3">5. Contact</h2>
              <p className="font-semibold">Data Privacy Officer (Placeholder)</p>
              <p>Email: dpo@roadwise.example</p>
              <p>Address: Pasig City, Philippines</p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Privacy;
