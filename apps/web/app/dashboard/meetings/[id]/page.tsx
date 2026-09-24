'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  meetingsApi,
  actionItemsApi,
  transcriptsApi,
  type Meeting,
  type ActionItem,
  type MeetingSummary,
  type MeetingDecision,
  type TranscriptSegment,
} from '@/lib/api';

export default function MeetingDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [summary, setSummary] = useState<MeetingSummary | null>(null);
  const [decisions, setDecisions] = useState<MeetingDecision[]>([]);
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);
  const [segments, setSegments] = useState<TranscriptSegment[]>([]);
  const [activeTab, setActiveTab] = useState<'notes' | 'actions' | 'decisions' | 'transcript'>('notes');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editType, setEditType] = useState('business');
  const [copyNotification, setCopyNotification] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);

  useEffect(() => {
    loadAllMeetingData();
  }, [params.id]);

  const loadAllMeetingData = async () => {
    try {
      setLoading(true);
      const [meetingRes, summaryRes, decisionsRes, actionsRes, segmentsRes] = await Promise.all([
        meetingsApi.get(params.id),
        meetingsApi.getSummary(params.id).catch(() => ({ data: {} })),
        meetingsApi.getDecisions(params.id).catch(() => ({ data: [] })),
        actionItemsApi.getByMeeting(params.id).catch(() => ({ data: [] })),
        transcriptsApi.getSegments(params.id).catch(() => ({ data: [] })),
      ]);

      setMeeting(meetingRes.data);
      setEditTitle(meetingRes.data.title || '');
      setEditType(meetingRes.data.meeting_type || 'business');
      setSummary(summaryRes.data || null);
      setDecisions(decisionsRes.data || []);
      setActionItems(actionsRes.data || []);
      setSegments(segmentsRes.data || []);
    } catch (err: any) {
      setError('Failed to load meeting information');
      console.error('Error loading meeting data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!editTitle.trim()) return;
    try {
      const res = await meetingsApi.update(params.id, {
        title: editTitle,
        meeting_type: editType,
      });
      setMeeting(res.data);
      setIsEditing(false);
    } catch (err) {
      alert('Failed to update meeting details');
    }
  };

  const handleToggleActionStatus = async (item: ActionItem) => {
    const nextStatus = item.status === 'completed' ? 'pending' : 'completed';
    try {
      await actionItemsApi.updateStatus(item.id, nextStatus);
      setActionItems((prev) =>
        prev.map((a) => (a.id === item.id ? { ...a, status: nextStatus } : a))
      );
    } catch (err) {
      console.error('Failed to update task status:', err);
    }
  };

  const generateNotesContent = () => {
    if (!meeting) return '';

    let text = `# ${meeting.title}\n`;
    text += `Date: ${formatDate(meeting.created_at)}\n`;
    text += `Status: ${meeting.status}\n`;
    if (meeting.meeting_type) {
      text += `Type: ${meeting.meeting_type.replace('_', ' ')}\n`;
    }
    if (meeting.duration_seconds) {
      text += `Duration: ${formatSeconds(meeting.duration_seconds)}\n`;
    }
    text += `\n`;

    if (summary?.executive_summary) {
      text += `## Executive Summary\n${summary.executive_summary}\n\n`;
    }
    if (summary?.summary) {
      text += `## Detailed Summary\n${summary.summary}\n\n`;
    }
    if (decisions.length > 0) {
      text += `## Key Decisions\n`;
      decisions.forEach((d) => {
        text += `- ${d.decision}\n`;
      });
      text += `\n`;
    }
    if (actionItems.length > 0) {
      text += `## Action Items\n`;
      actionItems.forEach((a) => {
        const statusMark = a.status === 'completed' ? '[x]' : '[ ]';
        const assignee = a.assignee ? ` (${a.assignee})` : '';
        const due = a.due_date ? ` - Due: ${new Date(a.due_date).toLocaleDateString()}` : '';
        text += `${statusMark} ${a.task}${assignee}${due}\n`;
      });
      text += `\n`;
    }
    if (segments.length > 0) {
      text += `## Transcript\n`;
      segments.forEach((s) => {
        const time = formatSeconds(s.start_time);
        text += `[${time}] ${s.speaker_name || s.speaker_label || 'Speaker'}: ${s.text}\n`;
      });
    }

    return text;
  };

  const handleCopyNotes = () => {
    const text = generateNotesContent();
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopyNotification(true);
    setTimeout(() => setCopyNotification(false), 2500);
  };

  const handleDownloadFile = (extension: 'md' | 'txt') => {
    const text = generateNotesContent();
    if (!text || !meeting) return;

    const safeTitle = (meeting.title || 'meeting-notes')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');
    const filename = `${safeTitle || 'meeting-notes'}.${extension}`;
    const mimeType = extension === 'md' ? 'text/markdown;charset=utf-8' : 'text/plain;charset=utf-8';

    const blob = new Blob([text], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleEmailShare = () => {
    if (!meeting) return;
    const subject = encodeURIComponent(`Meeting Notes: ${meeting.title}`);
    const summaryText = summary?.executive_summary || summary?.summary || 'Meeting notes are ready.';
    const body = encodeURIComponent(
      `Hello,\n\nHere are the notes and action items from our meeting "${meeting.title}":\n\n${summaryText}\n\nView complete notes and recording at:\n${window.location.href}\n`
    );
    window.open(`mailto:?subject=${subject}&body=${body}`, '_blank');
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to permanently delete this meeting?')) return;

    try {
      await meetingsApi.delete(params.id);
      router.push('/dashboard/meetings');
    } catch (err) {
      setError('Failed to delete meeting');
    }
  };

  const handleReprocess = async () => {
    try {
      await meetingsApi.process(params.id);
      router.push(`/dashboard/meetings/${params.id}/processing`);
    } catch (err) {
      alert('Failed to start processing');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatSeconds = (totalSeconds?: number) => {
    if (totalSeconds === undefined || totalSeconds === null) return '00:00';
    const mins = Math.floor(totalSeconds / 60);
    const secs = Math.floor(totalSeconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-600 font-medium">Loading meeting notes...</div>
      </div>
    );
  }

  if (error || !meeting) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 gap-4">
        <div className="text-red-600 font-medium">{error || 'Meeting not found'}</div>
        <button
          onClick={() => router.push('/dashboard/meetings')}
          className="text-blue-600 hover:underline text-sm font-medium"
        >
          Return to Meetings
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push('/dashboard/meetings')}
                className="text-gray-600 hover:text-gray-900 font-medium text-sm border px-3 py-1.5 rounded-lg"
              >
                Back to Meetings
              </button>
              <h1 className="text-lg font-semibold text-gray-900 truncate max-w-sm sm:max-w-md">
                {meeting.title}
              </h1>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleCopyNotes}
                className="px-3 py-1.5 border rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
              >
                {copyNotification ? 'Copied' : 'Copy Notes'}
              </button>

              <div className="relative">
                <button
                  onClick={() => setShowExportMenu(!showExportMenu)}
                  className="px-3 py-1.5 border rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition flex items-center gap-1"
                >
                  Export & Share
                </button>

                {showExportMenu && (
                  <div className="absolute right-0 mt-1 w-48 bg-white border border-gray-200 rounded-xl shadow-lg z-20 py-1 text-sm">
                    <button
                      onClick={() => {
                        handleDownloadFile('md');
                        setShowExportMenu(false);
                      }}
                      className="w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-100 transition"
                    >
                      Download Markdown (.md)
                    </button>
                    <button
                      onClick={() => {
                        handleDownloadFile('txt');
                        setShowExportMenu(false);
                      }}
                      className="w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-100 transition"
                    >
                      Download Text (.txt)
                    </button>
                    <button
                      onClick={() => {
                        handlePrint();
                        setShowExportMenu(false);
                      }}
                      className="w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-100 transition"
                    >
                      Print / Save as PDF
                    </button>
                    <div className="border-t my-1"></div>
                    <button
                      onClick={() => {
                        handleEmailShare();
                        setShowExportMenu(false);
                      }}
                      className="w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-100 transition"
                    >
                      Email Notes Draft
                    </button>
                  </div>
                )}
              </div>

              <button
                onClick={() => setIsEditing(!isEditing)}
                className="px-3 py-1.5 border rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
              >
                {isEditing ? 'Cancel Edit' : 'Edit Info'}
              </button>
              <button
                onClick={handleDelete}
                className="px-3 py-1.5 border border-red-200 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 transition"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Edit Form */}
        {isEditing && (
          <div className="bg-white border rounded-xl p-6 shadow-sm space-y-4">
            <h2 className="text-base font-semibold text-gray-900">Edit Meeting Details</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Title</label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Meeting Type</label>
                <select
                  value={editType}
                  onChange={(e) => setEditType(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
            </div>
            <button
              onClick={handleSaveEdit}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition"
            >
              Save Changes
            </button>
          </div>
        )}

        {/* Overview Header Card */}
        <div className="bg-white border rounded-xl p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b">
            <div>
              <span className={`px-2.5 py-1 text-xs font-medium rounded-full uppercase tracking-wider ${
                meeting.status === 'completed'
                  ? 'bg-green-100 text-green-700'
                  : meeting.status === 'processing'
                  ? 'bg-amber-100 text-amber-700'
                  : 'bg-gray-100 text-gray-700'
              }`}>
                {meeting.status}
              </span>
            </div>

            <div className="flex items-center gap-3">
              {meeting.status === 'completed' ? (
                <button
                  onClick={() => router.push(`/dashboard/meetings/${meeting.id}/record`)}
                  className="bg-blue-600 text-white text-xs font-medium px-3.5 py-2 rounded-lg hover:bg-blue-700 transition"
                >
                  Record Again
                </button>
              ) : meeting.status === 'processing' ? (
                <button
                  onClick={() => router.push(`/dashboard/meetings/${meeting.id}/processing`)}
                  className="bg-amber-600 text-white text-xs font-medium px-3.5 py-2 rounded-lg hover:bg-amber-700 transition"
                >
                  View Processing
                </button>
              ) : (
                <button
                  onClick={handleReprocess}
                  className="bg-blue-600 text-white text-xs font-medium px-3.5 py-2 rounded-lg hover:bg-blue-700 transition"
                >
                  Process Audio
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pt-4 text-sm">
            <div>
              <div className="text-gray-500 text-xs">Date Recorded</div>
              <div className="font-medium text-gray-900 mt-1">{formatDate(meeting.created_at)}</div>
            </div>
            <div>
              <div className="text-gray-500 text-xs">Duration</div>
              <div className="font-medium text-gray-900 mt-1">{formatSeconds(meeting.duration_seconds)}</div>
            </div>
            <div>
              <div className="text-gray-500 text-xs">Type</div>
              <div className="font-medium text-gray-900 capitalize mt-1">{meeting.meeting_type || 'General'}</div>
            </div>
            <div>
              <div className="text-gray-500 text-xs">Notes Language</div>
              <div className="font-medium text-gray-900 uppercase mt-1">{meeting.output_language || 'EN'}</div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 border-b">
          <button
            onClick={() => setActiveTab('notes')}
            className={`pb-3 px-4 text-sm font-medium border-b-2 transition ${
              activeTab === 'notes'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            AI Notes & Summary
          </button>
          <button
            onClick={() => setActiveTab('actions')}
            className={`pb-3 px-4 text-sm font-medium border-b-2 transition flex items-center gap-1.5 ${
              activeTab === 'actions'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Action Items ({actionItems.length})
          </button>
          <button
            onClick={() => setActiveTab('decisions')}
            className={`pb-3 px-4 text-sm font-medium border-b-2 transition flex items-center gap-1.5 ${
              activeTab === 'decisions'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Decisions ({decisions.length})
          </button>
          <button
            onClick={() => setActiveTab('transcript')}
            className={`pb-3 px-4 text-sm font-medium border-b-2 transition flex items-center gap-1.5 ${
              activeTab === 'transcript'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Transcript ({segments.length})
          </button>
        </div>

        {/* Tab Contents */}
        {activeTab === 'notes' && (
          <div className="space-y-6">
            {summary?.executive_summary && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
                <h3 className="text-xs font-bold text-blue-900 uppercase tracking-wider mb-2">
                  Executive Takeaway
                </h3>
                <p className="text-blue-950 font-medium text-sm leading-relaxed">
                  {summary.executive_summary}
                </p>
              </div>
            )}

            <div className="bg-white border rounded-xl p-6 shadow-sm space-y-4">
              <h3 className="text-base font-semibold text-gray-900">Comprehensive Summary</h3>
              {summary?.summary ? (
                <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-line">
                  {summary.summary}
                </p>
              ) : (
                <div className="text-gray-500 text-sm py-4">
                  {meeting.status === 'processing'
                    ? 'Notes are being generated by the processing worker...'
                    : 'No summary generated yet. Click "Process Audio" above to analyze the meeting.'}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'actions' && (
          <div className="bg-white border rounded-xl p-6 shadow-sm space-y-4">
            <h3 className="text-base font-semibold text-gray-900">Assigned Tasks</h3>
            {actionItems.length === 0 ? (
              <div className="text-gray-500 text-sm py-6 text-center">
                No action items detected for this meeting.
              </div>
            ) : (
              <div className="space-y-3">
                {actionItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-start gap-3 p-4 border rounded-lg hover:border-gray-300 transition bg-white"
                  >
                    <input
                      type="checkbox"
                      checked={item.status === 'completed'}
                      onChange={() => handleToggleActionStatus(item)}
                      className="mt-1 h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer"
                    />
                    <div className="flex-1">
                      <p className={`text-sm font-medium ${item.status === 'completed' ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                        {item.task}
                      </p>
                      <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-gray-500">
                        {item.assignee && (
                          <span>Assignee: <strong className="font-medium text-gray-700">{item.assignee}</strong></span>
                        )}
                        {item.due_date && (
                          <span>Due: <strong className="font-medium text-gray-700">{new Date(item.due_date).toLocaleDateString()}</strong></span>
                        )}
                      </div>
                    </div>
                    <span className={`px-2 py-0.5 text-xs rounded uppercase font-semibold tracking-wider ${
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
        )}

        {activeTab === 'decisions' && (
          <div className="bg-white border rounded-xl p-6 shadow-sm space-y-4">
            <h3 className="text-base font-semibold text-gray-900">Agreed Decisions</h3>
            {decisions.length === 0 ? (
              <div className="text-gray-500 text-sm py-6 text-center">
                No decisions recorded for this meeting.
              </div>
            ) : (
              <div className="space-y-3">
                {decisions.map((d) => (
                  <div key={d.id} className="p-4 border rounded-lg bg-gray-50 space-y-1">
                    <p className="text-sm font-semibold text-gray-900">{d.decision}</p>
                    {d.source_timestamp !== undefined && d.source_timestamp !== null && (
                      <span className="text-xs text-gray-500 font-mono">
                        Timestamp: {formatSeconds(d.source_timestamp)}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'transcript' && (
          <div className="bg-white border rounded-xl p-6 shadow-sm space-y-4">
            <h3 className="text-base font-semibold text-gray-900">Audio Transcript</h3>
            {segments.length === 0 ? (
              <div className="text-gray-500 text-sm py-6 text-center">
                No transcript segments available.
              </div>
            ) : (
              <div className="space-y-4">
                {segments.map((seg) => (
                  <div key={seg.id || seg.segment_index} className="border-b pb-4 last:border-b-0">
                    <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                      <span className="font-semibold text-blue-700">
                        {seg.speaker_name || seg.speaker_label || 'Speaker'}
                      </span>
                      <span className="font-mono">
                        {formatSeconds(seg.start_time)} - {formatSeconds(seg.end_time)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-800 leading-relaxed">{seg.text}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}