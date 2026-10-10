'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  meetingsApi,
  foldersApi,
  tagsApi,
  type Meeting,
  type FolderItem,
  type TagItem,
} from '@/lib/api';

export default function MeetingsPage() {
  const router = useRouter();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [tags, setTags] = useState<TagItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedFolder, setSelectedFolder] = useState<string>('all');
  const [selectedTag, setSelectedTag] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  // New Folder Modal
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderColor, setNewFolderColor] = useState('#2563eb');

  // New Tag Modal
  const [showTagModal, setShowTagModal] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('#059669');

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    try {
      setLoading(true);
      const [mRes, fRes, tRes] = await Promise.all([
        meetingsApi.list(),
        foldersApi.list().catch(() => ({ data: [] })),
        tagsApi.list().catch(() => ({ data: [] })),
      ]);
      setMeetings(mRes.data || []);
      setFolders(fRes.data || []);
      setTags(tRes.data || []);
    } catch (err) {
      console.error('Failed to load meetings data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      const res = await meetingsApi.list();
      setMeetings(res.data || []);
      return;
    }

    try {
      setIsSearching(true);
      const res = await meetingsApi.search(searchQuery.trim());
      setMeetings(res.data || []);
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleClearSearch = async () => {
    setSearchQuery('');
    const res = await meetingsApi.list();
    setMeetings(res.data || []);
  };

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    try {
      await foldersApi.create(newFolderName.trim(), newFolderColor);
      setShowFolderModal(false);
      setNewFolderName('');
      const fRes = await foldersApi.list();
      setFolders(fRes.data || []);
    } catch (err) {
      console.error('Failed to create folder:', err);
    }
  };

  const handleCreateTag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTagName.trim()) return;
    try {
      const formatted = newTagName.trim().replace(/^#/, '');
      await tagsApi.create(formatted, newTagColor);
      setShowTagModal(false);
      setNewTagName('');
      const tRes = await tagsApi.list();
      setTags(tRes.data || []);
    } catch (err) {
      console.error('Failed to create tag:', err);
    }
  };

  const filteredMeetings = meetings.filter((meeting) => {
    if (statusFilter !== 'all' && meeting.status !== statusFilter) return false;
    return true;
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
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-slate-600 font-medium">Loading meetings...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top Navbar */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-6">
              <Link href="/dashboard" className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                Meeti
              </Link>
              <div className="hidden md:flex items-center gap-5 text-sm font-medium text-slate-600">
                <Link href="/dashboard" className="hover:text-blue-600 transition">Home</Link>
                <Link href="/dashboard/meetings" className="text-blue-600 font-semibold border-b-2 border-blue-600 pb-1">Meetings</Link>
                <Link href="/dashboard/tasks" className="hover:text-blue-600 transition">Tasks</Link>
                <Link href="/dashboard/integrations" className="hover:text-blue-600 transition">Integrations</Link>
                <Link href="/dashboard/developer" className="hover:text-blue-600 transition">Developer & API</Link>
                <Link href="/dashboard/organizations" className="hover:text-blue-600 transition">Organizations</Link>
                <Link href="/dashboard/billing" className="hover:text-blue-600 transition">Billing</Link>
                <Link href="/dashboard/settings" className="hover:text-blue-600 transition">Settings</Link>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Link
                href="/dashboard/meetings/new"
                className="bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700 font-semibold text-sm shadow-xs transition"
              >
                + Start Meeting
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Left Sidebar: Folders & Tags */}
          <aside className="lg:col-span-1 space-y-6">
            {/* Folders Section (#26) */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Folders</h3>
                <button
                  onClick={() => setShowFolderModal(true)}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-800"
                >
                  + Add
                </button>
              </div>

              <div className="space-y-1">
                <button
                  onClick={() => setSelectedFolder('all')}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold transition flex items-center justify-between ${
                    selectedFolder === 'all'
                      ? 'bg-blue-50 text-blue-700 font-bold'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <span>📁 All Folders</span>
                  <span className="text-[11px] opacity-60">{meetings.length}</span>
                </button>

                {folders.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setSelectedFolder(f.id)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition flex items-center justify-between ${
                      selectedFolder === f.id
                        ? 'bg-blue-50 text-blue-700 font-bold'
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <span className="flex items-center gap-2 truncate">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: f.color || '#3b82f6' }} />
                      <span className="truncate">{f.name}</span>
                    </span>
                    <span className="text-[11px] opacity-60">{f.meeting_count || 0}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Tags Section (#27) */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tags</h3>
                <button
                  onClick={() => setShowTagModal(true)}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-800"
                >
                  + Add
                </button>
              </div>

              <div className="flex flex-wrap gap-1.5">
                <button
                  onClick={() => setSelectedTag('all')}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition ${
                    selectedTag === 'all'
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  All
                </button>
                {tags.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setSelectedTag(t.id)}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium transition flex items-center gap-1.5 ${
                      selectedTag === t.id
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: t.color || '#6b7280' }} />
                    <span>#{t.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </aside>

          {/* Right Main Column: Search, Filters & Meetings */}
          <div className="lg:col-span-3 space-y-6">
            {/* Search Bar */}
            <form onSubmit={handleSearch} className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search meetings by title, notes, transcript, or action items..."
                  className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={handleClearSearch}
                    className="absolute right-3 top-2.5 text-xs text-slate-400 hover:text-slate-600 font-bold"
                  >
                    CLEAR
                  </button>
                )}
              </div>
              <button
                type="submit"
                disabled={isSearching}
                className="bg-slate-900 text-white px-5 py-2.5 rounded-xl font-semibold text-sm hover:bg-black transition disabled:opacity-50 shadow-xs"
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
                    onClick={() => setStatusFilter(status)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold uppercase tracking-wider transition ${
                      statusFilter === status
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </div>

              <span className="text-xs text-slate-500 font-medium">
                {filteredMeetings.length} {filteredMeetings.length === 1 ? 'meeting' : 'meetings'}
              </span>
            </div>

            {/* Meetings List */}
            {filteredMeetings.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-xs">
                <div className="text-slate-500 text-sm mb-4">
                  {searchQuery
                    ? `No meetings found matching "${searchQuery}"`
                    : statusFilter === 'all'
                    ? 'No meetings recorded yet'
                    : `No ${statusFilter} meetings found`}
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
                    className="bg-blue-600 text-white px-6 py-2.5 rounded-xl hover:bg-blue-700 inline-block font-semibold text-sm transition shadow-xs"
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
                    className="block bg-white border border-slate-200/90 rounded-2xl p-5 hover:border-blue-400 hover:shadow-md transition group"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <h3 className="font-bold text-slate-900 group-hover:text-blue-600 transition text-base">
                            {meeting.title}
                          </h3>
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                              meeting.status === 'completed'
                                ? 'bg-emerald-100 text-emerald-800'
                                : meeting.status === 'processing'
                                ? 'bg-amber-100 text-amber-800 animate-pulse'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {meeting.status}
                          </span>
                        </div>

                        <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                          <span>{formatDate(meeting.created_at)}</span>
                          {meeting.duration_seconds ? (
                            <>
                              <span>•</span>
                              <span>{formatDuration(meeting.duration_seconds)}</span>
                            </>
                          ) : null}
                          {meeting.meeting_type && (
                            <>
                              <span>•</span>
                              <span className="capitalize">{meeting.meeting_type}</span>
                            </>
                          )}
                          {meeting.detected_languages && meeting.detected_languages.length > 0 && (
                            <>
                              <span>•</span>
                              <span className="uppercase text-[11px] font-semibold text-blue-600">
                                {meeting.detected_languages.join(', ')}
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="text-slate-400 group-hover:text-blue-600 transition pl-4">
                        →
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Modal: Create Folder */}
        {showFolderModal && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl border border-slate-200">
              <form onSubmit={handleCreateFolder}>
                <h3 className="text-base font-bold text-slate-900 mb-1">Create Folder</h3>
                <p className="text-xs text-slate-500 mb-4">Organize meetings by project, client, or team.</p>

                <div className="mb-4">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Folder Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Clients, Personal, Church, Q4 Roadmap"
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="mb-6">
                  <label className="block text-xs font-semibold text-slate-700 mb-2">Folder Color</label>
                  <div className="flex gap-2">
                    {['#2563eb', '#7c3aed', '#059669', '#dc2626', '#d97706', '#475569'].map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setNewFolderColor(c)}
                        className={`w-7 h-7 rounded-full transition ${
                          newFolderColor === c ? 'ring-2 ring-offset-2 ring-slate-900 scale-110' : ''
                        }`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowFolderModal(false)}
                    className="px-4 py-2 border border-slate-300 text-slate-600 rounded-xl text-xs font-semibold hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold"
                  >
                    Save Folder
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Create Tag */}
        {showTagModal && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl border border-slate-200">
              <form onSubmit={handleCreateTag}>
                <h3 className="text-base font-bold text-slate-900 mb-1">Create Tag</h3>
                <p className="text-xs text-slate-500 mb-4">Tag meetings with custom labels like #urgent or #marketing.</p>

                <div className="mb-4">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Tag Name</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-slate-400 font-bold">#</span>
                    <input
                      type="text"
                      required
                      placeholder="marketing"
                      value={newTagName}
                      onChange={(e) => setNewTagName(e.target.value)}
                      className="w-full pl-7 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="mb-6">
                  <label className="block text-xs font-semibold text-slate-700 mb-2">Tag Color</label>
                  <div className="flex gap-2">
                    {['#059669', '#2563eb', '#7c3aed', '#dc2626', '#d97706', '#0891b2'].map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setNewTagColor(c)}
                        className={`w-7 h-7 rounded-full transition ${
                          newTagColor === c ? 'ring-2 ring-offset-2 ring-slate-900 scale-110' : ''
                        }`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowTagModal(false)}
                    className="px-4 py-2 border border-slate-300 text-slate-600 rounded-xl text-xs font-semibold hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold"
                  >
                    Save Tag
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}