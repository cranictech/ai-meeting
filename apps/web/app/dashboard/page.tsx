'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { meetingsApi, actionItemsApi, authApi, type Meeting, type ActionItem, type UserProfileResponse } from '@/lib/api';

export default function DashboardPage() {
  const router = useRouter();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfileResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      router.push('/login');
      return;
    }

    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [meetingsRes, actionsRes, profileRes] = await Promise.all([
        meetingsApi.list(),
        actionItemsApi.getUserItems('pending'),
        authApi.getProfile(),
      ]);
      setMeetings(meetingsRes.data);
      setActionItems(actionsRes.data);
      setUserProfile(profileRes.data);

      // Check if user has completed onboarding
      if (!profileRes.data.profile.full_name) {
        router.push('/onboarding');
        return;
      }

      // TODO: Check if user has completed permissions
      // For now, redirect to permissions if not completed
      // router.push('/permissions');
    } catch (error) {
      console.error('Failed to load data:', error);
      if (error.response?.status === 401) {
        localStorage.removeItem('auth_token');
        router.push('/login');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('auth_token');
      router.push('/');
    }
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
            <h1 className="text-2xl font-bold">Meeting AI</h1>
            <div className="flex items-center gap-4">
              <Link href="/dashboard/meetings" className="text-gray-700 hover:text-gray-900">
                Meetings
              </Link>
              <Link href="/dashboard/tasks" className="text-gray-700 hover:text-gray-900">
                Tasks
              </Link>
              <Link href="/dashboard/settings" className="text-gray-700 hover:text-gray-900">
                Settings
              </Link>
              <button
                onClick={handleLogout}
                className="text-gray-700 hover:text-gray-900"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">
            Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'}, {userProfile?.profile?.full_name || 'there'}
          </h2>
          <p className="text-gray-600">Ready to capture your next meeting?</p>
        </div>

        <Link
          href="/dashboard/meetings/new"
          className="block bg-blue-600 text-white text-center py-6 rounded-xl mb-8 hover:bg-blue-700 transition font-semibold text-lg"
        >
          Start New Meeting
        </Link>

        <div className="grid md:grid-cols-2 gap-8">
          <div>
            <h3 className="text-xl font-semibold mb-4">Recent Meetings</h3>
            {meetings.length === 0 ? (
              <div className="bg-white border rounded-lg p-6 text-center text-gray-500">
                No meetings yet. Start your first recording!
              </div>
            ) : (
              <div className="space-y-4">
                {meetings.slice(0, 5).map((meeting) => (
                  <Link
                    key={meeting.id}
                    href={`/dashboard/meetings/${meeting.id}`}
                    className="block bg-white border rounded-lg p-4 hover:border-blue-500 transition"
                  >
                    <h4 className="font-semibold">{meeting.title}</h4>
                    <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                      <span className="capitalize">{meeting.status}</span>
                      <span>
                        {new Date(meeting.created_at).toLocaleDateString()}
                      </span>
                      {meeting.duration_seconds && (
                        <span>
                          {Math.floor(meeting.duration_seconds / 60)} minutes
                        </span>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div>
            <h3 className="text-xl font-semibold mb-4">Pending Action Items</h3>
            {actionItems.length === 0 ? (
              <div className="bg-white border rounded-lg p-6 text-center text-gray-500">
                No pending tasks
              </div>
            ) : (
              <div className="space-y-4">
                {actionItems.slice(0, 5).map((item) => (
                  <div
                    key={item.id}
                    className="bg-white border rounded-lg p-4"
                  >
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
                      <span className={`px-2 py-1 text-xs rounded ${
                        item.priority === 'high'
                          ? 'bg-red-100 text-red-700'
                          : item.priority === 'medium'
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}>
                        {item.priority}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
