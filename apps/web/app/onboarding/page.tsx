'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authApi, type Profile } from '@/lib/api';

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [useCase, setUseCase] = useState('');
  const [customUseCase, setCustomUseCase] = useState('');
  const [fullName, setFullName] = useState('');
  const [country, setCountry] = useState('');
  const [timezone, setTimezone] = useState('');
  const [preferredLanguage, setPreferredLanguage] = useState('en');

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      router.push('/login');
      return;
    }

    // Check if user has already completed onboarding
    const checkOnboarding = async () => {
      try {
        const response = await authApi.getProfile();
        if (response.data.profile.full_name) {
          // User has already completed onboarding
          router.push('/permissions');
        }
      } catch (error) {
        console.error('Failed to check onboarding status:', error);
      }
    };

    checkOnboarding();
  }, [router]);

  const handleUseCaseSubmit = () => {
    if (useCase === 'other' && !customUseCase) {
      return;
    }
    setStep(2);
  };

  const handleSubmit = async () => {
    setLoading(true);

    try {
      const finalUseCase = useCase === 'other' ? customUseCase : useCase;
      
      const apiData: any = {};
      if (fullName) apiData.full_name = fullName;
      if (country) apiData.country = country;
      if (timezone) apiData.timezone = timezone;
      if (preferredLanguage) apiData.preferred_language = preferredLanguage;
      if (finalUseCase) apiData.use_case = finalUseCase;

      await authApi.updateProfile(apiData);

      router.push('/permissions');
    } catch (error) {
      console.error('Failed to complete onboarding:', error);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome to Meeting AI
          </h1>
          <p className="text-gray-600">
            {step === 1 ? 'Let's get you set up' : 'Almost there!'}
          </p>
        </div>

        {step === 1 ? (
          <div className="bg-white border rounded-lg p-6 space-y-6">
            <div>
              <h2 className="text-xl font-semibold mb-4">What will you use this for?</h2>
              <div className="space-y-3">
                {[
                  { value: 'business', label: 'Business meetings' },
                  { value: 'classes', label: 'Classes' },
                  { value: 'interviews', label: 'Interviews' },
                  { value: 'client', label: 'Client meetings' },
                  { value: 'church', label: 'Church meetings' },
                  { value: 'team', label: 'Team meetings' },
                  { value: 'personal', label: 'Personal notes' },
                  { value: 'research', label: 'Research' },
                  { value: 'other', label: 'Other' },
                ].map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setUseCase(option.value)}
                    className={`w-full text-left p-4 rounded-lg border-2 transition ${
                      useCase === option.value
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>

              {useCase === 'other' && (
                <input
                  type="text"
                  value={customUseCase}
                  onChange={(e) => setCustomUseCase(e.target.value)}
                  placeholder="Please specify..."
                  className="w-full mt-4 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              )}
            </div>

            <button
              onClick={handleUseCaseSubmit}
              disabled={!useCase || (useCase === 'other' && !customUseCase)}
              className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
            >
              Continue
            </button>
          </div>
        ) : (
          <div className="bg-white border rounded-lg p-6 space-y-6">
            <div>
              <h2 className="text-xl font-semibold mb-4">Tell us about yourself</h2>
              
              <div className="space-y-4">
                <div>
                  <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-2">
                    Full Name
                  </label>
                  <input
                    id="fullName"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="John Doe"
                  />
                </div>

                <div>
                  <label htmlFor="country" className="block text-sm font-medium text-gray-700 mb-2">
                    Country
                  </label>
                  <input
                    id="country"
                    type="text"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Uganda"
                  />
                </div>

                <div>
                  <label htmlFor="timezone" className="block text-sm font-medium text-gray-700 mb-2">
                    Timezone
                  </label>
                  <input
                    id="timezone"
                    type="text"
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Africa/Kampala"
                  />
                </div>

                <div>
                  <label htmlFor="preferredLanguage" className="block text-sm font-medium text-gray-700 mb-2">
                    Preferred Language
                  </label>
                  <select
                    id="preferredLanguage"
                    value={preferredLanguage}
                    onChange={(e) => setPreferredLanguage(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="en">English</option>
                    <option value="sw">Swahili</option>
                    <option value="lg">Luganda</option>
                    <option value="fr">French</option>
                    <option value="es">Spanish</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => setStep(1)}
                className="flex-1 border border-gray-300 text-gray-700 py-3 rounded-lg hover:bg-gray-50 font-semibold"
              >
                Back
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading || !fullName}
                className="flex-1 bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
              >
                {loading ? 'Setting up...' : 'Complete Setup'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}