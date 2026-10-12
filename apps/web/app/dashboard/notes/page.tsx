'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { notesApi, authApi, type MeetingTemplate, type ManualNote } from '@/lib/api';
import { AppShell } from '@/components/AppShell';
import { Card, PageHeader, Badge } from '@/components/ui';

export default function NotesListPage() {
  const router = useRouter();
  const [notes, setNotes] = useState<ManualNote[]>([]);
  const [templates, setTemplates] = useState<MeetingTemplate[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
    if (!token) {
      router.push('/login');
      return;
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const load = async () => {
    try {
      const [notesRes, tplRes, profileRes] = await Promise.all([
        notesApi.list(),
        notesApi.templates(),
        authApi.getProfile().catch(() => null),
      ]);
      setNotes(notesRes.data || []);
      setTemplates(tplRes.data || []);
      setProfile(profileRes?.data ?? null);
    } catch (err) {
      console.error('Failed to load notes:', err);
    } finally {
      setLoading(false);
    }
  };

  const createBlank = async () => {
    if (!newTitle.trim()) {
      setError('Give your note a title first.');
      return;
    }
    setError('');
    setCreating(true);
    try {
      const res = await notesApi.create({ title: newTitle.trim(), meetingType: 'business' });
      router.push(`/dashboard/notes/${res.data.id}`);
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Could not create the note.');
      setCreating(false);
    }
  };

  const createFromTemplate = async (tpl: MeetingTemplate) => {
    setCreating(true);
    setError('');
    try {
      const res = await notesApi.create({
        title: `${tpl.name} — ${new Date().toLocaleDateString()}`,
        meetingType: tpl.id,
        templateId: tpl.id,
      });
      router.push(`/dashboard/notes/${res.data.id}`);
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Could not create from template.');
      setCreating(false);
    }
  };

  const deleteNote = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm('Delete this note? This cannot be undone.')) return;
    try {
      await notesApi.remove(id);
      setNotes((prev) => prev.filter((n) => n.id !== id));
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-sm font-medium text-muted-foreground">Loading notes…</div>
      </div>
    );
  }

  return (
    <AppShell userName={profile?.profile?.full_name} userEmail={profile?.user?.email}>
      <div className="space-y-8">
        <PageHeader
          title="Meeting Notes"
          subtitle="Free manual notes and templates. No recording or AI credit needed."
        />

        {error && (
          <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* Quick create */}
        <Card className="p-6">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Start a new note
          </h2>
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="e.g. Monday standup"
              className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <button
              onClick={createBlank}
              disabled={creating}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
            >
              {creating ? 'Creating…' : 'Blank note'}
            </button>
          </div>

          {templates.length > 0 && (
            <div className="mt-5">
              <p className="mb-2 text-xs font-medium text-muted-foreground">Or start from a template:</p>
              <div className="flex flex-wrap gap-2">
                {templates.map((tpl) => (
                  <button
                    key={tpl.id}
                    onClick={() => createFromTemplate(tpl)}
                    disabled={creating}
                    className="rounded-full border border-border bg-card px-3 py-1.5 text-sm text-foreground transition hover:border-primary/40 disabled:opacity-50"
                    title={tpl.description}
                  >
                    {tpl.name}
                    {tpl.tier === 'advanced' && <span className="ml-1 text-xs text-muted-foreground">Pro</span>}
                  </button>
                ))}
              </div>
            </div>
          )}
        </Card>

        {/* Notes list */}
        <div className="space-y-3">
          <h2 className="text-lg font-bold text-foreground">
            Your notes <span className="text-sm font-normal text-muted-foreground">({notes.length})</span>
          </h2>
          {notes.length === 0 ? (
            <Card className="p-8 text-center text-sm text-muted-foreground">
              No notes yet. Create a blank note or pick a template above.
            </Card>
          ) : (
            notes.map((note) => (
              <Link key={note.id} href={`/dashboard/notes/${note.id}`} className="block">
                <Card hover className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate font-semibold text-foreground">{note.title}</h3>
                      <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">
                        {note.content?.slice(0, 120) || note.agenda || 'Empty note'}
                      </p>
                      <div className="mt-1.5 flex items-center gap-3 text-xs text-muted-foreground">
                        <span>{new Date(note.updated_at || note.created_at).toLocaleDateString()}</span>
                        <span className="capitalize">{note.meeting_type || 'note'}</span>
                        {note.manual_summary && <Badge tone="primary">Formatted</Badge>}
                      </div>
                    </div>
                    <button
                      onClick={(e) => deleteNote(note.id, e)}
                      className="rounded-lg px-2 py-1 text-xs font-medium text-destructive transition hover:bg-destructive/10"
                    >
                      Delete
                    </button>
                  </div>
                </Card>
              </Link>
            ))
          )}
        </div>
      </div>
    </AppShell>
  );
}
