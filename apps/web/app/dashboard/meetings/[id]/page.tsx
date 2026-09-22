'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { meetingsApi, actionItemsApi, type Meeting, type ActionItem } from '@/lib/api';

export default function MeetingDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadMeeting();
  }, [params.id]);

  const loadMeeting = async () => {
    try {
      const [meetingRes, actionsRes] = await Promise.all([
        meetingsApi.get(params.id),
        actionItemsApi.getByMeeting(params.id),
      ]);
      setMeeting(meetingRes.data);
      setActionItems(actionsRes.data);
    } catch (err: any) {
      setError('Failed to load meeting');
      console.error('Error loading meeting:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this meeting?')) return;

    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/meetings/${params.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
      });
      router.push('/dashboard/meetings');
    } catch (err) {
      setError('Failed to delete meeting');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return 'N/A';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  if (error || !meeting) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-red-600">{error || 'Meeting not found'}</div>
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
            <h1 className="text-xl font-semibold">{meeting.title}</h1>
            <button
              onClick={handleDelete}
              className="text-red-600 hover:text-red-900"
            >
              Delete
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white border rounded-lg p-6 mb-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div>
              <div className="text-sm text-gray-600">Status</div>
              <div className="font-semibold capitalize">{meeting.status}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Date</div>
              <div className="font-semibold">{formatDate(meeting.created_at)}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Duration</div>
              <div className="font-semibold">{formatDuration(meeting.duration_seconds)}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Type</div>
              <div className="font-semibold capitalize">{meeting.meeting_type}</div>
            </div>
          </div>

          {meeting.status === 'completed' && (
            <div className="border-t pt-6">
              <button
                onClick={() => router.push(`/dashboard/meetings/${params.id}/record`)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                Record Again
              </button>
            </div>
          )}
        </div>

        <div className="bg-white border rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Action Items</h2>
          {actionItems.length === 0 ? (
            <div className="text-gray-500 text-center py-4">
              No action items yet
            </div>
          ) : (
            <div className="space-y-4">
              {actionItems.map((item) => (
                <div key={item.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-medium">{item.task}</p>
                      {item.assignee && (
                        <p className="text-sm text-gray-600 mt-1">
                          Assigned to: {item.assignee}
                        </p>
                      )}
                      {item.due_date && (
                        <p className="text-sm text-gray-600 mt-1">
                          Due: {new Date(item.due_date).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 text-xs rounded ${
                        item.priority === 'high'
                          ? 'bg-red-100 text-red-700'
                          : item.priority === 'medium'
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}>
                        {item.priority}
                      </span>
                      <span className={`px-2 py-1 text-xs rounded ${
                        item.status === 'completed'
                          ? 'bg-green-100 text-green-700'
                          : item.status === 'in_progress'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}>
                        {item.status}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white border rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Summary</h2>
          <div className="text-gray-500 text-center py-4">
            Summary will be available after processing is complete
          </div>
        </div>
      </main>
    </div>
  );
}