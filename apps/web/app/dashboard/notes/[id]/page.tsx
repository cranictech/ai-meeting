'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { notesApi, authApi, type ManualNote, type StructuredMinutes } from '@/lib/api';
import { AppShell } from '@/components/AppShell';
import { Card, Badge } from '@/components/ui';

const MEETING_TYPES = ['business', 'team', 'client', 'project', 'interview', 'class', 'personal'];

export default function NoteEditorPage() {
  const params = useParams();
  const router = useRouter();
  const id = String(params?.id || '');

  const [note, setNote] = useState<ManualNote | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formatting, setFormatting] = useState(false);
  const [minutes, setMinutes] = useState<StructuredMinutes | null>(null);
  const [message, setMessage] = useState<{ tone: 'info' | 'error'; text: string } | null>(null);

  // Editable fields
  const [title, setTitle] = useState('');
  const [meetingType, setMeetingType] = useState('business');
  const [meetingDate, setMeetingDate] = useState('');
  const [objectives, setObjectives] = useState('');
  const [agenda, setAgenda] = useState('');
  const [content, setContent] = useState('');
  const [participantName, setParticipantName] = useState('');
  const [participants, setParticipants] = useState<Array<{ id: string; name: string; email?: string }>>([]);

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
    if (!token) {
      router.push('/login');
      return;
    }
    if (id) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const load = async () => {
    try {
      const [noteRes, profileRes] = await Promise.all([notesApi.get(id), authApi.getProfile().catch(() => null)]);
      const n = noteRes.data;
      setNote(n);
      setProfile(profileRes?.data ?? null);
      setTitle(n.title || '');
      setMeetingType(n.meeting_type || 'business');
      setMeetingDate(n.meeting_date ? n.meeting_date.slice(0, 16) : '');
      setObjectives(n.objectives || '');
      setAgenda(n.agenda || '');
      setContent(n.content || '');
      setParticipants(n.participants || []);
      if (n.manual_summary) {
        // Re-display previously formatted minutes.
        setMinutes({
          executiveSummary: n.manual_summary.executive_summary || '',
          summary: '',
          discussion: [],
          decisions: [],
          actionItems: [],
          risks: [],
          followUps: [],
          questions: [],
          markdown: n.manual_summary.summary || '',
        });
      }
    } catch (err: any) {
      setMessage({ tone: 'error', text: err?.response?.data?.error || 'Could not load this note.' });
    } finally {
      setLoading(false);
    }
  };

  const toIso = (local: string) => (local ? new Date(local).toISOString() : '');

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await notesApi.update(id, {
        title: title.trim() || 'Untitled note',
        meetingType,
        objectives,
        agenda,
        content,
        meetingDate: meetingDate ? toIso(meetingDate) : null,
      });
      setNote(res.data);
      setMessage({ tone: 'info', text: 'Saved.' });
    } catch (err: any) {
      setMessage({ tone: 'error', text: err?.response?.data?.error || 'Save failed.' });
    } finally {
      setSaving(false);
    }
  };

  const handleFormat = async () => {
    setFormatting(true);
    setMessage(null);
    try {
      // Save first so the server formats the latest text.
      await notesApi.update(id, { content, objectives, agenda, title: title.trim() || 'Untitled note' });
      const res = await notesApi.format(id);
      setMinutes(res.data.structured);
      setMessage({ tone: 'info', text: 'Formatted into minutes (template-based, not AI).' });
    } catch (err: any) {
      setMessage({ tone: 'error', text: err?.response?.data?.error || 'Could not format this note.' });
    } finally {
      setFormatting(false);
    }
  };

  const handleExport = async () => {
    setMessage(null);
    try {
      const res = await notesApi.downloadMarkdown(id);
      const url = URL.createObjectURL(res.data as unknown as Blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${(title || 'meeting-notes').toLowerCase().replace(/[^a-z0-9]+/g, '-')}.md`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      const status = err?.response?.status;
      setMessage({
        tone: 'error',
        text:
          status === 402
            ? err.response.data.error
            : 'Export failed. You can still copy the text below (always free).',
      });
    }
  };

  const handleCopy = async () => {
    try {
      const text = minutes?.markdown
        ? `# ${title}\n\n${minutes.markdown}`
        : `# ${title}\n\n${content}`;
      await navigator.clipboard.writeText(text);
      setMessage({ tone: 'info', text: 'Copied to clipboard.' });
    } catch {
      setMessage({ tone: 'error', text: 'Copy failed — select the text and copy manually.' });
    }
  };

  const addParticipant = async () => {
    if (!participantName.trim()) return;
    try {
      const res = await notesApi.addParticipant(id, { name: participantName.trim() });
      setParticipants((p) => [...p, res.data]);
      setParticipantName('');
    } catch (err: any) {
      setMessage({ tone: 'error', text: err?.response?.data?.error || 'Could not add participant.' });
    }
  };

  const removeParticipant = async (pid: string) => {
    try {
      await notesApi.removeParticipant(id, pid);
      setParticipants((p) => p.filter((x) => x.id !== pid));
    } catch (err) {
      console.error('Remove participant failed:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-sm font-medium text-muted-foreground">Loading note…</div>
      </div>
    );
  }

  const inputCls =
    'w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring';

  return (
    <AppShell userName={profile?.profile?.full_name} userEmail={profile?.user?.email}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Link href="/dashboard/notes" className="text-sm font-medium text-muted-foreground hover:text-foreground">
            ← All notes
          </Link>
          <div className="flex items-center gap-2">
            <Badge tone="muted">Manual note · free</Badge>
          </div>
        </div>

        {message && (
          <div
            className={`rounded-lg border px-4 py-3 text-sm ${
              message.tone === 'error'
                ? 'border-destructive/40 bg-destructive/10 text-destructive'
                : 'border-border bg-muted text-foreground'
            }`}
          >
            {message.text}
          </div>
        )}

        <Card className="space-y-5 p-6">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">Title</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} className={inputCls} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">Type</label>
              <select value={meetingType} onChange={(e) => setMeetingType(e.target.value)} className={inputCls}>
                {MEETING_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t[0].toUpperCase() + t.slice(1)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">Meeting date</label>
              <input
                type="datetime-local"
                value={meetingDate}
                onChange={(e) => setMeetingDate(e.target.value)}
                className={inputCls}
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">Objectives</label>
            <textarea
              value={objectives}
              onChange={(e) => setObjectives(e.target.value)}
              rows={2}
              placeholder="What should this meeting achieve?"
              className={inputCls}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">Agenda</label>
            <textarea
              value={agenda}
              onChange={(e) => setAgenda(e.target.value)}
              rows={3}
              placeholder="1. …"
              className={inputCls}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">Participants</label>
            <div className="mb-2 flex flex-wrap gap-2">
              {participants.map((p) => (
                <span
                  key={p.id}
                  className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-2.5 py-1 text-xs text-foreground"
                >
                  {p.name}
                  <button onClick={() => removeParticipant(p.id)} className="text-muted-foreground hover:text-destructive" title="Remove">
                    ×
                  </button>
                </span>
              ))}
              {participants.length === 0 && <span className="text-xs text-muted-foreground">No participants added.</span>}
            </div>
            <div className="flex gap-2">
              <input
                value={participantName}
                onChange={(e) => setParticipantName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addParticipant()}
                placeholder="Add a name"
                className={inputCls}
              />
              <button
                onClick={addParticipant}
                className="shrink-0 rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-muted"
              >
                Add
              </button>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              Notes{' '}
              <span className="font-normal text-muted-foreground">
                — use headers like “Decisions:” / “Action items:” and “- task @name by 2026-01-31”
              </span>
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={12}
              placeholder="Write your meeting notes here…"
              className={`${inputCls} font-mono`}
            />
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleSave}
              disabled={saving}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button
              onClick={handleFormat}
              disabled={formatting || !content.trim()}
              className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted disabled:opacity-50"
            >
              {formatting ? 'Formatting…' : 'Format into minutes'}
            </button>
            <button
              onClick={handleCopy}
              className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted"
            >
              Copy
            </button>
            <button
              onClick={handleExport}
              className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted"
            >
              Export .md
            </button>
          </div>
        </Card>

        {minutes && (
          <Card className="space-y-3 p-6">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-foreground">Formatted minutes</h2>
              <Badge tone="primary">Template-formatted · not AI</Badge>
            </div>
            {minutes.executiveSummary && (
              <p className="text-sm text-muted-foreground">{minutes.executiveSummary}</p>
            )}
            <pre className="whitespace-pre-wrap rounded-lg border border-border bg-muted p-4 font-sans text-sm text-foreground">
              {minutes.markdown}
            </pre>
          </Card>
        )}
      </div>
    </AppShell>
  );
}
