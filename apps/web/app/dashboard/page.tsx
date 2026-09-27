'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  meetingsApi,
  actionItemsApi,
  authApi,
  type Meeting,
  type ActionItem,
  type UserProfileResponse,
} from '@/lib/api';

export default function DashboardPage() {
  const router = useRouter();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfileResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
    const devMode = typeof window !== 'undefined' ? localStorage.getItem('dev_mode') : null;
    
    if (!token && !devMode) {
      router.push('/login');
      return;
    }

    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [meetingsRes, actionsRes, profileRes] = await Promise.all([
        meetingsApi.list(),
        actionItemsApi.getUserItems('pending').catch(() => ({ data: [] })),
        authApi.getProfile().catch(() => null),
      ]);
      setMeetings(meetingsRes.data);
      setActionItems(actionsRes.data || []);
      
      if (profileRes) {
        setUserProfile(profileRes.data);
      } else {
        // Set default profile for dev mode
        setUserProfile({
          user: { id: 'dev-user-id', email: 'dev@example.com', emailVerified: true, status: 'active' },
          profile: { user_id: 'dev-user-id', full_name: 'Dev User', output_language: 'en' }
        } as UserProfileResponse);
      }
    } catch (error: any) {
      console.error('Failed to load data:', error);
      // Set default data for dev mode on error
      setUserProfile({
        user: { id: 'dev-user-id', email: 'dev@example.com', emailVerified: true, status: 'active' },
        profile: { user_id: 'dev-user-id', full_name: 'Dev User', output_language: 'en' }
      } as UserProfileResponse);
      if (error?.response?.status === 401) {
        const devMode = typeof window !== 'undefined' ? localStorage.getItem('dev_mode') : null;
        if (!devMode) {
          localStorage.removeItem('auth_token');
          router.push('/login');
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      loadData();
      return;
    }

    try {
      setIsSearching(true);
      const res = await meetingsApi.search(searchQuery.trim());
      setMeetings(res.data);
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleToggleTask = async (item: ActionItem) => {
    try {
      await actionItemsApi.updateStatus(item.id, 'completed');
      setActionItems((prev) => prev.filter((a) => a.id !== item.id));
    } catch (err) {
      console.error('Failed to mark task complete:', err);
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

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '';
    const mins = Math.floor(seconds / 60);
    return `${mins}m`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-600 font-medium">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">Meeting AI</h1>
            <div className="flex items-center gap-6">
              <Link href="/dashboard/meetings" className="text-sm font-medium text-gray-700 hover:text-blue-600 transition">
                Meetings
              </Link>
              <Link href="/dashboard/tasks" className="text-sm font-medium text-gray-700 hover:text-blue-600 transition">
                Tasks
              </Link>
              <Link href="/dashboard/organizations" className="text-sm font-medium text-gray-700 hover:text-blue-600 transition">
                Teams
              </Link>
              <Link href="/dashboard/billing" className="text-sm font-medium text-gray-700 hover:text-blue-600 transition">
                Billing
              </Link>
              <Link href="/dashboard/search" className="text-sm font-medium text-gray-700 hover:text-blue-600 transition">
                Search
              </Link>
              <Link href="/dashboard/settings" className="text-sm font-medium text-gray-700 hover:text-blue-600 transition">
                Settings
              </Link>
              <button
                onClick={handleLogout}
                className="text-sm font-medium text-gray-500 hover:text-red-600 transition"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Welcome Banner */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'}, {userProfile?.profile?.full_name || 'there'}
            </h2>
            <p className="text-gray-600 text-sm mt-1">Ready to record and analyze your next meeting?</p>
          </div>

          <Link
            href="/dashboard/meetings/new"
            className="inline-flex items-center justify-center bg-blue-600 text-white px-6 py-3 rounded-xl hover:bg-blue-700 transition font-semibold text-sm shadow-sm"
          >
            Start New Meeting
          </Link>
        </div>

        {/* Global Search Bar */}
        <form onSubmit={handleSearch} className="flex gap-2">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search meetings, transcript text, decisions, or action items..."
            className="flex-1 px-4 py-3 bg-white border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
          />
          <button
            type="submit"
            disabled={isSearching}
            className="bg-gray-900 text-white px-6 py-3 rounded-xl font-medium text-sm hover:bg-black transition disabled:opacity-50"
          >
            {isSearching ? 'Searching...' : 'Search'}
          </button>
        </form>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Recent Meetings */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900">Recent Meetings</h3>
              <Link href="/dashboard/meetings" className="text-xs font-semibold text-blue-600 hover:underline">
                View all ({meetings.length})
              </Link>
            </div>

            {meetings.length === 0 ? (
              <div className="bg-white border rounded-xl p-8 text-center text-gray-500 text-sm shadow-sm">
                No meetings found. Start a new meeting to generate notes.
              </div>
            ) : (
              <div className="space-y-3">
                {meetings.slice(0, 5).map((meeting) => (
                  <Link
                    key={meeting.id}
                    href={`/dashboard/meetings/${meeting.id}`}
                    className="block bg-white border rounded-xl p-4 hover:border-blue-400 hover:shadow-sm transition"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0 pr-3">
                        <h4 className="font-semibold text-gray-900 truncate">{meeting.title}</h4>
                        <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-500">
                          <span>{new Date(meeting.created_at).toLocaleDateString()}</span>
                          {meeting.duration_seconds && <span>{formatDuration(meeting.duration_seconds)}</span>}
                          <span className="capitalize">{meeting.meeting_type || 'General'}</span>
                        </div>
                      </div>
                      <span className={`px-2 py-0.5 text-xs font-semibold rounded-full uppercase tracking-wider ${
                        meeting.status === 'completed'
                          ? 'bg-green-100 text-green-700'
                          : meeting.status === 'processing'
                          ? 'bg-amber-100 text-amber-700'
                          : meeting.status === 'recording'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}>
                        {meeting.status}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Pending Action Items */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900">Pending Action Items</h3>
              <Link href="/dashboard/tasks" className="text-xs font-semibold text-blue-600 hover:underline">
                View tasks ({actionItems.length})
              </Link>
            </div>

            {actionItems.length === 0 ? (
              <div className="bg-white border rounded-xl p-8 text-center text-gray-500 text-sm shadow-sm">
                All tasks are up to date.
              </div>
            ) : (
              <div className="space-y-3">
                {actionItems.slice(0, 5).map((item) => (
                  <div
                    key={item.id}
                    className="bg-white border rounded-xl p-4 flex items-start gap-3 shadow-sm hover:border-gray-300 transition"
                  >
                    <input
                      type="checkbox"
                      onChange={() => handleToggleTask(item)}
                      className="mt-1 h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                      title="Mark as complete"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">{item.task}</p>
                      <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-gray-500">
                        {item.assignee && <span>Assignee: <strong className="text-gray-700">{item.assignee}</strong></span>}
                        {item.due_date && <span>Due: <strong className="text-gray-700">{new Date(item.due_date).toLocaleDateString()}</strong></span>}
                      </div>
                    </div>
                    <span className={`px-2 py-0.5 text-xs font-semibold rounded uppercase tracking-wider ${
                      item.priority === 'high'
                        ? 'bg-red-100 text-red-700'
                        : item.priority === 'medium'
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-gray-100 text-gray-700'
                    }`}>
                      {item.priority}
                    </span>
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
