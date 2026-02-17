import { useState, useEffect } from 'react';
import AboutPic1 from './layouts/photos/pic1.png';
import AboutPic2 from './layouts/photos/pic2.png';
import AboutPic3 from './layouts/photos/pic3.png';
import AboutPic4 from './layouts/photos/pic4.jpg';
import AboutPic5 from './layouts/photos/pic5.png';

function About() {
  const [currentSlide, setCurrentSlide] = useState(0);
  
  const slides = [
    { image: AboutPic1, alt: 'Roadwise overview' },
    { image: AboutPic2, alt: 'Roadwise team' },
    { image: AboutPic3, alt: 'Roadwise operations' },
    { image: AboutPic4, alt: 'Each-R services' },
    { image: AboutPic5, alt: 'Healthcare professionals' }
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [slides.length]);

  const goToSlide = (index) => {
    setCurrentSlide(index);
  };

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
  };

  return (
    <div className="w-full bg-white">
      {/* Hero Section */}
      <section className="w-full relative overflow-hidden">
        <div className="absolute inset-0">
          <img
            src={AboutPic3}
            alt="Roadwise operations"
            className="w-full h-full object-cover"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-red-950/90 via-red-900/85 to-red-950/90"></div>
        </div>
        <div className="relative px-8 py-20 lg:px-16">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
            <div className="flex-1">
              <div className="inline-block px-4 py-1.5 bg-white/90 backdrop-blur-sm rounded-full mb-5">
                <p className="text-sm font-semibold text-red-900">About Us</p>
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-4 leading-tight">
                Roadwise & Each-R
              </h1>
              <p className="text-lg text-white/95 max-w-2xl leading-relaxed">
                Leading logistics solutions in the Philippines, powered by innovative HR management technology.
              </p>
            </div>
            <div className="flex gap-4">
              <div className="bg-white/95 backdrop-blur-md rounded-xl shadow-lg border border-gray-200 p-6 text-center min-w-[130px]">
                <div className="text-4xl font-bold text-red-900">16+</div>
                <div className="text-sm text-gray-600 mt-1">Years</div>
              </div>
              <div className="bg-white/95 backdrop-blur-md rounded-xl shadow-lg border border-gray-200 p-6 text-center min-w-[130px]">
                <div className="text-4xl font-bold text-red-900">31</div>
                <div className="text-sm text-gray-600 mt-1">Depots</div>
              </div>
              <div className="bg-white/95 backdrop-blur-md rounded-xl shadow-lg border border-gray-200 p-6 text-center min-w-[130px]">
                <div className="text-4xl font-bold text-red-900">1,513</div>
                <div className="text-sm text-gray-600 mt-1">Employees</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Section */}
      <section className="w-full">
        <div className="px-8 py-16 lg:px-16">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-12">
            <div>
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">Our Story</h2>
              <p className="text-gray-600 mt-2">A quick overview of the company and the HR system</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
            <div className="space-y-6">
              <p className="text-gray-700 leading-relaxed">
                Roadwise Logistics Corporation has over 16 years of experience and has established itself in the logistics industry in the Philippines. Operating a fleet of reefer and dry vans, the company serves various clients and manages operations across 31 locations/depotsnationwide.
              </p>
              <p className="text-gray-700 leading-relaxed">
                With an estimated 1,513 employees, HR plays a critical role in keeping operations smooth—handling employee records and compliance, and overseeing the employee journey from recruitment, onboarding, performance evaluation, resignations, and offboarding.
              </p>
              <p className="text-gray-700 leading-relaxed">
                Each-R supports Roadwise’s mission to deliver safe, efficient, and satisfying services by improving how employee data and HR processes are managed—automating manual tasks, improving accuracy, and enhancing efficiency.
              </p>
              <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                  <div className="text-xs text-gray-500">Experience</div>
                  <div className="mt-1 text-2xl font-bold text-red-950">16 years</div>
                  <div className="mt-1 text-sm text-gray-600">Logistics operations in PH</div>
                </div>
                <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                  <div className="text-xs text-gray-500">Coverage</div>
                  <div className="mt-1 text-2xl font-bold text-red-950">31 depots</div>
                  <div className="mt-1 text-sm text-gray-600">Nationwide locations</div>
                </div>
                <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                  <div className="text-xs text-gray-500">Workforce</div>
                  <div className="mt-1 text-2xl font-bold text-red-950">1,513</div>
                  <div className="mt-1 text-sm text-gray-600">PEstimated employees</div>
                </div>
              </div>
            </div>

            {/* Slideshow */}
            <div className="relative">
              <div className="rounded-2xl overflow-hidden shadow-lg border border-gray-200 bg-white">
                <div className="relative h-96">
                  {slides.map((slide, index) => (
                    <div
                      key={index}
                      className={`absolute inset-0 transition-opacity duration-500 ${
                        index === currentSlide ? 'opacity-100' : 'opacity-0'
                      }`}
                    >
                      <img
                        src={slide.image}
                        alt={slide.alt}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    </div>
                  ))}
                  
                  {/* Navigation Arrows */}
                  <button
                    onClick={prevSlide}
                    className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-gray-800 rounded-full p-2 shadow-lg transition-all duration-200 hover:scale-110"
                    aria-label="Previous slide"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <button
                    onClick={nextSlide}
                    className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-gray-800 rounded-full p-2 shadow-lg transition-all duration-200 hover:scale-110"
                    aria-label="Next slide"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>

                  {/* Dots Navigation */}
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                    {slides.map((_, index) => (
                      <button
                        key={index}
                        onClick={() => goToSlide(index)}
                        className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                          index === currentSlide
                            ? 'bg-white w-8'
                            : 'bg-white/60 hover:bg-white/80'
                        }`}
                        aria-label={`Go to slide ${index + 1}`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-20">
            <div className="text-center mb-12">
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">What Each-R Helps HR Do</h2>
              <p className="mt-3 text-lg text-gray-600">Core workflows supported by the system</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                {
                  title: 'Recruitment',
                  desc: 'Post jobs, manage applicants, and schedule interviews.',
                  icon: <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z"/></svg>
                },
                {
                  title: 'Onboarding',
                  desc: 'Track requirements and ensure faster compliance.',
                  icon: <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd"/></svg>
                },
                {
                  title: 'Performance',
                  desc: 'Support evaluation workflows and records.',
                  icon: <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z"/></svg>
                },
                {
                  title: 'Separation',
                  desc: 'Handle resignations and offboarding with better visibility.',
                  icon: <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd"/></svg>
                },
              ].map((card) => (
                <div key={card.title} className="rounded-2xl border border-gray-200 bg-white p-7 shadow-md hover:shadow-lg transition-shadow duration-300 group">
                  <div className="w-14 h-14 rounded-xl bg-red-900 flex items-center justify-center mb-5 text-white group-hover:scale-105 transition-transform duration-300">
                    {card.icon}
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{card.title}</h3>
                  <p className="text-sm text-gray-600 leading-relaxed">{card.desc}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-20 rounded-2xl overflow-hidden border border-gray-200 shadow-xl">
            <div className="bg-red-950 text-white p-10 sm:p-14">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center">
                  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
                  </svg>
                </div>
                <h2 className="text-3xl font-bold">Get in Touch</h2>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-5">
                  <div className="flex items-start gap-4 bg-white/10 rounded-xl p-5">
                    <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5S10.62 6.5 12 6.5s2.5 1.12 2.5 2.5S13.38 11.5 12 11.5z" />
                      </svg>
                    </div>
                    <div>
                      <div className="font-semibold text-lg mb-1">Address</div>
                      <div className="text-white/90">1 Luis, Pasig, Metro Manila</div>
                    </div>
                  </div>

                  <div className="flex items-start gap-4 bg-white/10 rounded-xl p-5">
                    <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                        <path d="M6.62 10.79a15.053 15.053 0 006.59 6.59l2.2-2.2a1 1 0 01.95-.27c1.04.35 2.16.54 3.34.54a1 1 0 011 1V20a1 1 0 01-1 1C10.07 21 3 13.93 3 5a1 1 0 011-1h3.5a1 1 0 011 1c0 1.18.19 2.3.54 3.34a1 1 0 01-.27.95l-2.15 2.5z" />
                      </svg>
                    </div>
                    <div>
                      <div className="font-semibold text-lg mb-1">Phone</div>
                      <div className="text-white/90">(02) 7000 0000</div>
                    </div>
                  </div>
                </div>

                <div className="space-y-5">
                  <div className="flex items-start gap-4 bg-white/10 rounded-xl p-5">
                    <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                        <path d="M21 8V7l-3 2-2-1-6 4-4-2-3 2v10h18V8zM3 5h18v2l-3 2-2-1-6 4-4-2-3 2V5z" />
                      </svg>
                    </div>
                    <div>
                      <div className="font-semibold text-lg mb-1">Fax</div>
                      <div className="text-white/90">(02) 7000 0001</div>
                    </div>
                  </div>

                  <div className="flex items-start gap-4 bg-white/10 rounded-xl p-5">
                    <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                        <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />
                      </svg>
                    </div>
                    <div>
                      <div className="font-semibold text-lg mb-1">Email</div>
                      <div className="text-white/90">info@roadwise.example</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-8 bg-white/10 rounded-xl p-6">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                      <path d="M12 1a11 11 0 1011 11A11 11 0 0012 1zm1 11H7V10h4V5h2z" />
                    </svg>
                  </div>
                  <div>
                    <div className="font-semibold text-lg mb-2">Service Hours</div>
                    <div className="text-white/90 space-y-1">
                      <div>Monday to Friday: 8:30AM – 5:30PM</div>
                      <div>Saturday: 8:30AM – 12:30PM</div>
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
