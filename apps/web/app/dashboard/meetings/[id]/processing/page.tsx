'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { meetingsApi } from '@/lib/api';

export default function ProcessingPage() {
  const router = useRouter();
  const params = useParams();
  const meetingId = params.id as string;

  const [status, setStatus] = useState('processing');
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const response = await meetingsApi.get(meetingId);
        const meeting = response.data;

        if (meeting.status === 'completed') {
          router.push(`/dashboard/meetings/${meetingId}`);
        } else if (meeting.status === 'failed') {
          setStatus('failed');
          clearInterval(interval);
        } else {
          setProgress((prev) => Math.min(prev + 5, 90));
        }
      } catch (error) {
        console.error('Failed to check status:', error);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [meetingId, router]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md w-full mx-4">
        <div className="bg-white rounded-xl shadow-sm border p-8 text-center">
          {status === 'processing' ? (
            <>
              <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
              </div>

              <h1 className="text-2xl font-bold mb-2">Processing Your Meeting</h1>
              <p className="text-gray-600 mb-6">
                We're transcribing, analyzing, and creating your notes. This usually
                takes 1-2 minutes.
              </p>

              <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
                <div
                  className="bg-blue-600 h-3 rounded-full transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>

              <div className="space-y-3 text-left">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-sm text-gray-700">Audio uploaded</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                    <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  </div>
                  <span className="text-sm text-gray-700">
                    Transcribing and identifying speakers...
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 bg-gray-300 rounded-full" />
                  <span className="text-sm text-gray-500">
                    Generating notes and action items
                  </span>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-10 h-10 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>

              <h1 className="text-2xl font-bold mb-2">Processing Failed</h1>
              <p className="text-gray-600 mb-6">
                We couldn't finish processing your meeting. Your recording is safe.
              </p>

              <button
                onClick={() => router.push(`/dashboard/meetings/${meetingId}`)}
                className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition"
              >
                View Meeting
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
