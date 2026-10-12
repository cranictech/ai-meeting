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
import { AppShell } from '@/components/AppShell';
import { Card, StatCard, QuickAction, Badge } from '@/components/ui';

function statusTone(status: Meeting['status']): 'success' | 'warning' | 'danger' | 'muted' {
  switch (status) {
    case 'completed':
      return 'success';
    case 'processing':
      return 'warning';
    case 'recording':
      return 'danger';
    default:
      return 'muted';
  }
}

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
        actionItemsApi.getUserItems('pending').catch(() => ({ data: [] })),
        authApi.getProfile().catch(() => null),
      ]);
      setMeetings(meetingsRes.data);
      setActionItems(actionsRes.data || []);
      setUserProfile(profileRes?.data ?? null);
    } catch (error: any) {
      console.error('Failed to load data:', error);
      if (error?.response?.status === 401) {
        localStorage.removeItem('auth_token');
        router.push('/login');
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
      router.push('/dashboard/search?q=' + encodeURIComponent(searchQuery.trim()));
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

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '';
    const mins = Math.floor(seconds / 60);
    return `${mins}m`;
  };

  const totalMinutes = Math.round(
    meetings.reduce((acc, m) => acc + (m.duration_seconds || 0), 0) / 60
  );

  const searchSlot = (
    <form onSubmit={handleSearch} className="relative w-64 lg:w-80">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <circle cx="11" cy="11" r="7" />
          <path d="m21 21-4.3-4.3" />
        </svg>
      </span>
      <input
        type="text"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder="Search meetings…"
        className="w-full rounded-lg border border-border bg-background py-2 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
      />
    </form>
  );

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-sm font-medium text-muted-foreground">Loading dashboard…</div>
      </div>
    );
  }

  const userName = userProfile?.profile?.full_name || 'there';

  return (
    <AppShell userName={userProfile?.profile?.full_name} userEmail={userProfile?.user?.email} search={searchSlot}>
      <div className="space-y-8">
        {/* Greeting */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'}, {userName}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">Ready to record and analyze your next meeting?</p>
          </div>
          <Link
            href="/dashboard/meetings/new"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-card transition hover:opacity-90"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Start New Meeting
          </Link>
        </div>

        {/* Quick actions */}
        <Card className="p-6">
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
            <QuickAction
              href="/dashboard/meetings/new"
              label="New Meeting"
              tone="primary"
              icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"/><path d="M19 10v1a7 7 0 0 1-14 0v-1M12 18v4"/></svg>}
            />
            <QuickAction
              href="/dashboard/meetings"
              label="My Meetings"
              tone="green"
              icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h11l5 5v11a0 0 0 0 1 0 0H4z"/><path d="M14 4v6h6"/></svg>}
            />
            <QuickAction
              href="/dashboard/tasks"
              label="Tasks"
              tone="orange"
              icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>}
            />
            <QuickAction
              href="/dashboard/search"
              label="Search"
              tone="purple"
              icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>}
            />
          </div>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard label="Total Meetings" value={meetings.length} tone="primary" icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>} />
          <StatCard label="Open Tasks" value={actionItems.length} tone="warning" icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>} />
          <StatCard label="Minutes Recorded" value={totalMinutes} tone="success" icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>} />
        </div>

        {/* Recent meetings + tasks */}
        <div className="grid gap-8 lg:grid-cols-2">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-foreground">Recent Meetings</h2>
              <Link href="/dashboard/meetings" className="text-xs font-semibold text-primary hover:underline">
                View all ({meetings.length})
              </Link>
            </div>
            {meetings.length === 0 ? (
              <Card className="p-8 text-center text-sm text-muted-foreground">
                No meetings yet. Start a new meeting to generate notes.
              </Card>
            ) : (
              <div className="space-y-3">
                {meetings.slice(0, 5).map((meeting) => (
                  <Link key={meeting.id} href={`/dashboard/meetings/${meeting.id}`} className="block">
                    <Card hover className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <h3 className="truncate font-semibold text-foreground">{meeting.title}</h3>
                          <div className="mt-1.5 flex items-center gap-3 text-xs text-muted-foreground">
                            <span>{new Date(meeting.created_at).toLocaleDateString()}</span>
                            {meeting.duration_seconds && <span>{formatDuration(meeting.duration_seconds)}</span>}
                            <span className="capitalize">{meeting.meeting_type || 'General'}</span>
                          </div>
                        </div>
                        <Badge tone={statusTone(meeting.status)}>{meeting.status}</Badge>
                      </div>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-foreground">Pending Action Items</h2>
              <Link href="/dashboard/tasks" className="text-xs font-semibold text-primary hover:underline">
                View tasks ({actionItems.length})
              </Link>
            </div>
            {actionItems.length === 0 ? (
              <Card className="p-8 text-center text-sm text-muted-foreground">All tasks are up to date.</Card>
            ) : (
              <div className="space-y-3">
                {actionItems.slice(0, 5).map((item) => (
                  <Card key={item.id} className="flex items-start gap-3 p-4">
                    <input
                      type="checkbox"
                      onChange={() => handleToggleTask(item)}
                      className="mt-1 h-4 w-4 rounded border-border text-primary focus:ring-ring"
                      title="Mark as complete"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground">{item.task}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                        {item.assignee && <span>Assignee: <strong className="text-foreground">{item.assignee}</strong></span>}
                        {item.due_date && <span>Due: <strong className="text-foreground">{new Date(item.due_date).toLocaleDateString()}</strong></span>}
                      </div>
                    </div>
                    <Badge tone={item.priority === 'high' ? 'danger' : item.priority === 'medium' ? 'warning' : 'muted'}>
                      {item.priority}
                    </Badge>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
