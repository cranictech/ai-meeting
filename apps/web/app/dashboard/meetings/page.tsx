'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { meetingsApi, type Meeting } from '@/lib/api';

export default function MeetingsPage() {
  const router = useRouter();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    loadMeetings();
  }, []);

  const loadMeetings = async () => {
    try {
      setLoading(true);
      const response = await meetingsApi.list();
      setMeetings(response.data);
    } catch (err) {
      console.error('Failed to load meetings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      loadMeetings();
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

  const handleClearSearch = () => {
    setSearchQuery('');
    loadMeetings();
  };

  const filteredMeetings = meetings.filter((meeting) => {
    if (filter === 'all') return true;
    return meeting.status === filter;
  });

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '';
    const mins = Math.floor(seconds / 60);
    const hrs = Math.floor(mins / 60);
    const remainingMins = mins % 60;

    if (hrs > 0) {
      return `${hrs}h ${remainingMins}m`;
    }
    return `${mins}m`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-600 font-medium">Loading meetings...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-6">
              <Link href="/dashboard" className="text-xl font-bold text-gray-900 tracking-tight">
                Meeting AI
              </Link>
              <div className="hidden md:flex items-center gap-6">
                <Link href="/dashboard" className="text-sm font-medium text-gray-700 hover:text-blue-600 transition">
                  Home
                </Link>
                <Link href="/dashboard/meetings" className="text-sm font-semibold text-blue-600 transition">
                  Meetings
                </Link>
                <Link href="/dashboard/tasks" className="text-sm font-medium text-gray-700 hover:text-blue-600 transition">
                  Tasks
                </Link>
                <Link href="/dashboard/search" className="text-sm font-medium text-gray-700 hover:text-blue-600 transition">
                  Search
                </Link>
                <Link href="/dashboard/settings" className="text-sm font-medium text-gray-700 hover:text-blue-600 transition">
                  Settings
                </Link>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Link
                href="/dashboard/meetings/new"
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium text-sm transition"
              >
                Start Meeting
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Search Bar */}
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search meetings by title, notes, transcript, or tasks..."
              className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={handleClearSearch}
                className="absolute right-3 top-2.5 text-xs text-gray-400 hover:text-gray-600 font-bold"
              >
                CLEAR
              </button>
            )}
          </div>
          <button
            type="submit"
            disabled={isSearching}
            className="bg-gray-900 text-white px-5 py-2.5 rounded-xl font-medium text-sm hover:bg-black transition disabled:opacity-50"
          >
            {isSearching ? 'Searching...' : 'Search'}
          </button>
        </form>

        {/* Filter Tabs */}
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            {['all', 'completed', 'processing', 'draft'].map((status) => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition ${
                  filter === status
                    ? 'bg-blue-600 text-white'
                    : 'bg-white border text-gray-700 hover:bg-gray-50'
                }`}
              >
                {status}
              </button>
            ))}
          </div>

          <span className="text-xs text-gray-500 font-medium">
            {filteredMeetings.length} {filteredMeetings.length === 1 ? 'meeting' : 'meetings'}
          </span>
        </div>

        {/* Meetings List */}
        {filteredMeetings.length === 0 ? (
          <div className="bg-white border rounded-xl p-12 text-center shadow-sm">
            <div className="text-gray-500 text-sm mb-4">
              {searchQuery
                ? `No meetings found matching "${searchQuery}"`
                : filter === 'all'
                ? 'No meetings recorded yet'
                : `No ${filter} meetings found`}
            </div>
            {searchQuery ? (
              <button
                onClick={handleClearSearch}
                className="text-blue-600 hover:underline text-sm font-medium"
              >
                Reset search
              </button>
            ) : (
              <Link
                href="/dashboard/meetings/new"
                className="bg-blue-600 text-white px-6 py-2.5 rounded-lg hover:bg-blue-700 inline-block font-medium text-sm transition"
              >
                Start Your First Meeting
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredMeetings.map((meeting) => (
              <Link
                key={meeting.id}
                href={`/dashboard/meetings/${meeting.id}`}
                className="block bg-white border rounded-xl p-5 hover:border-blue-400 hover:shadow-sm transition"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-semibold text-gray-900 truncate mb-1">
                      {meeting.title}
                    </h3>
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span>{formatDate(meeting.created_at)}</span>
                      {meeting.duration_seconds ? (
                        <span>{formatDuration(meeting.duration_seconds)}</span>
                      ) : null}
                      <span className="capitalize">{meeting.meeting_type || 'General'}</span>
                    </div>
                  </div>

                  <div>
                    <span
                      className={`px-2.5 py-1 text-xs font-semibold rounded-full uppercase tracking-wider ${
                        meeting.status === 'completed'
                          ? 'bg-green-100 text-green-700'
                          : meeting.status === 'processing'
                          ? 'bg-amber-100 text-amber-700'
                          : meeting.status === 'recording'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {meeting.status}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}