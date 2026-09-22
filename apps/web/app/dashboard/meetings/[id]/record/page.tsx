'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { meetingsApi } from '@/lib/api';

export default function RecordMeetingPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [recording, setRecording] = useState(false);
  const [paused, setPaused] = useState(false);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadMeeting();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  const loadMeeting = async () => {
    try {
      await meetingsApi.get(params.id);
      setLoading(false);
    } catch (err: any) {
      setError('Failed to load meeting');
      setLoading(false);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      mediaRecorderRef.current = new MediaRecorder(stream);
      chunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        await uploadRecording(blob);
        
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current.start();
      setRecording(true);
      setPaused(false);

      await meetingsApi.start(params.id);

      timerRef.current = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);

    } catch (err) {
      setError('Failed to access microphone. Please ensure microphone permissions are granted.');
      console.error('Recording error:', err);
    }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.pause();
      setPaused(true);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const resumeRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
      mediaRecorderRef.current.resume();
      setPaused(false);
      timerRef.current = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);
    }
  };

  const stopRecording = async () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      setRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const uploadRecording = async (blob: Blob) => {
    try {
      const formData = new FormData();
      formData.append('audio', blob);
      formData.append('chunkIndex', '0');

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/upload/meeting/${params.id}/chunk/direct`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to upload recording');
      }

      await meetingsApi.stop(params.id);
      router.push(`/dashboard/meetings/${params.id}`);
    } catch (err) {
      setError('Failed to upload recording. Please try again.');
      console.error('Upload error:', err);
    }
  };

  const formatDuration = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

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
            <h1 className="text-xl font-semibold">Recording</h1>
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

        <div className="bg-white border rounded-lg p-8 text-center space-y-8">
          <div>
            <div className="text-6xl font-bold text-gray-900 mb-2">
              {formatDuration(duration)}
            </div>
            <div className="text-gray-600">
              {recording ? (paused ? 'Paused' : 'Recording') : 'Ready to record'}
            </div>
          </div>

          {!recording ? (
            <button
              onClick={startRecording}
              className="w-full bg-red-600 text-white py-4 rounded-lg hover:bg-red-700 font-semibold text-lg"
            >
              Start Recording
            </button>
          ) : (
            <div className="flex gap-4 justify-center">
              {paused ? (
                <button
                  onClick={resumeRecording}
                  className="flex-1 bg-green-600 text-white py-4 rounded-lg hover:bg-green-700 font-semibold text-lg"
                >
                  Resume
                </button>
              ) : (
                <button
                  onClick={pauseRecording}
                  className="flex-1 bg-yellow-600 text-white py-4 rounded-lg hover:bg-yellow-700 font-semibold text-lg"
                >
                  Pause
                </button>
              )}
              <button
                onClick={stopRecording}
                className="flex-1 bg-gray-600 text-white py-4 rounded-lg hover:bg-gray-700 font-semibold text-lg"
              >
                Stop
              </button>
            </div>
          )}

          <div className="text-sm text-gray-500">
            {recording && (
              <div className="flex items-center justify-center gap-2">
                <div className="w-3 h-3 bg-red-600 rounded-full animate-pulse" />
                <span>Recording in progress</span>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}