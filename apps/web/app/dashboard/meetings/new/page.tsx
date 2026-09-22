'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { meetingsApi } from '@/lib/api';

export default function NewMeetingPage() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [meetingType, setMeetingType] = useState('business');
  const [outputLanguage, setOutputLanguage] = useState('en');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!title.trim()) {
      setError('Meeting title is required');
      setLoading(false);
      return;
    }

    try {
      const response = await meetingsApi.create(title, meetingType);
      router.push(`/dashboard/meetings/${response.data.id}/record`);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create meeting');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <button
              onClick={() => router.back()}
              className="text-gray-700 hover:text-gray-900"
            >
              Back
            </button>
            <h1 className="text-xl font-semibold">New Meeting</h1>
            <div className="w-16" />
          </div>
        </div>
      </nav>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white border rounded-lg p-6 space-y-6">
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
              Meeting Title
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Project Planning Meeting"
              required
            />
          </div>

          <div>
            <label htmlFor="meetingType" className="block text-sm font-medium text-gray-700 mb-2">
              Meeting Type
            </label>
            <select
              id="meetingType"
              value={meetingType}
              onChange={(e) => setMeetingType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="business">Business Meeting</option>
              <option value="interview">Interview</option>
              <option value="class">Class</option>
              <option value="client">Client Meeting</option>
              <option value="church">Church Meeting</option>
              <option value="team">Team Meeting</option>
              <option value="personal">Personal Notes</option>
              <option value="research">Research</option>
            </select>
          </div>

          <div>
            <label htmlFor="outputLanguage" className="block text-sm font-medium text-gray-700 mb-2">
              Notes Language
            </label>
            <select
              id="outputLanguage"
              value={outputLanguage}
              onChange={(e) => setOutputLanguage(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="en">English</option>
              <option value="sw">Swahili</option>
              <option value="lg">Luganda</option>
              <option value="fr">French</option>
              <option value="es">Spanish</option>
            </select>
          </div>

          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => router.back()}
              className="flex-1 border border-gray-300 text-gray-700 py-3 rounded-lg hover:bg-gray-50 font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
            >
              {loading ? 'Creating...' : 'Start Recording'}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}