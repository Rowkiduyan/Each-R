import AboutPic1 from './layouts/photos/pic1.png';
import AboutPic2 from './layouts/photos/pic2.png';
import AboutPic3 from './layouts/photos/pic3.png';

function About() {
  return (
    <div className="w-full bg-white">
      <section className="w-full border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-6 py-14">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-red-600">About</p>
              <h1 className="text-3xl sm:text-4xl font-bold text-gray-900">Roadwise & Each-R</h1>
            </div>
            <p className="text-sm text-gray-500">A quick overview of the company and the HR system.</p>
          </div>

          <div className="mt-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-7 space-y-4 text-gray-700 leading-relaxed">
              <p>
                Roadwise Logistics Corporation has over <span className="font-semibold text-gray-900">16 years</span> of experience
                and has established itself in the logistics industry in the Philippines. Operating a fleet of reefer and dry vans,
                the company serves various clients and manages operations across <span className="font-semibold text-gray-900">31 locations/depots</span>
                nationwide.
              </p>
              <p>
                With an estimated <span className="font-semibold text-gray-900">1,513 employees</span>, HR plays a critical role in keeping operations
                smooth—handling employee records and compliance, and overseeing the employee journey from recruitment, onboarding,
                performance evaluation, resignations, and offboarding.
              </p>
              <p>
                <span className="font-semibold text-gray-900">Each-R</span> supports Roadwise’s mission to deliver safe, efficient, and satisfying services
                by improving how employee data and HR processes are managed—automating manual tasks, improving accuracy, and enhancing efficiency.
              </p>

              <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                  <div className="text-xs text-gray-500">Experience</div>
                  <div className="mt-1 text-2xl font-bold text-gray-900">16+ years</div>
                  <div className="mt-1 text-sm text-gray-600">Logistics operations in PH</div>
                </div>
                <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                  <div className="text-xs text-gray-500">Coverage</div>
                  <div className="mt-1 text-2xl font-bold text-gray-900">31 depots</div>
                  <div className="mt-1 text-sm text-gray-600">Nationwide locations</div>
                </div>
                <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                  <div className="text-xs text-gray-500">Workforce</div>
                  <div className="mt-1 text-2xl font-bold text-gray-900">1,513</div>
                  <div className="mt-1 text-sm text-gray-600">Estimated employees</div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-5 space-y-4">
              <div className="rounded-2xl border border-gray-200 bg-gray-50 overflow-hidden">
                <div className="h-64">
                  <img
                    src={AboutPic1}
                    alt="Roadwise overview"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-2xl border border-gray-200 bg-gray-50 h-36 overflow-hidden">
                  <img
                    src={AboutPic2}
                    alt="Roadwise team"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                </div>
                <div className="rounded-2xl border border-gray-200 bg-gray-50 h-36 overflow-hidden">
                  <img
                    src={AboutPic3}
                    alt="Roadwise operations"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-12">
            <h2 className="text-xl font-semibold text-gray-900">What Each-R helps HR do</h2>
            <p className="mt-2 text-gray-600">Core workflows supported by the system.</p>

            <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                {
                  title: 'Recruitment',
                  desc: 'Post jobs, manage applicants, and schedule interviews.'
                },
                {
                  title: 'Onboarding',
                  desc: 'Track requirements and ensure faster compliance.'
                },
                {
                  title: 'Performance',
                  desc: 'Support evaluation workflows and records.'
                },
                {
                  title: 'Separation',
                  desc: 'Handle resignations and offboarding with better visibility.'
                },
              ].map((card) => (
                <div key={card.title} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
                      <span className="w-2.5 h-2.5 rounded-full bg-red-600" />
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900">{card.title}</div>
                      <div className="text-sm text-gray-600">{card.desc}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-12 rounded-2xl overflow-hidden border border-gray-200">
            <div className="bg-gradient-to-r from-[#800000] to-[#990000] text-white p-6 sm:p-8">
              <div className="flex items-center gap-2 text-sm font-semibold tracking-wide">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
                </svg>
                CONTACT US
              </div>

              <div className="mt-5">
                <div className="space-y-3 text-sm max-w-3xl">
                  <div className="flex items-start gap-2">
                    <svg className="w-4 h-4 mt-0.5 flex-none" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5S10.62 6.5 12 6.5s2.5 1.12 2.5 2.5S13.38 11.5 12 11.5z" />
                    </svg>
                    <span>1 Luis, Pasig, Metro Manila</span>
                  </div>

                  <div className="flex items-start gap-2">
                    <svg className="w-4 h-4 mt-0.5 flex-none" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                      <path d="M6.62 10.79a15.053 15.053 0 006.59 6.59l2.2-2.2a1 1 0 01.95-.27c1.04.35 2.16.54 3.34.54a1 1 0 011 1V20a1 1 0 01-1 1C10.07 21 3 13.93 3 5a1 1 0 011-1h3.5a1 1 0 011 1c0 1.18.19 2.3.54 3.34a1 1 0 01-.27.95l-2.15 2.5z" />
                    </svg>
                    <span>(02) 7000 0000</span>
                  </div>

                  <div className="flex items-start gap-2">
                    <svg className="w-4 h-4 mt-0.5 flex-none" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                      <path d="M21 8V7l-3 2-2-1-6 4-4-2-3 2v10h18V8zM3 5h18v2l-3 2-2-1-6 4-4-2-3 2V5z" />
                    </svg>
                    <span>(02) 7000 0001</span>
                  </div>

                  <div className="flex items-start gap-2">
                    <svg className="w-4 h-4 mt-0.5 flex-none" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                      <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />
                    </svg>
                    <span>info@roadwise.example</span>
                  </div>

                  <div className="flex items-start gap-2">
                    <svg className="w-4 h-4 mt-0.5 flex-none" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                      <path d="M12 1a11 11 0 1011 11A11 11 0 0012 1zm1 11H7V10h4V5h2z" />
                    </svg>
                    <div>
                      <div className="font-semibold">Service Hours</div>
                      <div className="text-white/90">Monday to Friday (8:30AM – 5:30PM); Saturday (8:30AM – 12:30PM)</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </section>
    </div>
  );
}

export default About;
